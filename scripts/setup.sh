#!/bin/bash

# Setup script for Public Transport Tracking System
# Run this to quickly set up the development environment

set -e

echo "🚌 Setting up Public Transport Tracking System..."
echo "=============================================="

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker is not installed. You'll need Docker for the database services."
    echo "   Install Docker from: https://docs.docker.com/get-docker/"
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "⚠️  Docker Compose is not installed."
    echo "   Install Docker Compose from: https://docs.docker.com/compose/install/"
fi

echo "✅ Prerequisites check complete!"
echo ""

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p hardware/esp32_gps_tracker
mkdir -p hardware/simulator
mkdir -p docker/mosquitto/{config,data,log}
mkdir -p docker/nginx/sites
mkdir -p docker/ssl
mkdir -p backend/{models,routes,services,middleware,utils,seeders}
mkdir -p frontend/{components,pages,styles,public}
mkdir -p database
mkdir -p logs

# Create environment files
echo "🔧 Creating environment files..."

# Backend .env
if [ ! -f backend/.env ]; then
cat > backend/.env << EOF
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb://admin:admin123@localhost:27017/public_transport_tracker?authSource=admin

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# CORS
CORS_ORIGIN=http://localhost:3000

# Socket.io
SOCKET_PING_INTERVAL=25000
SOCKET_PING_TIMEOUT=60000

# MQTT
MQTT_HOST=localhost
MQTT_PORT=1883
MQTT_USER=
MQTT_PASSWORD=

# SMS Service (Twilio) - Optional
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF
echo "✅ Created backend/.env"
fi

# Frontend .env.local
if [ ! -f frontend/.env.local ]; then
cat > frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=ws://localhost:5000
NEXT_PUBLIC_MQTT_WS_URL=ws://localhost:9001
NEXT_PUBLIC_MAPBOX_TOKEN=
EOF
echo "✅ Created frontend/.env.local"
fi

# Install dependencies
echo "📦 Installing dependencies..."

# Backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install

# Additional packages for our features
npm install --save mqtt twilio node-cron geolib

# Frontend dependencies
echo "Installing frontend dependencies..."
cd ../frontend
npm install

# Additional packages for PWA and offline support
npm install --save next-pwa idb workbox-webpack-plugin

cd ..

# Create Mosquitto ACL file
echo "🔐 Setting up MQTT broker configuration..."
cat > docker/mosquitto/config/acl.conf << EOF
# Anonymous users can read bus locations
user anonymous
topic read jaipur/bus/+

# Authenticated devices can publish their location
user bus_device
topic write jaipur/bus/+
topic read jaipur/cmd/+

# Admin can read/write everything
user admin
topic readwrite #
EOF

# Set permissions for Mosquitto directories
if command -v docker &> /dev/null; then
    echo "Setting Mosquitto directory permissions..."
    sudo chown -R 1883:1883 docker/mosquitto/data docker/mosquitto/log 2>/dev/null || true
fi

# Install Python dependencies for simulator
echo "🐍 Setting up GPS simulator..."
if command -v python3 &> /dev/null; then
    pip3 install paho-mqtt --user 2>/dev/null || echo "⚠️  Could not install Python MQTT client. Install manually: pip3 install paho-mqtt"
fi

# Create sample data seeder
echo "🌱 Creating sample data seeder..."
cat > backend/seeders/sampleData.js << 'EOF'
const mongoose = require('mongoose');
const Route = require('../models/Route');
const Stop = require('../models/Stop');
const Vehicle = require('../models/Vehicle');

const sampleStops = [
  { code: 'S1', name: 'Ajmeri Gate', nameLocal: 'अजमेरी गेट', location: { coordinates: [75.7873, 26.9124] } },
  { code: 'S2', name: 'Chandpole', nameLocal: 'चांदपोल', location: { coordinates: [75.7891, 26.9098] } },
  { code: 'S3', name: 'MI Road', nameLocal: 'एमआई रोड', location: { coordinates: [75.7925, 26.9056] } },
  { code: 'S4', name: 'Tonk Road', nameLocal: 'टोंक रोड', location: { coordinates: [75.8089, 26.8973] } },
  { code: 'S5', name: 'Gopalpura', nameLocal: 'गोपालपुरा', location: { coordinates: [75.8156, 26.8856] } },
  { code: 'S6', name: 'Sanganer', nameLocal: 'सांगानेर', location: { coordinates: [75.8234, 26.8734] } }
];

async function seedData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Stop.deleteMany({});
    await Route.deleteMany({});
    await Vehicle.deleteMany({});

    // Create stops
    const stops = await Stop.insertMany(sampleStops);
    console.log(`Created ${stops.length} stops`);

    // Create a route
    const route = await Route.create({
      routeNumber: '15A',
      name: 'Ajmeri Gate - Sanganer',
      stops: stops.map(s => s._id),
      path: stops.map(s => ({ type: 'Point', coordinates: s.location.coordinates })),
      isActive: true
    });
    console.log('Created route:', route.routeNumber);

    // Create vehicles
    const vehicles = await Vehicle.insertMany([
      { vehicleId: 'BUS_001', registrationNumber: 'RJ14-1234', currentRoute: route._id },
      { vehicleId: 'BUS_002', registrationNumber: 'RJ14-5678', currentRoute: route._id },
      { vehicleId: 'BUS_003', registrationNumber: 'RJ14-9012', currentRoute: route._id }
    ]);
    console.log(`Created ${vehicles.length} vehicles`);

    console.log('✅ Sample data seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seedData();
EOF

# Start services
echo ""
echo "🚀 Setup complete! To start the application:"
echo ""
echo "1. Start the backend services:"
echo "   docker-compose up -d"
echo ""
echo "2. Seed sample data (optional):"
echo "   cd backend && npm run seed"
echo ""
echo "3. Start the backend server:"
echo "   cd backend && npm run dev"
echo ""
echo "4. Start the frontend (in a new terminal):"
echo "   cd frontend && npm run dev"
echo ""
echo "5. Start the GPS simulator (in a new terminal):"
echo "   cd hardware/simulator && python3 gps_simulator.py"
echo ""
echo "📱 Access the application at: http://localhost:3000"
echo "📡 MQTT broker running at: localhost:1883"
echo "🔌 WebSocket available at: ws://localhost:9001"
echo ""
echo "⚡ Hardware Components to Order:"
echo "   - ESP32 DevKit: https://robu.in/product/esp32-development-board/"
echo "   - NEO-6M GPS: https://robu.in/product/ublox-neo-6m-gps-module/"
echo "   - SIM800L GSM: https://robu.in/product/sim800l-gsm-module/"
echo ""
echo "Happy hacking! 🎉"