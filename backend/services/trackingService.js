const Vehicle = require('../models/Vehicle');
const Route = require('../models/Route');
const Stop = require('../models/Stop');
const geolib = require('geolib');

class TrackingService {
  constructor() {
    this.io = null;
    this.redisClient = null;
    this.trackingInterval = 5000; // Update every 5 seconds
    this.activeTracking = new Map();
  }

  initialize(io, redisClient) {
    this.io = io;
    this.redisClient = redisClient;
    console.log('Tracking Service initialized');
  }

  // Update vehicle position and broadcast to clients
  async updateVehiclePosition(vehicleId, position, additionalData = {}) {
    try {
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) {
        throw new Error('Vehicle not found');
      }

      // Update vehicle position in database
      await vehicle.updatePosition(
        position.longitude,
        position.latitude,
        position.speed || 0,
        position.heading || 0
      );

      // Update additional data if provided
      if (additionalData.nextStop) {
        vehicle.nextStop = additionalData.nextStop;
      }
      if (additionalData.estimatedArrival) {
        vehicle.estimatedArrival = additionalData.estimatedArrival;
      }
      if (additionalData.delay !== undefined) {
        vehicle.delay = additionalData.delay;
      }
      if (additionalData.currentOccupancy !== undefined) {
        vehicle.currentOccupancy = additionalData.currentOccupancy;
      }

      await vehicle.save();

      // Cache position in Redis for quick access
      await this.cacheVehiclePosition(vehicleId, {
        ...position,
        ...additionalData,
        timestamp: new Date()
      });

      // Broadcast update to relevant rooms
      this.broadcastVehicleUpdate(vehicle);

      // Check for stop arrivals
      await this.checkStopProximity(vehicle);

      return vehicle;
    } catch (error) {
      console.error('Error updating vehicle position:', error);
      throw error;
    }
  }

  // Cache vehicle position in Redis
  async cacheVehiclePosition(vehicleId, position) {
    const key = `vehicle:${vehicleId}:position`;
    await this.redisClient.setEx(
      key,
      60, // Expire after 60 seconds
      JSON.stringify(position)
    );
  }

  // Get cached vehicle position
  async getCachedVehiclePosition(vehicleId) {
    const key = `vehicle:${vehicleId}:position`;
    const data = await this.redisClient.get(key);
    return data ? JSON.parse(data) : null;
  }

  // Broadcast vehicle update to relevant Socket.io rooms
  broadcastVehicleUpdate(vehicle) {
    const vehicleData = {
      id: vehicle._id,
      vehicleNumber: vehicle.vehicleNumber,
      type: vehicle.type,
      position: {
        latitude: vehicle.currentPosition.coordinates[1],
        longitude: vehicle.currentPosition.coordinates[0]
      },
      speed: vehicle.speed,
      heading: vehicle.heading,
      status: vehicle.status,
      currentRoute: vehicle.currentRoute,
      nextStop: vehicle.nextStop,
      estimatedArrival: vehicle.estimatedArrival,
      delay: vehicle.delay,
      occupancyPercentage: vehicle.occupancyPercentage,
      lastUpdated: vehicle.lastUpdated
    };

    // Broadcast to vehicle-specific room
    this.io.to(`vehicle-${vehicle._id}`).emit('vehicle-update', vehicleData);

    // Broadcast to route-specific room
    if (vehicle.currentRoute) {
      this.io.to(`route-${vehicle.currentRoute}`).emit('vehicle-update', vehicleData);
    }
  }

  // Check if vehicle is near a stop
  async checkStopProximity(vehicle) {
    if (!vehicle.currentRoute) return;

    const route = await Route.findById(vehicle.currentRoute).populate('stops.stop');
    if (!route) return;

    const vehiclePosition = {
      latitude: vehicle.currentPosition.coordinates[1],
      longitude: vehicle.currentPosition.coordinates[0]
    };

    for (const stopData of route.stops) {
      const stop = stopData.stop;
      const stopPosition = {
        latitude: stop.location.coordinates[1],
        longitude: stop.location.coordinates[0]
      };

      const distance = geolib.getDistance(vehiclePosition, stopPosition);

      // If vehicle is within 100 meters of a stop
      if (distance < 100) {
        await this.handleStopArrival(vehicle, stop, distance);
      }
    }
  }

  // Handle vehicle arrival at a stop
  async handleStopArrival(vehicle, stop, distance) {
    const arrivalData = {
      vehicleId: vehicle._id,
      vehicleNumber: vehicle.vehicleNumber,
      stopId: stop._id,
      stopName: stop.name,
      distance: distance,
      timestamp: new Date(),
      delay: vehicle.delay || 0
    };

    // Broadcast to stop-specific room
    this.io.to(`stop-${stop._id}`).emit('vehicle-arrival', arrivalData);

    // Log arrival in Redis for analytics
    await this.logStopArrival(arrivalData);

    // Update vehicle's next stop
    await this.updateNextStop(vehicle);
  }

  // Log stop arrival for analytics
  async logStopArrival(arrivalData) {
    const key = `arrivals:${arrivalData.stopId}:${new Date().toISOString().split('T')[0]}`;
    await this.redisClient.lPush(key, JSON.stringify(arrivalData));
    await this.redisClient.expire(key, 7 * 24 * 60 * 60); // Keep for 7 days
  }

  // Update vehicle's next stop
  async updateNextStop(vehicle) {
    const route = await Route.findById(vehicle.currentRoute).populate('stops.stop');
    if (!route) return;

    const currentStopIndex = route.stops.findIndex(
      s => s.stop._id.toString() === vehicle.nextStop?.toString()
    );

    if (currentStopIndex < route.stops.length - 1) {
      const nextStop = route.stops[currentStopIndex + 1];
      vehicle.nextStop = nextStop.stop._id;
      
      // Calculate ETA for next stop
      const eta = this.calculateETA(vehicle, nextStop);
      vehicle.estimatedArrival = eta;
      
      await vehicle.save();
    } else {
      // End of route
      vehicle.nextStop = null;
      vehicle.estimatedArrival = null;
      await vehicle.save();
    }
  }

  // Calculate ETA for a stop
  calculateETA(vehicle, stopData) {
    const averageSpeed = vehicle.speed || 30; // Default 30 km/h
    const distance = stopData.distance || 2; // Default 2 km
    const timeInMinutes = (distance / averageSpeed) * 60;
    const eta = new Date();
    eta.setMinutes(eta.getMinutes() + Math.round(timeInMinutes));
    return eta;
  }

  // Get all vehicles on a specific route
  async getVehiclesOnRoute(routeId) {
    try {
      const vehicles = await Vehicle.findByRoute(routeId);
      const vehiclesWithPosition = [];

      for (const vehicle of vehicles) {
        const cachedPosition = await this.getCachedVehiclePosition(vehicle._id);
        vehiclesWithPosition.push({
          ...vehicle.toJSON(),
          cachedPosition: cachedPosition
        });
      }

      return vehiclesWithPosition;
    } catch (error) {
      console.error('Error getting vehicles on route:', error);
      throw error;
    }
  }

  // Get vehicle position
  async getVehiclePosition(vehicleId) {
    try {
      // First check cache
      const cached = await this.getCachedVehiclePosition(vehicleId);
      if (cached) {
        return cached;
      }

      // Fallback to database
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) {
        throw new Error('Vehicle not found');
      }

      return {
        latitude: vehicle.currentPosition.coordinates[1],
        longitude: vehicle.currentPosition.coordinates[0],
        speed: vehicle.speed,
        heading: vehicle.heading,
        timestamp: vehicle.lastUpdated
      };
    } catch (error) {
      console.error('Error getting vehicle position:', error);
      throw error;
    }
  }

  // Start tracking a vehicle
  async startTracking(vehicleId) {
    if (this.activeTracking.has(vehicleId)) {
      console.log(`Already tracking vehicle ${vehicleId}`);
      return;
    }

    const interval = setInterval(async () => {
      try {
        const vehicle = await Vehicle.findById(vehicleId);
        if (!vehicle || vehicle.status !== 'active') {
          this.stopTracking(vehicleId);
          return;
        }

        // In production, this would receive real GPS data
        // For now, we'll update the timestamp to show activity
        vehicle.lastUpdated = new Date();
        await vehicle.save();
        this.broadcastVehicleUpdate(vehicle);
      } catch (error) {
        console.error(`Error tracking vehicle ${vehicleId}:`, error);
      }
    }, this.trackingInterval);

    this.activeTracking.set(vehicleId, interval);
    console.log(`Started tracking vehicle ${vehicleId}`);
  }

  // Stop tracking a vehicle
  stopTracking(vehicleId) {
    const interval = this.activeTracking.get(vehicleId);
    if (interval) {
      clearInterval(interval);
      this.activeTracking.delete(vehicleId);
      console.log(`Stopped tracking vehicle ${vehicleId}`);
    }
  }

  // Get nearby vehicles
  async getNearbyVehicles(latitude, longitude, radius = 5000) {
    try {
      const vehicles = await Vehicle.findNearby(longitude, latitude, radius);
      const vehiclesWithDistance = vehicles.map(vehicle => {
        const distance = geolib.getDistance(
          { latitude, longitude },
          {
            latitude: vehicle.currentPosition.coordinates[1],
            longitude: vehicle.currentPosition.coordinates[0]
          }
        );
        return {
          ...vehicle.toJSON(),
          distance
        };
      });

      // Sort by distance
      vehiclesWithDistance.sort((a, b) => a.distance - b.distance);
      return vehiclesWithDistance;
    } catch (error) {
      console.error('Error getting nearby vehicles:', error);
      throw error;
    }
  }

  // Calculate route progress
  async calculateRouteProgress(vehicleId) {
    try {
      const vehicle = await Vehicle.findById(vehicleId).populate('currentRoute');
      if (!vehicle || !vehicle.currentRoute) {
        return null;
      }

      const route = await Route.findById(vehicle.currentRoute._id).populate('stops.stop');
      const currentStopIndex = route.stops.findIndex(
        s => s.stop._id.toString() === vehicle.nextStop?.toString()
      );

      const progress = {
        currentStop: currentStopIndex,
        totalStops: route.stops.length,
        percentage: Math.round((currentStopIndex / route.stops.length) * 100),
        remainingStops: route.stops.length - currentStopIndex,
        estimatedTimeRemaining: this.calculateRemainingTime(route, currentStopIndex)
      };

      return progress;
    } catch (error) {
      console.error('Error calculating route progress:', error);
      throw error;
    }
  }

  // Calculate remaining time for route
  calculateRemainingTime(route, currentStopIndex) {
    let remainingMinutes = 0;
    for (let i = currentStopIndex; i < route.stops.length; i++) {
      remainingMinutes += route.stops[i].duration || 5; // Default 5 minutes per stop
    }
    return remainingMinutes;
  }
}

module.exports = new TrackingService();