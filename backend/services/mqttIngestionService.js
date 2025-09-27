const mqtt = require('mqtt');
const redis = require('redis');
const { Server } = require('socket.io');
const Vehicle = require('../models/Vehicle');
const TrackingHistory = require('../models/TrackingHistory');
const { calculateETA } = require('../utils/etaCalculator');
const { validateGPSData } = require('../utils/validators');

class MQTTIngestionService {
  constructor() {
    this.mqttClient = null;
    this.redisClient = null;
    this.io = null;
    this.isConnected = false;
    this.messageBuffer = [];
    this.bufferFlushInterval = null;
  }

  async initialize(io, redisClient, mqttConfig = {}) {
    this.io = io;
    this.redisClient = redisClient;

    // MQTT Configuration
    const mqttUrl = mqttConfig.url || `mqtt://${process.env.MQTT_HOST || 'localhost'}:${process.env.MQTT_PORT || 1883}`;
    const mqttOptions = {
      clientId: `ingestion_service_${Date.now()}`,
      clean: true,
      connectTimeout: 4000,
      username: process.env.MQTT_USER,
      password: process.env.MQTT_PASSWORD,
      reconnectPeriod: 1000,
      ...mqttConfig.options
    };

    // Connect to MQTT broker
    this.mqttClient = mqtt.connect(mqttUrl, mqttOptions);

    this.mqttClient.on('connect', () => {
      console.log('✅ Connected to MQTT broker');
      this.isConnected = true;
      
      // Subscribe to all bus topics
      this.mqttClient.subscribe('+/bus/+', { qos: 1 }, (err) => {
        if (err) {
          console.error('Failed to subscribe to bus topics:', err);
        } else {
          console.log('📡 Subscribed to bus GPS topics');
        }
      });

      // Subscribe to SMS fallback topic
      this.mqttClient.subscribe('sms/location', { qos: 1 });
    });

    this.mqttClient.on('message', this.handleMessage.bind(this));
    this.mqttClient.on('error', (err) => {
      console.error('MQTT error:', err);
    });

    this.mqttClient.on('disconnect', () => {
      console.log('Disconnected from MQTT broker');
      this.isConnected = false;
    });

    // Start buffer flush interval (batch processing for MongoDB)
    this.bufferFlushInterval = setInterval(() => {
      this.flushMessageBuffer();
    }, 30000); // Flush every 30 seconds
  }

  async handleMessage(topic, message) {
    try {
      const topicParts = topic.split('/');
      
      // Handle SMS fallback messages
      if (topic === 'sms/location') {
        await this.handleSMSLocation(message.toString());
        return;
      }

      // Parse regular MQTT GPS message
      const city = topicParts[0];
      const busId = topicParts[2];
      const data = JSON.parse(message.toString());

      // Validate GPS data
      if (!validateGPSData(data)) {
        console.warn(`Invalid GPS data from ${busId}:`, data);
        return;
      }

      // Process the GPS update
      await this.processGPSUpdate(city, busId, data);

    } catch (error) {
      console.error('Error handling MQTT message:', error);
    }
  }

  async processGPSUpdate(city, busId, data) {
    const timestamp = new Date(data.ts || Date.now());
    
    // Update Redis with current position (for real-time queries)
    const redisKey = `bus:${city}:position`;
    await this.redisClient.geoAdd(redisKey, {
      longitude: data.lng,
      latitude: data.lat,
      member: busId
    });

    // Store additional bus data in Redis
    const busDataKey = `bus:${city}:${busId}:data`;
    await this.redisClient.set(busDataKey, JSON.stringify({
      ...data,
      lastUpdate: timestamp.toISOString()
    }), {
      EX: 300 // Expire after 5 minutes
    });

    // Update vehicle in MongoDB (async, don't wait)
    this.updateVehicleStatus(busId, data, city).catch(console.error);

    // Add to buffer for batch historical data storage
    this.messageBuffer.push({
      vehicleId: busId,
      city,
      location: {
        type: 'Point',
        coordinates: [data.lng, data.lat]
      },
      speed: data.spd,
      heading: data.hdg,
      accuracy: data.hdop,
      satellites: data.sat,
      timestamp
    });

    // Calculate ETA for next stops
    const eta = await this.calculateAndBroadcastETA(busId, data, city);

    // Emit real-time update via Socket.io
    const update = {
      busId,
      city,
      position: { lat: data.lat, lng: data.lng },
      speed: data.spd,
      heading: data.hdg,
      eta,
      timestamp: timestamp.toISOString()
    };

    // Broadcast to all clients tracking this bus
    this.io.to(`vehicle-${busId}`).emit('vehicle-position', update);
    
    // Broadcast to all clients tracking the route
    const vehicle = await Vehicle.findOne({ vehicleId: busId });
    if (vehicle && vehicle.currentRoute) {
      this.io.to(`route-${vehicle.currentRoute}`).emit('vehicle-update', update);
    }
  }

  async handleSMSLocation(message) {
    // Parse SMS format: "LOC:BUS_001:28.6139:77.2090:45"
    const parts = message.split(':');
    if (parts.length !== 5 || parts[0] !== 'LOC') {
      console.warn('Invalid SMS location format:', message);
      return;
    }

    const [, busId, lat, lng, speed] = parts;
    const data = {
      id: busId,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      spd: parseInt(speed),
      hdg: 0, // Unknown from SMS
      ts: Date.now(),
      source: 'sms'
    };

    // Process as regular GPS update
    await this.processGPSUpdate('default', busId, data);
    console.log(`📱 Processed SMS location for ${busId}`);
  }

  async updateVehicleStatus(vehicleId, data, city) {
    try {
      const updateData = {
        currentLocation: {
          type: 'Point',
          coordinates: [data.lng, data.lat]
        },
        currentSpeed: data.spd,
        heading: data.hdg,
        lastUpdate: new Date(),
        isActive: true,
        accuracy: data.hdop,
        satellites: data.sat
      };

      await Vehicle.findOneAndUpdate(
        { vehicleId },
        { $set: updateData },
        { upsert: true, new: true }
      );
    } catch (error) {
      console.error(`Error updating vehicle ${vehicleId}:`, error);
    }
  }

  async calculateAndBroadcastETA(busId, data, city) {
    try {
      // Get vehicle's current route
      const vehicle = await Vehicle.findOne({ vehicleId: busId })
        .populate('currentRoute');

      if (!vehicle || !vehicle.currentRoute) {
        return null;
      }

      // Calculate ETA for upcoming stops
      const eta = await calculateETA(
        vehicle,
        { lat: data.lat, lng: data.lng },
        data.spd
      );

      // Store ETA in Redis for quick access
      const etaKey = `bus:${city}:${busId}:eta`;
      await this.redisClient.set(etaKey, JSON.stringify(eta), {
        EX: 60 // Expire after 1 minute
      });

      return eta;
    } catch (error) {
      console.error(`Error calculating ETA for ${busId}:`, error);
      return null;
    }
  }

  async flushMessageBuffer() {
    if (this.messageBuffer.length === 0) return;

    const messages = [...this.messageBuffer];
    this.messageBuffer = [];

    try {
      // Batch insert tracking history
      await TrackingHistory.insertMany(messages);
      console.log(`📊 Flushed ${messages.length} tracking records to MongoDB`);
    } catch (error) {
      console.error('Error flushing message buffer:', error);
      // Re-add failed messages to buffer
      this.messageBuffer.unshift(...messages);
    }
  }

  async shutdown() {
    console.log('Shutting down MQTT Ingestion Service...');
    
    // Flush remaining messages
    await this.flushMessageBuffer();
    
    // Clear interval
    if (this.bufferFlushInterval) {
      clearInterval(this.bufferFlushInterval);
    }

    // Disconnect MQTT
    if (this.mqttClient) {
      this.mqttClient.end();
    }
  }

  // Utility method to simulate GPS data for testing
  async simulateGPSData(busId, route, city = 'jaipur') {
    let index = 0;
    const interval = setInterval(() => {
      if (!this.isConnected) {
        clearInterval(interval);
        return;
      }

      const point = route[index % route.length];
      const data = {
        id: busId,
        lat: point.lat + (Math.random() - 0.5) * 0.001,
        lng: point.lng + (Math.random() - 0.5) * 0.001,
        spd: 20 + Math.random() * 30,
        hdg: Math.random() * 360,
        ts: Date.now(),
        sat: Math.floor(8 + Math.random() * 4),
        hdop: 0.8 + Math.random() * 0.4
      };

      const topic = `${city}/bus/${busId}`;
      this.mqttClient.publish(topic, JSON.stringify(data), { qos: 1 });
      
      index++;
    }, 5000); // Every 5 seconds

    return interval;
  }
}

// Create singleton instance
const mqttIngestionService = new MQTTIngestionService();

module.exports = mqttIngestionService;