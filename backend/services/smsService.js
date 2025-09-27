const twilio = require('twilio');
const redis = require('redis');
const Vehicle = require('../models/Vehicle');
const Stop = require('../models/Stop');
const Route = require('../models/Route');
const { calculateDistance } = require('../utils/geoUtils');

class SMSService {
  constructor() {
    this.twilioClient = null;
    this.redisClient = null;
    this.subscriptions = new Map(); // Store SMS alert subscriptions
    this.commandHandlers = new Map();
    this.initializeCommands();
  }

  async initialize(redisClient) {
    this.redisClient = redisClient;
    
    // Initialize Twilio client if credentials are provided
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      console.log('✅ SMS service initialized with Twilio');
    } else {
      console.log('⚠️  SMS service running in simulation mode (no Twilio credentials)');
    }

    // Load subscriptions from Redis
    await this.loadSubscriptions();
  }

  initializeCommands() {
    // ETA command: "ETA <stop_code> <route_number>"
    this.commandHandlers.set('ETA', this.handleETAQuery.bind(this));
    
    // Subscribe command: "SUB <route_number> <time>"
    this.commandHandlers.set('SUB', this.handleSubscribe.bind(this));
    
    // Unsubscribe command: "UNSUB <route_number>"
    this.commandHandlers.set('UNSUB', this.handleUnsubscribe.bind(this));
    
    // Bus location: "BUS <bus_id>"
    this.commandHandlers.set('BUS', this.handleBusLocation.bind(this));
    
    // Help command: "HELP"
    this.commandHandlers.set('HELP', this.handleHelp.bind(this));
  }

  async handleIncomingSMS(from, body) {
    try {
      const message = body.trim().toUpperCase();
      const parts = message.split(' ');
      const command = parts[0];

      if (this.commandHandlers.has(command)) {
        const response = await this.commandHandlers.get(command)(from, parts.slice(1));
        await this.sendSMS(from, response);
      } else {
        await this.sendSMS(from, 
          "Invalid command. Send HELP for available commands.\n" +
          "उपलब्ध कमांड के लिए HELP भेजें।"
        );
      }
    } catch (error) {
      console.error('Error handling SMS:', error);
      await this.sendSMS(from, "Service temporarily unavailable. Please try again later.");
    }
  }

  async handleETAQuery(from, params) {
    if (params.length < 2) {
      return "Format: ETA <stop_code> <route>\nExample: ETA S12 15A";
    }

    const [stopCode, routeNumber] = params;
    
    try {
      // Find the stop
      const stop = await Stop.findOne({ code: stopCode });
      if (!stop) {
        return `Stop ${stopCode} not found.\nस्टॉप ${stopCode} नहीं मिला।`;
      }

      // Find the route
      const route = await Route.findOne({ routeNumber });
      if (!route) {
        return `Route ${routeNumber} not found.\nरूट ${routeNumber} नहीं मिला।`;
      }

      // Get buses on this route
      const buses = await this.getBusesOnRoute(route._id);
      
      if (buses.length === 0) {
        return `No active buses on route ${routeNumber}.\nरूट ${routeNumber} पर कोई बस नहीं।`;
      }

      // Calculate ETAs for each bus
      const etas = [];
      for (const bus of buses) {
        const eta = await this.calculateETAToStop(bus, stop);
        if (eta) {
          etas.push({
            busId: bus.vehicleId,
            eta: eta.minutes,
            distance: eta.distance
          });
        }
      }

      // Sort by ETA
      etas.sort((a, b) => a.eta - b.eta);

      // Format response
      if (etas.length === 0) {
        return `No buses approaching ${stop.name}.\n${stop.nameLocal} पर कोई बस नहीं आ रही।`;
      }

      let response = `🚌 ${stop.name}\n`;
      etas.slice(0, 3).forEach((bus, index) => {
        response += `${index + 1}. Bus ${bus.busId}: ${bus.eta} min (${bus.distance.toFixed(1)}km)\n`;
      });

      return response;
    } catch (error) {
      console.error('Error in ETA query:', error);
      return "Error fetching bus information. Please try again.";
    }
  }

  async handleSubscribe(from, params) {
    if (params.length < 2) {
      return "Format: SUB <route> <time>\nExample: SUB 15A 08:30";
    }

    const [routeNumber, time] = params;
    
    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      return "Invalid time format. Use HH:MM (24-hour format).";
    }

    // Store subscription
    const subscriptionKey = `sms:sub:${from}:${routeNumber}`;
    await this.redisClient.set(subscriptionKey, JSON.stringify({
      phone: from,
      route: routeNumber,
      time,
      active: true,
      created: new Date().toISOString()
    }), {
      EX: 86400 * 30 // Expire after 30 days
    });

    return `✅ Subscribed to route ${routeNumber} alerts at ${time}.\n` +
           `You'll receive SMS when bus is 10 min away.\n` +
           `Send "UNSUB ${routeNumber}" to cancel.`;
  }

  async handleUnsubscribe(from, params) {
    if (params.length < 1) {
      return "Format: UNSUB <route>\nExample: UNSUB 15A";
    }

    const [routeNumber] = params;
    const subscriptionKey = `sms:sub:${from}:${routeNumber}`;
    
    await this.redisClient.del(subscriptionKey);
    
    return `Unsubscribed from route ${routeNumber} alerts.\nरूट ${routeNumber} अलर्ट से अनसब्सक्राइब किया।`;
  }

  async handleBusLocation(from, params) {
    if (params.length < 1) {
      return "Format: BUS <bus_id>\nExample: BUS 001";
    }

    const [busId] = params;
    const fullBusId = `BUS_${busId.padStart(3, '0')}`;
    
    try {
      // Get current bus location from Redis
      const busDataKey = `bus:jaipur:${fullBusId}:data`;
      const busData = await this.redisClient.get(busDataKey);
      
      if (!busData) {
        return `Bus ${busId} not found or inactive.\nबस ${busId} नहीं मिली या निष्क्रिय है।`;
      }

      const data = JSON.parse(busData);
      const vehicle = await Vehicle.findOne({ vehicleId: fullBusId }).populate('currentRoute');
      
      // Get nearest stop
      const nearestStop = await this.findNearestStop(data.lat, data.lng);
      
      let response = `🚌 Bus ${busId}\n`;
      response += `Speed: ${Math.round(data.spd)} km/h\n`;
      
      if (nearestStop) {
        response += `Near: ${nearestStop.name} (${nearestStop.distance.toFixed(1)}km)\n`;
      }
      
      if (vehicle && vehicle.currentRoute) {
        response += `Route: ${vehicle.currentRoute.routeNumber}\n`;
      }
      
      response += `Updated: ${new Date(data.lastUpdate).toLocaleTimeString('en-IN')}`;
      
      return response;
    } catch (error) {
      console.error('Error fetching bus location:', error);
      return "Error fetching bus information.";
    }
  }

  async handleHelp(from, params) {
    return "🚌 Bus Tracking Commands:\n\n" +
           "ETA <stop> <route> - Get bus arrival times\n" +
           "BUS <id> - Get bus location\n" +
           "SUB <route> <time> - Subscribe to alerts\n" +
           "UNSUB <route> - Cancel alerts\n\n" +
           "Examples:\n" +
           "ETA S12 15A\n" +
           "BUS 001\n" +
           "SUB 15A 08:30";
  }

  async getBusesOnRoute(routeId) {
    const vehicles = await Vehicle.find({ 
      currentRoute: routeId,
      isActive: true
    });

    const buses = [];
    for (const vehicle of vehicles) {
      const busDataKey = `bus:jaipur:${vehicle.vehicleId}:data`;
      const busData = await this.redisClient.get(busDataKey);
      
      if (busData) {
        const data = JSON.parse(busData);
        buses.push({
          ...vehicle.toObject(),
          currentPosition: {
            lat: data.lat,
            lng: data.lng
          },
          currentSpeed: data.spd,
          lastUpdate: data.lastUpdate
        });
      }
    }

    return buses;
  }

  async calculateETAToStop(bus, stop) {
    try {
      const distance = calculateDistance(
        bus.currentPosition.lat,
        bus.currentPosition.lng,
        stop.location.coordinates[1],
        stop.location.coordinates[0]
      );

      // Simple ETA calculation based on current speed
      const avgSpeed = bus.currentSpeed > 10 ? bus.currentSpeed : 20; // km/h
      const etaMinutes = Math.round((distance / avgSpeed) * 60);

      return {
        minutes: etaMinutes,
        distance
      };
    } catch (error) {
      console.error('Error calculating ETA:', error);
      return null;
    }
  }

  async findNearestStop(lat, lng) {
    try {
      const stops = await Stop.find({
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat]
            },
            $maxDistance: 5000 // 5km radius
          }
        }
      }).limit(1);

      if (stops.length > 0) {
        const distance = calculateDistance(lat, lng, 
          stops[0].location.coordinates[1], 
          stops[0].location.coordinates[0]
        );
        
        return {
          ...stops[0].toObject(),
          distance
        };
      }

      return null;
    } catch (error) {
      console.error('Error finding nearest stop:', error);
      return null;
    }
  }

  async sendSMS(to, message) {
    console.log(`📱 SMS to ${to}: ${message}`);
    
    if (this.twilioClient) {
      try {
        const result = await this.twilioClient.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to
        });
        console.log(`SMS sent successfully: ${result.sid}`);
        return result;
      } catch (error) {
        console.error('Error sending SMS:', error);
        throw error;
      }
    } else {
      // Simulation mode
      console.log('SMS simulated (no Twilio configured)');
      return { sid: 'simulated_' + Date.now() };
    }
  }

  async processSubscriptionAlerts() {
    // This method should be called by a cron job every minute
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // Get all subscriptions
    const keys = await this.redisClient.keys('sms:sub:*');
    
    for (const key of keys) {
      const subscription = JSON.parse(await this.redisClient.get(key));
      
      if (subscription.active && subscription.time === currentTime) {
        // Check if bus is approaching
        await this.checkAndSendAlert(subscription);
      }
    }
  }

  async checkAndSendAlert(subscription) {
    try {
      const route = await Route.findOne({ routeNumber: subscription.route });
      if (!route) return;

      const buses = await this.getBusesOnRoute(route._id);
      
      // Find user's typical boarding stop (this would need user preference storage)
      // For now, we'll alert for the first bus on the route
      if (buses.length > 0) {
        const message = `🚌 Alert: Bus on route ${subscription.route} is approaching. ` +
                       `Current location updated at ${new Date().toLocaleTimeString('en-IN')}.`;
        
        await this.sendSMS(subscription.phone, message);
      }
    } catch (error) {
      console.error('Error processing subscription alert:', error);
    }
  }

  async loadSubscriptions() {
    // Load active subscriptions from Redis on startup
    const keys = await this.redisClient.keys('sms:sub:*');
    console.log(`Loaded ${keys.length} SMS subscriptions`);
  }
}

// Create singleton instance
const smsService = new SMSService();

module.exports = smsService;