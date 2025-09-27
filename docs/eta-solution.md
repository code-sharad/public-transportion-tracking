# ETA Calculation & Route Information Display Solution

## Overview
This document explains how we solve the core requirement: **"Display estimated arrival times and route information"** for the public transportation tracking system.

## 1. Real-Time ETA Calculation Algorithm

### A. Data Collection Points
```javascript
// Vehicle sends GPS data every 5 seconds
{
  vehicleId: "BUS_001",
  currentPosition: {
    lat: 26.9124,
    lng: 75.7873
  },
  speed: 35, // km/h
  heading: 45, // degrees
  timestamp: "2024-01-17T14:13:25Z",
  routeId: "ROUTE_12",
  nextStopId: "STOP_5",
  occupancy: 65 // percentage
}
```

### B. ETA Calculation Components

#### 1. Distance-Based Calculation
```javascript
// backend/services/etaService.js

calculateBaseETA(vehicle, stop) {
  // Get distance between current position and stop
  const distance = geolib.getDistance(
    vehicle.currentPosition,
    stop.location
  );
  
  // Calculate time based on current speed
  const currentSpeed = vehicle.speed || 20; // km/h default
  const timeInHours = distance / (currentSpeed * 1000);
  const timeInMinutes = timeInHours * 60;
  
  return timeInMinutes;
}
```

#### 2. Historical Data Enhancement
```javascript
// Use MongoDB aggregation for historical patterns
async getHistoricalAverage(routeId, fromStop, toStop, timeOfDay) {
  const historicalData = await Trip.aggregate([
    {
      $match: {
        routeId,
        dayOfWeek: new Date().getDay(),
        hourOfDay: { 
          $gte: timeOfDay - 1, 
          $lte: timeOfDay + 1 
        }
      }
    },
    {
      $group: {
        _id: null,
        avgDuration: { $avg: "$segmentDuration" }
      }
    }
  ]);
  
  return historicalData[0]?.avgDuration || null;
}
```

#### 3. Traffic & Conditions Adjustment
```javascript
// Factor in real-time conditions
adjustETAForConditions(baseETA, route, timeOfDay) {
  let adjustedETA = baseETA;
  
  // Peak hour adjustment (7-9 AM, 5-7 PM)
  if ((timeOfDay >= 7 && timeOfDay <= 9) || 
      (timeOfDay >= 17 && timeOfDay <= 19)) {
    adjustedETA *= 1.3; // 30% increase during peak hours
  }
  
  // Stop density adjustment
  const upcomingStops = route.stops.filter(s => !s.passed);
  const stopDelayMinutes = upcomingStops.length * 0.5; // 30 sec per stop
  adjustedETA += stopDelayMinutes;
  
  // Weather conditions (if available)
  if (weather.condition === 'heavy_rain') {
    adjustedETA *= 1.2; // 20% increase in rain
  }
  
  return Math.round(adjustedETA);
}
```

#### 4. Machine Learning Enhancement (Future)
```javascript
// ML model for more accurate predictions
async predictETAWithML(features) {
  const mlFeatures = {
    currentSpeed: features.speed,
    distanceToStop: features.distance,
    timeOfDay: features.hour,
    dayOfWeek: features.dayOfWeek,
    routeTrafficHistory: features.trafficPattern,
    vehicleOccupancy: features.occupancy,
    weatherCondition: features.weather
  };
  
  // Call to TensorFlow.js model
  const prediction = await etaModel.predict(mlFeatures);
  return prediction;
}
```

## 2. Route Information Display

### A. Data Structure
```javascript
// MongoDB Route Schema
const RouteSchema = {
  routeNumber: "12A",
  name: "City Center - Airport Express",
  type: "bus",
  stops: [
    {
      stopId: "STOP_1",
      name: "City Center",
      arrivalTime: "06:00",
      departureTime: "06:05",
      sequence: 1,
      location: { lat: 26.9124, lng: 75.7873 }
    },
    // ... more stops
  ],
  schedule: {
    weekday: ["06:00", "06:30", "07:00", ...],
    weekend: ["07:00", "08:00", "09:00", ...]
  },
  totalDistance: 25.5, // km
  estimatedDuration: 45, // minutes
  fare: {
    base: 10,
    perKm: 2,
    student: 0.5, // 50% discount
    senior: 0.3  // 70% discount
  }
};
```

### B. Real-Time Route Status
```javascript
// Real-time route information API
app.get('/api/routes/:routeId/status', async (req, res) => {
  const route = await Route.findById(req.params.routeId);
  const vehicles = await Vehicle.find({ currentRoute: route._id });
  
  const routeStatus = {
    route: {
      number: route.routeNumber,
      name: route.name,
      totalStops: route.stops.length,
      totalDistance: route.totalDistance
    },
    vehicles: vehicles.map(v => ({
      vehicleNumber: v.vehicleNumber,
      currentLocation: v.currentPosition,
      nextStop: v.nextStop,
      estimatedArrival: v.estimatedArrival,
      occupancyStatus: getOccupancyStatus(v.currentOccupancy),
      delay: v.delay || 0
    })),
    upcomingStops: getUpcomingStops(route, vehicles)
  };
  
  res.json(routeStatus);
});
```

## 3. User Interface Implementation

### A. Mobile App Display
```jsx
// frontend/components/RouteTracker.jsx
const RouteTracker = ({ routeId }) => {
  const [routeInfo, setRouteInfo] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  
  useEffect(() => {
    // Real-time WebSocket connection
    socket.on(`route-${routeId}-update`, (data) => {
      updateVehiclePositions(data);
      recalculateETAs(data);
    });
  }, [routeId]);
  
  return (
    <div className="route-tracker">
      <RouteHeader info={routeInfo} />
      <LiveMap vehicles={vehicles} stops={routeInfo?.stops} />
      <StopsList 
        stops={routeInfo?.stops}
        vehicles={vehicles}
        onStopClick={showStopDetails}
      />
      <NextArrivalCard vehicle={nearestVehicle} />
    </div>
  );
};
```

### B. ETA Display Component
```jsx
// frontend/components/ETADisplay.jsx
const ETADisplay = ({ stop, vehicles }) => {
  const nextArrivals = vehicles
    .filter(v => v.nextStop === stop.id)
    .sort((a, b) => a.eta - b.eta)
    .slice(0, 3); // Show next 3 arrivals
  
  return (
    <div className="eta-display">
      <h3>{stop.name}</h3>
      {nextArrivals.map(vehicle => (
        <div key={vehicle.id} className="arrival-info">
          <span className="vehicle-number">{vehicle.number}</span>
          <span className="eta">
            {vehicle.eta < 1 ? 'Arriving' : `${vehicle.eta} min`}
          </span>
          <span className="occupancy">
            {getOccupancyIcon(vehicle.occupancy)}
          </span>
        </div>
      ))}
    </div>
  );
};
```

### C. SMS/USSD Interface
```javascript
// For feature phones - SMS query
// User sends: BUS 12A STOP5
// System responds:
async function handleSMSQuery(phoneNumber, message) {
  const [command, routeNumber, stopCode] = message.split(' ');
  
  if (command === 'BUS') {
    const eta = await getNextBusETA(routeNumber, stopCode);
    const smsResponse = 
      `Route ${routeNumber} at ${stopCode}:\n` +
      `Next: ${eta.nextBus} (${eta.time} min)\n` +
      `After: ${eta.secondBus} (${eta.time2} min)`;
    
    await sendSMS(phoneNumber, smsResponse);
  }
}
```

## 4. Performance Optimizations

### A. Caching Strategy
```javascript
// Redis caching for frequently accessed data
const cacheKey = `eta:${routeId}:${stopId}`;
const cachedETA = await redis.get(cacheKey);

if (cachedETA) {
  return JSON.parse(cachedETA);
}

// Calculate and cache for 30 seconds
const eta = await calculateETA(routeId, stopId);
await redis.setex(cacheKey, 30, JSON.stringify(eta));
```

### B. Geospatial Indexing
```javascript
// MongoDB 2dsphere index for efficient location queries
db.stops.createIndex({ location: "2dsphere" });
db.vehicles.createIndex({ currentPosition: "2dsphere" });

// Find nearby vehicles efficiently
const nearbyVehicles = await Vehicle.find({
  currentPosition: {
    $near: {
      $geometry: userLocation,
      $maxDistance: 1000 // 1km radius
    }
  }
});
```

## 5. Accuracy Metrics

### Target Performance:
- **ETA Accuracy**: ±2 minutes for 85% of predictions
- **Update Frequency**: Every 5 seconds
- **Response Time**: <100ms for API calls
- **Offline Support**: Last known data cached for 30 minutes

### Monitoring:
```javascript
// Track prediction accuracy
async function trackETAAccuracy(predictedETA, actualArrival) {
  const accuracy = Math.abs(predictedETA - actualArrival);
  await Analytics.create({
    type: 'eta_accuracy',
    predicted: predictedETA,
    actual: actualArrival,
    accuracy: accuracy,
    timestamp: new Date()
  });
}
```

## 6. Implementation Timeline

1. **Week 1**: Basic distance/speed calculation
2. **Week 2**: Historical data integration
3. **Week 3**: Real-time adjustments
4. **Week 4**: UI implementation
5. **Week 5**: SMS/USSD interface
6. **Week 6**: Testing and optimization

## Conclusion

Our solution provides accurate, real-time ETAs through:
- Multiple data sources (GPS, historical, traffic)
- Smart algorithms with ML potential
- Multi-platform display (app, web, SMS)
- Performance optimization through caching
- Continuous accuracy improvement

This ensures users can reliably plan their journeys with minimal waiting time.