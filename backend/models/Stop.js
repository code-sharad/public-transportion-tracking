const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema({
  stopId: {
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
    enum: ['bus_stop', 'train_station', 'metro_station', 'tram_stop', 'ferry_terminal', 'interchange'],
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: {
      type: String,
      default: 'India'
    }
  },
  facilities: [{
    type: String,
    enum: [
      'parking',
      'bike_parking',
      'waiting_room',
      'restroom',
      'ticket_counter',
      'atm',
      'food_court',
      'wifi',
      'wheelchair_accessible',
      'elevator',
      'escalator',
      'cctv',
      'emergency_phone',
      'first_aid'
    ]
  }],
  connectedRoutes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route'
  }],
  platformCount: {
    type: Number,
    default: 1
  },
  platforms: [{
    number: String,
    direction: String,
    routes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route'
    }]
  }],
  status: {
    type: String,
    enum: ['operational', 'closed', 'maintenance', 'emergency'],
    default: 'operational'
  },
  operatingHours: {
    start: {
      type: String, // Format: "HH:MM"
      default: "00:00"
    },
    end: {
      type: String, // Format: "HH:MM"
      default: "23:59"
    }
  },
  zone: {
    type: String,
    default: 'Zone-1'
  },
  images: [{
    url: String,
    caption: String
  }],
  accessibility: {
    wheelchairAccessible: {
      type: Boolean,
      default: false
    },
    audioAnnouncements: {
      type: Boolean,
      default: false
    },
    visualDisplays: {
      type: Boolean,
      default: false
    },
    tactilePaving: {
      type: Boolean,
      default: false
    }
  },
  waitingPassengers: {
    type: Number,
    default: 0
  },
  averageWaitTime: {
    type: Number, // in minutes
    default: 0
  },
  popularTimes: [{
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    hours: [{
      hour: Number, // 0-23
      occupancy: Number // 0-100 percentage
    }]
  }],
  nearbyPlaces: [{
    name: String,
    type: String, // hospital, school, shopping, etc.
    distance: Number // in meters
  }]
}, {
  timestamps: true
});

// Create geospatial index
stopSchema.index({ location: '2dsphere' });

// Create other indexes
stopSchema.index({ stopId: 1 });
stopSchema.index({ name: 'text' });
stopSchema.index({ type: 1 });
stopSchema.index({ status: 1 });
stopSchema.index({ connectedRoutes: 1 });

// Virtual for upcoming arrivals (to be populated from real-time data)
stopSchema.virtual('upcomingArrivals').get(function() {
  // This would be populated from real-time tracking data
  return [];
});

// Method to find nearby stops
stopSchema.statics.findNearby = function(longitude, latitude, maxDistance = 1000) {
  return this.find({
    status: 'operational',
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance
      }
    }
  });
};

// Method to find interchange stops
stopSchema.statics.findInterchanges = function() {
  return this.find({
    type: 'interchange',
    status: 'operational'
  }).populate('connectedRoutes');
};

// Method to check if stop is open
stopSchema.methods.isOpen = function(time = new Date()) {
  const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
  return timeStr >= this.operatingHours.start && timeStr <= this.operatingHours.end;
};

// Method to get current occupancy
stopSchema.methods.getCurrentOccupancy = function(time = new Date()) {
  const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][time.getDay()];
  const hour = time.getHours();
  
  const dayData = this.popularTimes.find(pt => pt.day === dayName);
  if (!dayData) return 0;
  
  const hourData = dayData.hours.find(h => h.hour === hour);
  return hourData ? hourData.occupancy : 0;
};

// Method to add/update waiting passengers count
stopSchema.methods.updateWaitingPassengers = function(count) {
  this.waitingPassengers = Math.max(0, count);
  return this.save();
};

// Static method to search stops by name
stopSchema.statics.searchByName = function(query) {
  return this.find({
    $text: { $search: query },
    status: 'operational'
  }, {
    score: { $meta: 'textScore' }
  }).sort({
    score: { $meta: 'textScore' }
  });
};

// Ensure JSON output includes virtuals
stopSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

const Stop = mongoose.model('Stop', stopSchema);

module.exports = Stop;