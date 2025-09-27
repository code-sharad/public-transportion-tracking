const Vehicle = require('../models/Vehicle');
const Route = require('../models/Route');
const geolib = require('geolib');
const TrackingService = require('./trackingService');

class VehicleSimulator {
  constructor() {
    this.io = null;
    this.redisClient = null;
    this.simulations = new Map();
  }

  initialize(io, redisClient) {
    this.io = io;
    this.redisClient = redisClient;
    console.log('Vehicle Simulator initialized');
  }

  // Simulate movement for all active vehicles
  async simulateAllVehicles() {
    try {
      const activeVehicles = await Vehicle.find({ status: 'active' }).populate('currentRoute');
      
      for (const vehicle of activeVehicles) {
        if (vehicle.currentRoute) {
          await this.simulateVehicleMovement(vehicle);
        }
      }
    } catch (error) {
      console.error('Error simulating vehicles:', error);
    }
  }

  // Simulate movement for a single vehicle
  async simulateVehicleMovement(vehicle) {
    try {
      const route = await Route.findById(vehicle.currentRoute).populate('stops.stop');
      if (!route || route.stops.length === 0) return;

      // Get or initialize simulation state
      let simState = this.simulations.get(vehicle._id.toString());
      if (!simState) {
        simState = {
          currentStopIndex: 0,
          progress: 0, // Progress between stops (0-1)
          speed: this.getRandomSpeed(vehicle.type),
          lastUpdate: Date.now()
        };
        this.simulations.set(vehicle._id.toString(), simState);
      }

      // Calculate time elapsed since last update
      const now = Date.now();
      const deltaTime = (now - simState.lastUpdate) / 1000; // Convert to seconds
      simState.lastUpdate = now;

      // Get current and next stop
      const currentStopData = route.stops[simState.currentStopIndex];
      const nextStopData = route.stops[simState.currentStopIndex + 1];

      if (!nextStopData) {
        // End of route - restart from beginning
        simState.currentStopIndex = 0;
        simState.progress = 0;
        return;
      }

      const currentStop = currentStopData.stop;
      const nextStop = nextStopData.stop;

      // Calculate positions
      const currentPos = {
        latitude: currentStop.location.coordinates[1],
        longitude: currentStop.location.coordinates[0]
      };
      const nextPos = {
        latitude: nextStop.location.coordinates[1],
        longitude: nextStop.location.coordinates[0]
      };

      // Calculate distance and bearing
      const totalDistance = geolib.getDistance(currentPos, nextPos);
      const bearing = geolib.getGreatCircleBearing(currentPos, nextPos);

      // Update progress based on speed and time
      const speedKmh = simState.speed;
      const speedMs = (speedKmh * 1000) / 3600; // Convert km/h to m/s
      const distanceTraveled = speedMs * deltaTime;
      const progressIncrement = distanceTraveled / totalDistance;

      simState.progress += progressIncrement;

      // Check if vehicle has reached the next stop
      if (simState.progress >= 1) {
        simState.currentStopIndex++;
        simState.progress = 0;
        
        // Add some random wait time at stops
        await this.simulateStopWait(vehicle, nextStop);
      }

      // Interpolate current position
      const interpolatedPos = geolib.getPathLength([currentPos, nextPos]) > 0
        ? geolib.computeDestinationPoint(
            currentPos,
            totalDistance * Math.min(simState.progress, 1),
            bearing
          )
        : currentPos;

      // Add some random variation to make it more realistic
      const variation = this.addPositionVariation(interpolatedPos);

      // Update vehicle position
      await TrackingService.updateVehiclePosition(vehicle._id, {
        latitude: variation.latitude,
        longitude: variation.longitude,
        speed: simState.speed,
        heading: bearing
      }, {
        nextStop: nextStop._id,
        estimatedArrival: this.calculateSimulatedETA(nextStopData, simState),
        currentOccupancy: this.simulateOccupancy(vehicle),
        delay: this.simulateDelay()
      });

      // Store simulation state
      this.simulations.set(vehicle._id.toString(), simState);
    } catch (error) {
      console.error(`Error simulating vehicle ${vehicle._id}:`, error);
    }
  }

  // Get random speed based on vehicle type
  getRandomSpeed(vehicleType) {
    const speedRanges = {
      bus: { min: 20, max: 40 },
      train: { min: 40, max: 80 },
      metro: { min: 30, max: 60 },
      tram: { min: 15, max: 30 },
      ferry: { min: 10, max: 25 }
    };

    const range = speedRanges[vehicleType] || { min: 20, max: 40 };
    return Math.random() * (range.max - range.min) + range.min;
  }

  // Add slight position variation for realism
  addPositionVariation(position) {
    const variation = 0.00001; // Very small variation in degrees
    return {
      latitude: position.latitude + (Math.random() - 0.5) * variation,
      longitude: position.longitude + (Math.random() - 0.5) * variation
    };
  }

  // Simulate stop wait time
  async simulateStopWait(vehicle, stop) {
    // Simulate 30-60 seconds wait at each stop
    const waitTime = Math.random() * 30 + 30;
    
    // Update waiting passengers at stop
    const waitingCount = Math.floor(Math.random() * 20);
    await stop.updateWaitingPassengers(waitingCount);
    
    return new Promise(resolve => setTimeout(resolve, waitTime * 1000));
  }

  // Calculate simulated ETA
  calculateSimulatedETA(nextStopData, simState) {
    const remainingProgress = 1 - simState.progress;
    const timeToStop = (nextStopData.distance * remainingProgress * 1000) / (simState.speed * 1000 / 3600);
    const eta = new Date();
    eta.setSeconds(eta.getSeconds() + timeToStop);
    return eta;
  }

  // Simulate vehicle occupancy
  simulateOccupancy(vehicle) {
    const baseOccupancy = vehicle.currentOccupancy || 0;
    const variation = Math.floor(Math.random() * 10) - 5;
    const newOccupancy = Math.max(0, Math.min(vehicle.capacity, baseOccupancy + variation));
    return newOccupancy;
  }

  // Simulate random delays
  simulateDelay() {
    const hasDelay = Math.random() < 0.3; // 30% chance of delay
    if (hasDelay) {
      return Math.floor(Math.random() * 10); // 0-10 minutes delay
    }
    return 0;
  }

  // Start simulation for a specific vehicle
  async startVehicleSimulation(vehicleId) {
    try {
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) {
        throw new Error('Vehicle not found');
      }

      // Set vehicle to active and assign a route if needed
      if (!vehicle.currentRoute) {
        const routes = await Route.find({ type: vehicle.type, status: 'active' });
        if (routes.length > 0) {
          const randomRoute = routes[Math.floor(Math.random() * routes.length)];
          await vehicle.setRoute(randomRoute._id);
        }
      }

      vehicle.status = 'active';
      await vehicle.save();

      console.log(`Started simulation for vehicle ${vehicleId}`);
    } catch (error) {
      console.error(`Error starting simulation for vehicle ${vehicleId}:`, error);
      throw error;
    }
  }

  // Stop simulation for a specific vehicle
  async stopVehicleSimulation(vehicleId) {
    try {
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) {
        throw new Error('Vehicle not found');
      }

      vehicle.status = 'inactive';
      await vehicle.save();

      // Remove from simulations map
      this.simulations.delete(vehicleId.toString());

      console.log(`Stopped simulation for vehicle ${vehicleId}`);
    } catch (error) {
      console.error(`Error stopping simulation for vehicle ${vehicleId}:`, error);
      throw error;
    }
  }

  // Reset all simulations
  resetSimulations() {
    this.simulations.clear();
    console.log('All simulations reset');
  }

  // Get simulation status
  getSimulationStatus() {
    const status = {
      activeSimulations: this.simulations.size,
      vehicles: []
    };

    for (const [vehicleId, simState] of this.simulations) {
      status.vehicles.push({
        vehicleId,
        currentStopIndex: simState.currentStopIndex,
        progress: simState.progress,
        speed: simState.speed
      });
    }

    return status;
  }
}

module.exports = new VehicleSimulator();