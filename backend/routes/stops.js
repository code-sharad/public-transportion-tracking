const express = require('express');
const router = express.Router();
const Stop = require('../models/Stop');

// Get all stops
router.get('/', async (req, res) => {
  try {
    const { type, status, search } = req.query;
    const query = {};
    
    if (type) query.type = type;
    if (status) query.status = status;
    
    let stops;
    if (search) {
      stops = await Stop.searchByName(search);
    } else {
      stops = await Stop.find(query).populate('connectedRoutes');
    }
    
    res.json(stops);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get stop by ID
router.get('/:id', async (req, res) => {
  try {
    const stop = await Stop.findById(req.params.id)
      .populate('connectedRoutes');
    
    if (!stop) {
      return res.status(404).json({ error: 'Stop not found' });
    }
    
    res.json(stop);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get nearby stops
router.get('/nearby/:lat/:lng', async (req, res) => {
  try {
    const { lat, lng } = req.params;
    const { radius = 1000 } = req.query;
    
    const stops = await Stop.findNearby(
      parseFloat(lng),
      parseFloat(lat),
      parseInt(radius)
    );
    
    res.json(stops);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get interchange stops
router.get('/type/interchange', async (req, res) => {
  try {
    const stops = await Stop.findInterchanges();
    res.json(stops);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new stop
router.post('/', async (req, res) => {
  try {
    const stop = new Stop(req.body);
    await stop.save();
    res.status(201).json(stop);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update stop
router.put('/:id', async (req, res) => {
  try {
    const stop = await Stop.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!stop) {
      return res.status(404).json({ error: 'Stop not found' });
    }
    
    res.json(stop);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update waiting passengers count
router.post('/:id/passengers', async (req, res) => {
  try {
    const { count } = req.body;
    const stop = await Stop.findById(req.params.id);
    
    if (!stop) {
      return res.status(404).json({ error: 'Stop not found' });
    }
    
    await stop.updateWaitingPassengers(count);
    res.json(stop);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get stop occupancy
router.get('/:id/occupancy', async (req, res) => {
  try {
    const stop = await Stop.findById(req.params.id);
    
    if (!stop) {
      return res.status(404).json({ error: 'Stop not found' });
    }
    
    const occupancy = stop.getCurrentOccupancy();
    res.json({ occupancy });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check if stop is open
router.get('/:id/status', async (req, res) => {
  try {
    const stop = await Stop.findById(req.params.id);
    
    if (!stop) {
      return res.status(404).json({ error: 'Stop not found' });
    }
    
    const isOpen = stop.isOpen();
    res.json({ 
      isOpen,
      status: stop.status,
      operatingHours: stop.operatingHours
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete stop
router.delete('/:id', async (req, res) => {
  try {
    const stop = await Stop.findByIdAndDelete(req.params.id);
    
    if (!stop) {
      return res.status(404).json({ error: 'Stop not found' });
    }
    
    res.json({ message: 'Stop deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;