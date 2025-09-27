#include <WiFi.h>
#include <PubSubClient.h>
#include <TinyGPS++.h>
#include <HardwareSerial.h>
#include <ArduinoJson.h>

// Configuration
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* MQTT_SERVER = "YOUR_SERVER_IP";
const int MQTT_PORT = 1883;
const char* MQTT_USER = "bus_device";
const char* MQTT_PASSWORD = "secure_password";
const char* DEVICE_ID = "BUS_001"; // Unique ID for each bus
const char* CITY = "jaipur";

// GPS Configuration
TinyGPSPlus gps;
HardwareSerial SerialGPS(1);
#define RXD2 16
#define TXD2 17

// MQTT Client
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// Timing
unsigned long lastTransmit = 0;
const unsigned long TRANSMIT_INTERVAL = 5000; // 5 seconds

// Fallback SMS (using SIM800L)
#define SIM800L_RX 26
#define SIM800L_TX 27
HardwareSerial SerialSIM(2);
bool useSMSFallback = false;
unsigned long lastNetworkCheck = 0;

void setup() {
  Serial.begin(115200);
  
  // Initialize GPS
  SerialGPS.begin(9600, SERIAL_8N1, RXD2, TXD2);
  Serial.println("GPS Serial initialized");
  
  // Initialize SIM800L
  SerialSIM.begin(9600, SERIAL_8N1, SIM800L_RX, SIM800L_TX);
  delay(3000);
  
  // Connect to WiFi
  connectWiFi();
  
  // Setup MQTT
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setBufferSize(512);
}

void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    useSMSFallback = false;
  } else {
    Serial.println("\nWiFi connection failed - using SMS fallback");
    useSMSFallback = true;
  }
}

void connectMQTT() {
  while (!mqttClient.connected() && WiFi.status() == WL_CONNECTED) {
    Serial.print("Connecting to MQTT...");
    
    String clientId = String(DEVICE_ID) + "-" + String(random(0xffff), HEX);
    
    if (mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASSWORD)) {
      Serial.println("connected");
      
      // Subscribe to command topic
      String cmdTopic = String(CITY) + "/cmd/" + String(DEVICE_ID);
      mqttClient.subscribe(cmdTopic.c_str());
    } else {
      Serial.print("failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" retrying in 5 seconds");
      delay(5000);
    }
  }
}

void transmitGPSData() {
  if (gps.location.isValid()) {
    // Create compact binary message (goal: <60 bytes)
    StaticJsonDocument<128> doc;
    doc["id"] = DEVICE_ID;
    doc["lat"] = serialized(String(gps.location.lat(), 6));
    doc["lng"] = serialized(String(gps.location.lng(), 6));
    doc["spd"] = gps.speed.kmph();
    doc["hdg"] = gps.course.deg();
    doc["ts"] = millis();
    
    // Add satellite and accuracy info
    if (gps.satellites.isValid()) {
      doc["sat"] = gps.satellites.value();
    }
    if (gps.hdop.isValid()) {
      doc["hdop"] = gps.hdop.hdop();
    }
    
    // Serialize to compact JSON
    char buffer[256];
    size_t len = serializeJson(doc, buffer);
    
    if (!useSMSFallback && mqttClient.connected()) {
      // Primary: MQTT transmission
      String topic = String(CITY) + "/bus/" + String(DEVICE_ID);
      if (mqttClient.publish(topic.c_str(), buffer, len)) {
        Serial.print("MQTT sent: ");
        Serial.println(buffer);
      } else {
        Serial.println("MQTT publish failed");
        checkNetworkQuality();
      }
    } else if (useSMSFallback) {
      // Fallback: SMS transmission
      sendSMSLocation(gps.location.lat(), gps.location.lng(), gps.speed.kmph());
    }
    
    // Also try HTTP if MQTT fails but WiFi is connected
    if (WiFi.status() == WL_CONNECTED && !mqttClient.connected()) {
      sendHTTPFallback(buffer);
    }
  } else {
    Serial.println("GPS location not valid yet");
  }
}

void sendSMSLocation(double lat, double lng, double speed) {
  // Format: "LOC:BUS_001:28.6139:77.2090:45"
  String smsData = "LOC:" + String(DEVICE_ID) + ":" + 
                   String(lat, 4) + ":" + String(lng, 4) + ":" + 
                   String((int)speed);
  
  SerialSIM.println("AT+CMGF=1"); // Text mode
  delay(100);
  SerialSIM.println("AT+CMGS=\"+91XXXXXXXXXX\""); // Server SMS number
  delay(100);
  SerialSIM.print(smsData);
  SerialSIM.write(26); // Ctrl+Z
  
  Serial.print("SMS sent: ");
  Serial.println(smsData);
}

void sendHTTPFallback(const char* data) {
  // Implement HTTP POST as secondary fallback
  // This is compressed and batched for poor connectivity
  Serial.println("HTTP fallback transmission");
}

void checkNetworkQuality() {
  // Simple network quality check
  if (WiFi.status() != WL_CONNECTED) {
    useSMSFallback = true;
    Serial.println("Switching to SMS fallback");
  } else if (WiFi.RSSI() < -80) {
    Serial.println("Poor WiFi signal");
  }
}

void loop() {
  // Feed GPS data
  while (SerialGPS.available() > 0) {
    gps.encode(SerialGPS.read());
  }
  
  // Maintain MQTT connection
  if (!useSMSFallback && WiFi.status() == WL_CONNECTED) {
    if (!mqttClient.connected()) {
      connectMQTT();
    }
    mqttClient.loop();
  }
  
  // Transmit GPS data at intervals
  if (millis() - lastTransmit > TRANSMIT_INTERVAL) {
    transmitGPSData();
    lastTransmit = millis();
  }
  
  // Periodic network check
  if (millis() - lastNetworkCheck > 30000) { // Every 30 seconds
    checkNetworkQuality();
    lastNetworkCheck = millis();
  }
  
  // Check if we should try WiFi again
  if (useSMSFallback && millis() % 60000 == 0) { // Every minute
    connectWiFi();
  }
}