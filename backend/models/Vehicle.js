const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  vehicleNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['bus', 'train', 'metro', 'tram', 'ferry'],
    required: true
  },
  capacity: {
    type: Number,
    required: true
  },
  currentOccupancy: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'emergency'],
    default: 'inactive'
  },
  currentRoute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route',
    default: null
  },
  currentPosition: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  },
  heading: {
    type: Number, // Direction in degrees (0-360)
    default: 0
  },
  speed: {
    type: Number, // Speed in km/h
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  driver: {
    name: String,
    id: String,
    contact: String
  },
  features: [{
    type: String,
    enum: ['ac', 'wifi', 'wheelchair_accessible', 'bike_rack', 'luggage_space']
  }],
  registrationDate: {
    type: Date,
    required: true
  },
  lastMaintenanceDate: {
    type: Date
  },
  nextStop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stop'
  },
  estimatedArrival: {
    type: Date
  },
  delay: {
    type: Number, // Delay in minutes
    default: 0
  }
}, {
  timestamps: true
});

// Create geospatial index for location-based queries
vehicleSchema.index({ currentPosition: '2dsphere' });

// Index for quick lookups
vehicleSchema.index({ vehicleNumber: 1 });
vehicleSchema.index({ status: 1 });
vehicleSchema.index({ currentRoute: 1 });

// Virtual for occupancy percentage
vehicleSchema.virtual('occupancyPercentage').get(function() {
  return this.capacity > 0 ? Math.round((this.currentOccupancy / this.capacity) * 100) : 0;
});

// Method to update position
vehicleSchema.methods.updatePosition = function(longitude, latitude, speed = 0, heading = 0) {
  this.currentPosition.coordinates = [longitude, latitude];
  this.speed = speed;
  this.heading = heading;
  this.lastUpdated = new Date();
  return this.save();
};

// Method to update occupancy
vehicleSchema.methods.updateOccupancy = function(count) {
  this.currentOccupancy = Math.max(0, Math.min(count, this.capacity));
  return this.save();
};

// Method to set route
vehicleSchema.methods.setRoute = function(routeId) {
  this.currentRoute = routeId;
  this.status = 'active';
  return this.save();
};

// Static method to find nearby vehicles
vehicleSchema.statics.findNearby = function(longitude, latitude, maxDistance = 5000) {
  return this.find({
    status: 'active',
    currentPosition: {
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

// Static method to find vehicles on route
vehicleSchema.statics.findByRoute = function(routeId) {
  return this.find({ 
    currentRoute: routeId,
    status: 'active'
  }).populate('nextStop');
};

// Ensure JSON output includes virtuals
vehicleSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

module.exports = Vehicle;