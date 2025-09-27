const mongoose = require('mongoose');

const trackingHistorySchema = new mongoose.Schema({
  vehicleId: {
    type: String,
    required: true,
    index: true
  },
  city: {
    type: String,
    required: true,
    default: 'jaipur'
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  speed: {
    type: Number,
    min: 0,
    max: 150,
    default: 0
  },
  heading: {
    type: Number,
    min: 0,
    max: 360,
    default: 0
  },
  accuracy: {
    type: Number, // HDOP value
    default: 1.0
  },
  satellites: {
    type: Number,
    min: 0,
    max: 32,
    default: 0
  },
  source: {
    type: String,
    enum: ['gps', 'sms', 'manual'],
    default: 'gps'
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'tracking_history'
});

// Indexes for efficient queries
trackingHistorySchema.index({ location: '2dsphere' });
trackingHistorySchema.index({ vehicleId: 1, timestamp: -1 });
trackingHistorySchema.index({ city: 1, timestamp: -1 });
trackingHistorySchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 }); // Auto-delete after 30 days

// Methods
trackingHistorySchema.statics.getVehicleHistory = async function(vehicleId, startTime, endTime) {
  const query = {
    vehicleId,
    timestamp: {
      $gte: startTime || new Date(Date.now() - 24 * 60 * 60 * 1000), // Default: last 24 hours
      $lte: endTime || new Date()
    }
  };

  return this.find(query)
    .sort({ timestamp: 1 })
    .select('location speed heading accuracy timestamp')
    .lean();
};

trackingHistorySchema.statics.getVehicleTrail = async function(vehicleId, minutes = 30) {
  const startTime = new Date(Date.now() - minutes * 60 * 1000);
  
  return this.find({
    vehicleId,
    timestamp: { $gte: startTime }
  })
    .sort({ timestamp: -1 })
    .limit(100) // Max 100 points for trail
    .select('location.coordinates speed timestamp')
    .lean();
};

// Calculate distance traveled
trackingHistorySchema.statics.calculateDistanceTraveled = async function(vehicleId, startTime, endTime) {
  const points = await this.getVehicleHistory(vehicleId, startTime, endTime);
  
  if (points.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 1; i < points.length; i++) {
    const [lon1, lat1] = points[i - 1].location.coordinates;
    const [lon2, lat2] = points[i].location.coordinates;
    
    // Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    totalDistance += distance;
  }

  return totalDistance;
};

// Get stops (where vehicle was stationary)
trackingHistorySchema.statics.detectStops = async function(vehicleId, startTime, endTime, minDuration = 60) {
  const points = await this.getVehicleHistory(vehicleId, startTime, endTime);
  const stops = [];
  let currentStop = null;

  for (let i = 0; i < points.length; i++) {
    if (points[i].speed < 5) { // Speed less than 5 km/h
      if (!currentStop) {
        currentStop = {
          location: points[i].location,
          startTime: points[i].timestamp,
          endTime: points[i].timestamp
        };
      } else {
        currentStop.endTime = points[i].timestamp;
      }
    } else if (currentStop) {
      const duration = (currentStop.endTime - currentStop.startTime) / 1000; // seconds
      if (duration >= minDuration) {
        currentStop.duration = duration;
        stops.push(currentStop);
      }
      currentStop = null;
    }
  }

  return stops;
};

module.exports = mongoose.model('TrackingHistory', trackingHistorySchema);