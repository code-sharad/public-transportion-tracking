const express = require('express');
const router = express.Router();
const TrackingService = require('../services/trackingService');

// Real-time tracking endpoints
router.get('/vehicles/:routeId', async (req, res) => {
  try {
    const vehicles = await TrackingService.getVehiclesOnRoute(req.params.routeId);
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/vehicle/:vehicleId/position', async (req, res) => {
  try {
    const position = await TrackingService.getVehiclePosition(req.params.vehicleId);
    res.json(position);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 5000 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    
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

module.exports = router;