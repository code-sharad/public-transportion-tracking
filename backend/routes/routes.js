const express = require('express');
const router = express.Router();
const Route = require('../models/Route');
const Stop = require('../models/Stop');

// Get all routes
router.get('/', async (req, res) => {
  try {
    const { type, status } = req.query;
    const query = {};
    
    if (type) query.type = type;
    if (status) query.status = status;
    
    const routes = await Route.find(query)
      .populate('stops.stop')
      .populate('activeVehicles');
    
    res.json(routes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get route by ID
router.get('/:id', async (req, res) => {
  try {
    const route = await Route.findById(req.params.id)
      .populate('stops.stop')
      .populate('activeVehicles');
    
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    res.json(route);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get routes between two stops
router.get('/between/:fromStopId/:toStopId', async (req, res) => {
  try {
    const { fromStopId, toStopId } = req.params;
    const routes = await Route.findRoutesBetweenStops(fromStopId, toStopId);
    res.json(routes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get next departure for a stop on a route
router.get('/:id/next-departure/:stopId', async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);
    
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    const nextDeparture = route.getNextDeparture(req.params.stopId);
    res.json({ nextDeparture });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Calculate fare between stops
router.get('/:id/fare/:fromStopId/:toStopId', async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);
    
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    const fare = route.calculateFare(req.params.fromStopId, req.params.toStopId);
    
    if (fare === null) {
      return res.status(400).json({ error: 'Invalid stops' });
    }
    
    res.json({ fare });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new route
router.post('/', async (req, res) => {
  try {
    const route = new Route(req.body);
    await route.save();
    res.status(201).json(route);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update route
router.put('/:id', async (req, res) => {
  try {
    const route = await Route.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    res.json(route);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Add stop to route
router.post('/:id/stops', async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);
    
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    route.stops.push(req.body);
    await route.save();
    
    // Update the stop's connected routes
    await Stop.findByIdAndUpdate(
      req.body.stop,
      { $addToSet: { connectedRoutes: route._id } }
    );
    
    res.json(route);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Remove stop from route
router.delete('/:id/stops/:stopId', async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);
    
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    route.stops = route.stops.filter(
      s => s.stop.toString() !== req.params.stopId
    );
    await route.save();
    
    // Update the stop's connected routes
    await Stop.findByIdAndUpdate(
      req.params.stopId,
      { $pull: { connectedRoutes: route._id } }
    );
    
    res.json(route);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update route schedule
router.put('/:id/schedule', async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);
    
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    route.schedule = req.body.schedule;
    await route.save();
    
    res.json(route);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete route
router.delete('/:id', async (req, res) => {
  try {
    const route = await Route.findByIdAndDelete(req.params.id);
    
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    // Remove route from all connected stops
    await Stop.updateMany(
      { connectedRoutes: route._id },
      { $pull: { connectedRoutes: route._id } }
    );
    
    res.json({ message: 'Route deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;