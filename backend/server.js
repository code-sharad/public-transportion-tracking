const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const redis = require('redis');
const dotenv = require('dotenv');
const cron = require('node-cron');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicles');
const routeRoutes = require('./routes/routes');
const stopRoutes = require('./routes/stops');
const trackingRoutes = require('./routes/tracking');

// Import services
const TrackingService = require('./services/trackingService');
const VehicleSimulator = require('./services/vehicleSimulator');
const mqttIngestionService = require('./services/mqttIngestionService');
const smsService = require('./services/smsService');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL) || 25000,
  pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT) || 60000
});

// Initialize Redis client
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// Redis error handling
redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

// Connect to Redis
(async () => {
  try {
    await redisClient.connect();
    console.log('✅ Connected to Redis');
  } catch (err) {
    console.error('Failed to connect to Redis:', err);
  }
})();

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/stops', stopRoutes);
app.use('/api/tracking', trackingRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      redis: redisClient.isReady ? 'connected' : 'disconnected'
    }
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);

  // Join room for specific route tracking
  socket.on('track-route', async (routeId) => {
    socket.join(`route-${routeId}`);
    console.log(`Client ${socket.id} joined route-${routeId}`);
    
    // Send current vehicles on this route
    const vehicles = await TrackingService.getVehiclesOnRoute(routeId);
    socket.emit('route-vehicles', vehicles);
  });

  // Join room for specific vehicle tracking
  socket.on('track-vehicle', async (vehicleId) => {
    socket.join(`vehicle-${vehicleId}`);
    console.log(`Client ${socket.id} joined vehicle-${vehicleId}`);
    
    // Send current vehicle position
    const position = await TrackingService.getVehiclePosition(vehicleId);
    socket.emit('vehicle-position', position);
  });

  // Leave tracking rooms
  socket.on('stop-tracking-route', (routeId) => {
    socket.leave(`route-${routeId}`);
    console.log(`Client ${socket.id} left route-${routeId}`);
  });

  socket.on('stop-tracking-vehicle', (vehicleId) => {
    socket.leave(`vehicle-${vehicleId}`);
    console.log(`Client ${socket.id} left vehicle-${vehicleId}`);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Initialize tracking service with Socket.io
TrackingService.initialize(io, redisClient);

// Initialize MQTT ingestion service
mqttIngestionService.initialize(io, redisClient);

// Initialize SMS service
smsService.initialize(redisClient);

// SMS alert processing (every minute)
cron.schedule('* * * * *', async () => {
  await smsService.processSubscriptionAlerts();
});

// Initialize vehicle simulator in development mode
if (process.env.NODE_ENV === 'development') {
  VehicleSimulator.initialize(io, redisClient);
  
  // Start simulation for all active vehicles
  cron.schedule('*/5 * * * * *', async () => {
    await VehicleSimulator.simulateAllVehicles();
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      status: 404
    }
  });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/public_transport_tracker', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ Connected to MongoDB');
})
.catch((err) => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  
  server.close(() => {
    console.log('HTTP server closed');
  });
  
  await mongoose.connection.close();
  console.log('MongoDB connection closed');
  
  await redisClient.quit();
  console.log('Redis connection closed');
  
  process.exit(0);
});

module.exports = { app, io, redisClient };