const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
  routeNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String
  },
  type: {
    type: String,
    enum: ['bus', 'train', 'metro', 'tram', 'ferry'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'temporary'],
    default: 'active'
  },
  stops: [{
    stop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stop',
      required: true
    },
    arrivalTime: {
      type: String, // Format: "HH:MM"
      required: true
    },
    departureTime: {
      type: String, // Format: "HH:MM"
      required: true
    },
    sequence: {
      type: Number,
      required: true
    },
    distance: {
      type: Number, // Distance from previous stop in km
      default: 0
    },
    duration: {
      type: Number, // Duration from previous stop in minutes
      default: 0
    }
  }],
  path: {
    type: {
      type: String,
      enum: ['LineString'],
      default: 'LineString'
    },
    coordinates: {
      type: [[Number]], // Array of [longitude, latitude] pairs
      default: []
    }
  },
  schedule: [{
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      required: true
    },
    trips: [{
      tripId: String,
      startTime: String, // Format: "HH:MM"
      endTime: String,   // Format: "HH:MM"
      vehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle'
      }
    }]
  }],
  totalDistance: {
    type: Number, // Total route distance in km
    default: 0
  },
  estimatedDuration: {
    type: Number, // Total duration in minutes
    default: 0
  },
  fare: {
    base: {
      type: Number,
      default: 0
    },
    perKm: {
      type: Number,
      default: 0
    },
    zones: [{
      name: String,
      fare: Number,
      stops: [String]
    }]
  },
  operatingHours: {
    start: {
      type: String, // Format: "HH:MM"
      default: "05:00"
    },
    end: {
      type: String, // Format: "HH:MM"
      default: "23:00"
    }
  },
  frequency: {
    peak: {
      type: Number, // Frequency in minutes during peak hours
      default: 15
    },
    offPeak: {
      type: Number, // Frequency in minutes during off-peak hours
      default: 30
    }
  },
  peakHours: [{
    start: String, // Format: "HH:MM"
    end: String    // Format: "HH:MM"
  }],
  color: {
    type: String, // Hex color code for route display
    default: '#3498db'
  }
}, {
  timestamps: true
});

// Create indexes
routeSchema.index({ routeNumber: 1 });
routeSchema.index({ type: 1 });
routeSchema.index({ status: 1 });
routeSchema.index({ 'stops.stop': 1 });
routeSchema.index({ path: '2dsphere' });

// Virtual for active vehicles count
routeSchema.virtual('activeVehicles', {
  ref: 'Vehicle',
  localField: '_id',
  foreignField: 'currentRoute',
  match: { status: 'active' }
});

// Method to get next departure time
routeSchema.methods.getNextDeparture = function(stopId, currentTime = new Date()) {
  const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][currentTime.getDay()];
  const currentTimeStr = `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`;
  
  const todaySchedule = this.schedule.find(s => s.day === dayName);
  if (!todaySchedule) return null;
  
  const stop = this.stops.find(s => s.stop.toString() === stopId.toString());
  if (!stop) return null;
  
  for (const trip of todaySchedule.trips) {
    if (trip.startTime > currentTimeStr) {
      // Calculate departure time for this stop
      const tripStartMinutes = this.timeToMinutes(trip.startTime);
      const stopDepartureMinutes = tripStartMinutes + this.getMinutesToStop(stop.sequence);
      return this.minutesToTime(stopDepartureMinutes);
    }
  }
  
  return null;
};

// Helper method to convert time string to minutes
routeSchema.methods.timeToMinutes = function(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper method to convert minutes to time string
routeSchema.methods.minutesToTime = function(minutes) {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// Helper method to get minutes to a specific stop
routeSchema.methods.getMinutesToStop = function(stopSequence) {
  let totalMinutes = 0;
  for (const stop of this.stops) {
    if (stop.sequence <= stopSequence) {
      totalMinutes += stop.duration;
    }
  }
  return totalMinutes;
};

// Method to calculate fare between two stops
routeSchema.methods.calculateFare = function(fromStopId, toStopId) {
  const fromStop = this.stops.find(s => s.stop.toString() === fromStopId.toString());
  const toStop = this.stops.find(s => s.stop.toString() === toStopId.toString());
  
  if (!fromStop || !toStop) return null;
  
  let distance = 0;
  const startSeq = Math.min(fromStop.sequence, toStop.sequence);
  const endSeq = Math.max(fromStop.sequence, toStop.sequence);
  
  for (const stop of this.stops) {
    if (stop.sequence > startSeq && stop.sequence <= endSeq) {
      distance += stop.distance;
    }
  }
  
  // Calculate fare based on distance
  const fare = this.fare.base + (distance * this.fare.perKm);
  return Math.round(fare * 100) / 100; // Round to 2 decimal places
};

// Static method to find routes between stops
routeSchema.statics.findRoutesBetweenStops = function(fromStopId, toStopId) {
  return this.find({
    status: 'active',
    $and: [
      { 'stops.stop': fromStopId },
      { 'stops.stop': toStopId }
    ]
  }).populate('stops.stop');
};

// Ensure JSON output includes virtuals
routeSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

const Route = mongoose.model('Route', routeSchema);

module.exports = Route;