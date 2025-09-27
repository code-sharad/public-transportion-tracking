# Public Transportation Tracking System - Complete Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [Adding Vehicles to the System](#adding-vehicles-to-the-system)
3. [Hardware Setup Guide](#hardware-setup-guide)
4. [Installation on Bus](#installation-on-bus)
5. [Testing and Verification](#testing-and-verification)
6. [Troubleshooting](#troubleshooting)

---

## System Overview

This system tracks public transportation vehicles in real-time using GPS devices that communicate via MQTT protocol. The tracking data is processed by the backend and displayed on a web interface.

### Architecture
```
[GPS Device on Bus] → [MQTT] → [Backend Server] → [WebSocket] → [Web Interface]
                         ↓
                    [MongoDB/Redis]
```

---

## Adding Vehicles to the System

### Method 1: Using API Endpoints

#### 1. First, add a route (if not exists):
```bash
curl -X POST http://localhost/api/routes \
  -H "Content-Type: application/json" \
  -d '{
    "routeNumber": "15A",
    "name": "Airport to City Center",
    "nameLocal": "एयरपोर्ट से सिटी सेंटर",
    "source": "Jaipur Airport",
    "destination": "City Center",
    "stops": [],
    "schedule": {
      "weekday": {
        "firstBus": "06:00",
        "lastBus": "22:00",
        "frequency": 30
      }
    },
    "fare": {
      "base": 20,
      "perKm": 2
    }
  }'
```

#### 2. Add a new vehicle:
```bash
curl -X POST http://localhost/api/vehicles \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": "BUS_001",
    "registrationNumber": "RJ14CG1234",
    "type": "bus",
    "capacity": 50,
    "model": "Tata Starbus",
    "year": 2022,
    "features": ["gps", "ac", "wheelchair_accessible"],
    "currentRoute": "<route_id_from_step_1>",
    "status": "active"
  }'
```

### Method 2: Using Database Seeder

Create a seeder file to add multiple vehicles:

```javascript
// backend/seeders/addVehicles.js
const mongoose = require('mongoose');
const Vehicle = require('../models/Vehicle');
const Route = require('../models/Route');

async function addVehicles() {
  await mongoose.connect('mongodb://admin:admin123@localhost:27017/public_transport_tracker?authSource=admin');

  const route = await Route.findOne({ routeNumber: '15A' });

  const vehicles = [
    {
      vehicleId: 'BUS_001',
      registrationNumber: 'RJ14CG1234',
      type: 'bus',
      capacity: 50,
      model: 'Tata Starbus',
      year: 2022,
      features: ['gps', 'ac', 'wheelchair_accessible'],
      currentRoute: route._id,
      status: 'active'
    },
    {
      vehicleId: 'BUS_002',
      registrationNumber: 'RJ14CG5678',
      type: 'bus',
      capacity: 40,
      model: 'Ashok Leyland',
      year: 2021,
      features: ['gps', 'non_ac'],
      currentRoute: route._id,
      status: 'active'
    }
  ];

  await Vehicle.insertMany(vehicles);
  console.log('Vehicles added successfully');
  process.exit(0);
}

addVehicles();
```

Run the seeder:
```bash
docker exec transport-backend node seeders/addVehicles.js
```

### Method 3: Using Admin Dashboard (Future)

A web-based admin panel can be created for easy vehicle management.

---

## Hardware Setup Guide

### Required Components

#### Option 1: Raspberry Pi Based Solution (Recommended)
- **Raspberry Pi 4B** (4GB RAM) - ₹4,500
- **GPS Module** (NEO-6M/NEO-8M) - ₹800
- **4G LTE Module** (SIM7600) - ₹3,500
- **Power Supply** (12V to 5V converter) - ₹500
- **Weatherproof Case** - ₹1,000
- **GPS/4G Antenna** - ₹400
- **Cables and Connectors** - ₹300
- **MicroSD Card** (32GB) - ₹500
**Total: ~₹11,500 per bus**

#### Option 2: ESP32 Based Solution (Budget)
- **ESP32 with SIM800L** - ₹1,500
- **GPS Module** (NEO-6M) - ₹800
- **Power Supply** - ₹300
- **Case** - ₹500
- **Antenna** - ₹200
**Total: ~₹3,300 per bus**

#### Option 3: Commercial GPS Tracker (Plug & Play)
- **4G GPS Tracker** (Teltonika FMB920) - ₹8,000
- **Installation Kit** - ₹500
**Total: ~₹8,500 per bus**

### Software Setup for Raspberry Pi

#### 1. Install Raspberry Pi OS:
```bash
# Download Raspberry Pi Imager from https://www.raspberrypi.org/software/
# Flash the OS to SD card
```

#### 2. Enable interfaces:
```bash
sudo raspi-config
# Enable I2C, SPI, and Serial interfaces
```

#### 3. Install required packages:
```bash
sudo apt-get update
sudo apt-get install -y python3-pip git gpsd gpsd-clients python3-gps
sudo pip3 install paho-mqtt gps3 requests
```

#### 4. Create GPS tracking script:
```python
#!/usr/bin/env python3
# /home/pi/bus_tracker.py

import json
import time
import serial
import paho.mqtt.client as mqtt
from gps3 import gps3
import datetime
import subprocess

# Configuration
VEHICLE_ID = "BUS_001"  # Unique for each bus
MQTT_BROKER = "your-server-ip"
MQTT_PORT = 1883
MQTT_TOPIC = f"bus/jaipur/{VEHICLE_ID}/location"
MQTT_USERNAME = "tracker"  # Optional
MQTT_PASSWORD = "secure_password"  # Optional

# GPS Configuration
gps_socket = gps3.GPSDSocket()
data_stream = gps3.DataStream()

# MQTT Client Setup
client = mqtt.Client(client_id=VEHICLE_ID)
if MQTT_USERNAME:
    client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"Connected to MQTT Broker at {MQTT_BROKER}")
    else:
        print(f"Failed to connect, return code {rc}")

def get_system_info():
    """Get additional system information"""
    try:
        # Get CPU temperature
        temp = subprocess.check_output(['vcgencmd', 'measure_temp']).decode()
        temp = float(temp.split('=')[1].split("'")[0])
        
        # Get signal strength (if using 4G modem)
        # This varies based on modem model
        signal = -70  # Placeholder
        
        return {
            "temperature": temp,
            "signal_strength": signal,
            "battery": 100  # If using UPS, get battery level
        }
    except:
        return {}

def main():
    # Connect to MQTT
    client.on_connect = on_connect
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_start()
    
    # Connect to GPS
    gps_socket.connect()
    gps_socket.watch()
    
    print(f"Starting GPS tracking for {VEHICLE_ID}")
    
    last_send = 0
    send_interval = 5  # Send every 5 seconds
    
    for new_data in gps_socket:
        if new_data:
            data_stream.unpack(new_data)
            
            current_time = time.time()
            if current_time - last_send >= send_interval:
                if data_stream.TPV['lat'] != 'n/a':
                    # Prepare GPS data
                    gps_data = {
                        "id": VEHICLE_ID,
                        "lat": float(data_stream.TPV['lat']),
                        "lng": float(data_stream.TPV['lon']),
                        "spd": float(data_stream.TPV['speed']) if data_stream.TPV['speed'] != 'n/a' else 0,
                        "alt": float(data_stream.TPV['alt']) if data_stream.TPV['alt'] != 'n/a' else 0,
                        "hdg": float(data_stream.TPV['track']) if data_stream.TPV['track'] != 'n/a' else 0,
                        "acc": float(data_stream.TPV['epx']) if data_stream.TPV['epx'] != 'n/a' else 10,
                        "ts": datetime.datetime.utcnow().isoformat(),
                        "sats": int(data_stream.SKY['satellites']) if 'satellites' in data_stream.SKY else 0,
                        **get_system_info()
                    }
                    
                    # Publish to MQTT
                    payload = json.dumps(gps_data)
                    result = client.publish(MQTT_TOPIC, payload, qos=1)
                    
                    if result.rc == 0:
                        print(f"Sent: {VEHICLE_ID} - Lat: {gps_data['lat']:.6f}, Lng: {gps_data['lng']:.6f}, Speed: {gps_data['spd']:.1f} km/h")
                    else:
                        print(f"Failed to send data: {result.rc}")
                    
                    last_send = current_time
                else:
                    print("Waiting for GPS fix...")
            
            time.sleep(0.1)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nStopping GPS tracker...")
        client.loop_stop()
        client.disconnect()
    except Exception as e:
        print(f"Error: {e}")
```

#### 5. Create systemd service for auto-start:
```bash
sudo nano /etc/systemd/system/bus-tracker.service
```

Content:
```ini
[Unit]
Description=Bus GPS Tracker
After=network.target gpsd.service
Wants=gpsd.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi
ExecStart=/usr/bin/python3 /home/pi/bus_tracker.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable bus-tracker.service
sudo systemctl start bus-tracker.service
sudo systemctl status bus-tracker.service
```

---

## Installation on Bus

### Physical Installation Steps

#### 1. **Power Connection**
- Connect to bus's 12V/24V system
- Install inline fuse (5A)
- Use voltage converter for stable 5V output
- Add surge protection

#### 2. **GPS Antenna Placement**
- Mount on bus roof (best signal)
- Alternative: Dashboard near windshield
- Use magnetic mount or adhesive
- Run cable through rubber door seal

#### 3. **Device Mounting**
- Install in driver's cabin (accessible but secure)
- Use vibration-dampening mounts
- Ensure proper ventilation
- Keep away from heat sources

#### 4. **4G/LTE Antenna**
- Mount inside cabin near window
- Or external antenna on roof
- Ensure good cellular coverage

### Wiring Diagram
```
Bus Battery (12V/24V)
    |
    ├── [Fuse 5A]
    |
    ├── [DC-DC Converter]
    |       |
    |       └── 5V Output
    |             |
    |             ├── Raspberry Pi
    |             ├── GPS Module
    |             └── 4G Module
    |
    └── [Ground]
```

### Installation Checklist
- [ ] Power connection tested
- [ ] GPS signal strength > 4 satellites
- [ ] 4G signal strength > -85 dBm
- [ ] Device secured against vibration
- [ ] Antennas properly mounted
- [ ] System auto-starts on power
- [ ] Data transmission verified

---

## Testing and Verification

### 1. **Test GPS Reception**
```bash
# On Raspberry Pi
sudo gpsd /dev/ttyAMA0 -F /var/run/gpsd.sock
cgps -s
```

### 2. **Test MQTT Connection**
```bash
# Install mosquitto clients
sudo apt-get install mosquitto-clients

# Subscribe to test
mosquitto_sub -h your-server-ip -p 1883 -t "bus/+/+/location" -v
```

### 3. **Verify Data in System**
```bash
# Check if data is received
curl http://localhost/api/tracking/live/BUS_001
```

### 4. **Monitor from Web Interface**
- Open http://localhost:3000
- Navigate to Live Tracking
- Select your vehicle
- Verify real-time updates

### 5. **Field Testing**
- Drive predetermined route
- Mark checkpoints
- Verify accuracy (should be within 5-10 meters)
- Test in different conditions (tunnel, under bridge, etc.)

---

## Troubleshooting

### Common Issues and Solutions

#### No GPS Signal
- Check antenna connection
- Ensure clear view of sky
- Wait 2-3 minutes for cold start
- Check `cgps` output

#### No Data Transmission
- Verify 4G/network connection
- Check MQTT broker accessibility
- Verify credentials
- Check firewall settings

#### Intermittent Data
- Check power supply stability
- Improve antenna placement
- Check for electromagnetic interference
- Verify network coverage

#### Wrong Location Data
- Calibrate GPS module
- Check for multipath interference
- Ensure proper grounding
- Update GPS firmware

### Debug Commands
```bash
# Check service status
sudo systemctl status bus-tracker

# View logs
sudo journalctl -u bus-tracker -f

# Test GPS
gpsmon

# Test network
ping your-server-ip

# Test MQTT
mosquitto_pub -h your-server-ip -t test -m "hello"
```

---

## Security Considerations

1. **Use MQTT with TLS/SSL**
```python
client.tls_set(ca_certs="/path/to/ca.crt")
```

2. **Implement Authentication**
- Use unique credentials per device
- Rotate passwords regularly
- Use certificate-based auth if possible

3. **Data Encryption**
- Encrypt sensitive data before transmission
- Use VPN for additional security

4. **Physical Security**
- Lock device in secure enclosure
- Use tamper-evident seals
- Log access attempts

---

## Maintenance

### Daily Checks
- Verify data transmission
- Check error logs
- Monitor data accuracy

### Weekly Maintenance
- Clean GPS antenna
- Check cable connections
- Verify mounting security
- Review system logs

### Monthly Tasks
- Update software
- Check storage space
- Test backup systems
- Calibrate if needed

### Annual Service
- Replace cables if worn
- Update firmware
- Full system diagnostic
- Replace backup battery

---

## Cost-Benefit Analysis

### Investment per Bus
- Hardware: ₹11,500
- Installation: ₹2,000
- Annual Maintenance: ₹1,000
- Data Plan (annual): ₹3,600
**Total First Year: ₹18,100**

### Benefits
- Real-time tracking
- Improved passenger satisfaction
- Route optimization
- Fuel savings (10-15%)
- Reduced idle time
- Better schedule adherence
- Emergency response capability

### ROI
- Typical payback period: 8-12 months
- Through fuel savings and efficiency improvements

---

## Contact for Support

For technical support, raise an issue on GitHub or contact the development team.

## License

This guide is part of the Public Transportation Tracking System project.