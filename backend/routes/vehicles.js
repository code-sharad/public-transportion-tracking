const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle');
const TrackingService = require('../services/trackingService');
const VehicleSimulator = require('../services/vehicleSimulator');

// Get all vehicles
router.get('/', async (req, res) => {
  try {
    const { type, status, routeId } = req.query;
    const query = {};
    
    if (type) query.type = type;
    if (status) query.status = status;
    if (routeId) query.currentRoute = routeId;
    
    const vehicles = await Vehicle.find(query)
      .populate('currentRoute')
      .populate('nextStop');
    
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get vehicle by ID
router.get('/:id', async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id)
      .populate('currentRoute')
      .populate('nextStop');
    
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    
    // Get cached position if available
    const cachedPosition = await TrackingService.getCachedVehiclePosition(req.params.id);
    
    res.json({
      ...vehicle.toJSON(),
      cachedPosition
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get vehicle position
router.get('/:id/position', async (req, res) => {
  try {
    const position = await TrackingService.getVehiclePosition(req.params.id);
    res.json(position);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get vehicle route progress
router.get('/:id/progress', async (req, res) => {
  try {
    const progress = await TrackingService.calculateRouteProgress(req.params.id);
    if (!progress) {
      return res.status(404).json({ error: 'Vehicle not on active route' });
    }
    res.json(progress);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get nearby vehicles
router.get('/nearby/:lat/:lng', async (req, res) => {
  try {
    const { lat, lng } = req.params;
    const { radius = 5000 } = req.query;
    
    const vehicles = await TrackingService.getNearbyVehicles(
      parseFloat(lat),
      parseFloat(lng),
      parseInt(radius)
    );
    
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new vehicle
router.post('/', async (req, res) => {
  try {
    const vehicle = new Vehicle(req.body);
    await vehicle.save();
    res.status(201).json(vehicle);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update vehicle
router.put('/:id', async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    
    res.json(vehicle);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update vehicle position (for real GPS tracking)
router.post('/:id/position', async (req, res) => {
  try {
    const { latitude, longitude, speed, heading } = req.body;
    
    const vehicle = await TrackingService.updateVehiclePosition(
      req.params.id,
      { latitude, longitude, speed, heading },
      req.body.additionalData || {}
    );
    
    res.json(vehicle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update vehicle occupancy
router.post('/:id/occupancy', async (req, res) => {
  try {
    const { count } = req.body;
    const vehicle = await Vehicle.findById(req.params.id);
    
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    
    await vehicle.updateOccupancy(count);
    res.json(vehicle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign vehicle to route
router.post('/:id/route', async (req, res) => {
  try {
    const { routeId } = req.body;
    const vehicle = await Vehicle.findById(req.params.id);
    
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    
    await vehicle.setRoute(routeId);
    res.json(vehicle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start vehicle tracking
router.post('/:id/track', async (req, res) => {
  try {
    await TrackingService.startTracking(req.params.id);
    res.json({ message: 'Tracking started' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stop vehicle tracking
router.post('/:id/stop-tracking', async (req, res) => {
  try {
    TrackingService.stopTracking(req.params.id);
    res.json({ message: 'Tracking stopped' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Simulation endpoints (development only)
if (process.env.NODE_ENV === 'development') {
  // Start simulation for vehicle
  router.post('/:id/simulate', async (req, res) => {
    try {
      await VehicleSimulator.startVehicleSimulation(req.params.id);
      res.json({ message: 'Simulation started' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Stop simulation for vehicle
  router.post('/:id/stop-simulation', async (req, res) => {
    try {
      await VehicleSimulator.stopVehicleSimulation(req.params.id);
      res.json({ message: 'Simulation stopped' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get simulation status
  router.get('/simulation/status', async (req, res) => {
    try {
      const status = VehicleSimulator.getSimulationStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

// Delete vehicle
router.delete('/:id', async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndDelete(req.params.id);
    
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    
    // Stop tracking if active
    TrackingService.stopTracking(req.params.id);
    
    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;