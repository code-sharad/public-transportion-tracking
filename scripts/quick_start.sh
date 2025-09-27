#!/bin/bash

# Quick Start Script for Public Transportation Tracking System
# This script adds sample data and starts vehicle simulation

echo "🚌 Public Transportation Tracking - Quick Start"
echo "=============================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Check if containers are running
echo -e "${YELLOW}Checking container status...${NC}"
BACKEND_STATUS=$(docker inspect -f '{{.State.Running}}' transport-backend 2>/dev/null)
if [ "$BACKEND_STATUS" != "true" ]; then
    echo -e "${RED}❌ Backend container is not running. Please run: docker compose up -d${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All containers are running${NC}"

# Function to wait for backend to be ready
wait_for_backend() {
    echo -e "${YELLOW}Waiting for backend to be ready...${NC}"
    for i in {1..30}; do
        if curl -s http://localhost:5000/health > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Backend is ready${NC}"
            return 0
        fi
        sleep 1
    done
    echo -e "${RED}❌ Backend failed to start${NC}"
    return 1
}

wait_for_backend || exit 1

# Add sample routes
echo -e "\n${YELLOW}Adding sample routes...${NC}"

# Route 1: Airport Express
ROUTE1_RESPONSE=$(curl -s -X POST http://localhost:5000/api/routes \
  -H "Content-Type: application/json" \
  -d '{
    "routeNumber": "15A",
    "name": "Airport Express",
    "description": "विमानतळ एक्सप्रेस - Aurangabad Airport to Prozone Mall",
    "type": "bus",
    "status": "active",
    "path": {
      "type": "LineString",
      "coordinates": [
        [75.3985, 19.8617],
        [75.3433, 19.8762],
        [75.3345, 19.8857],
        [75.3240, 19.8956],
        [75.3203, 19.8977]
      ]
    },
    "schedule": [
      {
        "day": "monday",
        "trips": [
          {"tripId": "15A-MON-01", "startTime": "05:30", "endTime": "06:00"},
          {"tripId": "15A-MON-02", "startTime": "05:50", "endTime": "06:20"},
          {"tripId": "15A-MON-03", "startTime": "06:10", "endTime": "06:40"}
        ]
      }
    ],
    "operatingHours": {
      "start": "05:30",
      "end": "23:00"
    },
    "frequency": {
      "peak": 20,
      "offPeak": 30
    },
    "fare": {
      "base": 25,
      "perKm": 3
    },
    "color": "#3498db"
  }')

ROUTE1_ID=$(echo $ROUTE1_RESPONSE | grep -o '"_id":"[^"]*' | cut -d'"' -f4)

if [ -n "$ROUTE1_ID" ]; then
    echo -e "${GREEN}✅ Route 15A added (ID: $ROUTE1_ID)${NC}"
else
    echo -e "${YELLOW}⚠️  Route 15A might already exist or failed to create${NC}"
    echo "DEBUG: ROUTE1_RESPONSE = $ROUTE1_RESPONSE"
    # Try to get existing route
    ROUTE1_ID=$(curl -s http://localhost:5000/api/routes | jq -r '.[] | select(.routeNumber=="15A") | ._id')
fi

# Route 2: City Circular
ROUTE2_RESPONSE=$(curl -s -X POST http://localhost:5000/api/routes \
  -H "Content-Type: application/json" \
  -d '{
    "routeNumber": "10C",
    "name": "City Circular",
    "description": "शहर परिक्रमा - Railway Station to Ellora Caves circular route",
    "type": "bus",
    "status": "active",
    "path": {
      "type": "LineString",
      "coordinates": [
        [75.3433, 19.8762],
        [75.3378, 19.8796],
        [75.3187, 19.9012],
        [75.1791, 20.0266],
        [75.3433, 19.8762]
      ]
    },
    "schedule": [
      {
        "day": "monday",
        "trips": [
          {"tripId": "10C-MON-01", "startTime": "06:00", "endTime": "07:15"},
          {"tripId": "10C-MON-02", "startTime": "06:15", "endTime": "07:30"},
          {"tripId": "10C-MON-03", "startTime": "06:30", "endTime": "07:45"}
        ]
      }
    ],
    "operatingHours": {
      "start": "06:00",
      "end": "21:00"
    },
    "frequency": {
      "peak": 15,
      "offPeak": 20
    },
    "fare": {
      "base": 15,
      "perKm": 2
    },
    "color": "#e74c3c"
  }')

ROUTE2_ID=$(echo $ROUTE2_RESPONSE | grep -o '"_id":"[^"]*' | cut -d'"' -f4)

if [ -n "$ROUTE2_ID" ]; then
    echo -e "${GREEN}✅ Route 10C added (ID: $ROUTE2_ID)${NC}"
else
    echo -e "${YELLOW}⚠️  Route 10C might already exist or failed to create${NC}"
    echo "DEBUG: ROUTE2_RESPONSE = $ROUTE2_RESPONSE"
    ROUTE2_ID=$(curl -s http://localhost:5000/api/routes | jq -r '.[] | select(.routeNumber=="10C") | ._id')
fi

# Add sample vehicles
echo -e "\n${YELLOW}Adding sample vehicles...${NC}"

# Debug: Print route IDs
echo "DEBUG: ROUTE1_ID = $ROUTE1_ID"
echo "DEBUG: ROUTE2_ID = $ROUTE2_ID"

# Only proceed if we have valid route IDs
if [ -z "$ROUTE1_ID" ] || [ -z "$ROUTE2_ID" ]; then
    echo -e "${RED}❌ Route IDs are missing. Cannot create vehicles.${NC}"
    exit 1
fi

# Vehicle 1
VEHICLE1_RESPONSE=$(curl -s -X POST http://localhost:5000/api/vehicles \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": "BUS_001",
    "registrationNumber": "MH20AE1234",
    "type": "bus",
    "capacity": 50,
    "model": "Tata Starbus Urban",
    "year": 2022,
    "features": ["gps", "ac", "wheelchair_accessible", "cctv"],
    "currentRoute": "'$ROUTE1_ID'",
    "status": "active",
    "driver": {
      "name": "Santosh Patil",
      "phone": "+919876543210",
      "licenseNumber": "MH-2019-0123456"
    }
  }')

if echo "$VEHICLE1_RESPONSE" | grep -q "BUS_001"; then
    echo -e "${GREEN}✅ Vehicle BUS_001 added${NC}"
else
    echo -e "${YELLOW}⚠️  Vehicle BUS_001 might already exist${NC}"
fi

# Vehicle 2
VEHICLE2_RESPONSE=$(curl -s -X POST http://localhost:5000/api/vehicles \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": "BUS_002",
    "registrationNumber": "MH20AE5678",
    "type": "bus",
    "capacity": 40,
    "model": "Ashok Leyland Viking",
    "year": 2021,
    "features": ["gps", "non_ac"],
    "currentRoute": "'$ROUTE2_ID'",
    "status": "active",
    "driver": {
      "name": "Anil Jadhav",
      "phone": "+919876543211",
      "licenseNumber": "MH-2018-0123457"
    }
  }')

if echo "$VEHICLE2_RESPONSE" | grep -q "BUS_002"; then
    echo -e "${GREEN}✅ Vehicle BUS_002 added${NC}"
else
    echo -e "${YELLOW}⚠️  Vehicle BUS_002 might already exist${NC}"
fi

# Vehicle 3
VEHICLE3_RESPONSE=$(curl -s -X POST http://localhost:5000/api/vehicles \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": "BUS_003",
    "registrationNumber": "MH20AE9012",
    "type": "minibus",
    "capacity": 25,
    "model": "Force Traveller",
    "year": 2023,
    "features": ["gps", "ac"],
    "currentRoute": "'$ROUTE1_ID'",
    "status": "active",
    "driver": {
      "name": "Rahul Deshmukh",
      "phone": "+919876543212",
      "licenseNumber": "MH-2020-0123458"
    }
  }')

if echo "$VEHICLE3_RESPONSE" | grep -q "BUS_003"; then
    echo -e "${GREEN}✅ Vehicle BUS_003 added${NC}"
else
    echo -e "${YELLOW}⚠️  Vehicle BUS_003 might already exist${NC}"
fi

# Start vehicle simulation
echo -e "\n${YELLOW}Starting vehicle simulation...${NC}"

# Create simulation trigger script
cat > /tmp/start_simulation.js << 'EOF'
const axios = require('axios');

async function startSimulation() {
    try {
        // Start simulation for all vehicles
        const vehicles = ['BUS_001', 'BUS_002', 'BUS_003'];

        for (const vehicleId of vehicles) {
            try {
                await axios.post(`http://localhost:5000/api/tracking/simulate/${vehicleId}`);
                console.log(`✅ Started simulation for ${vehicleId}`);
            } catch (error) {
                console.log(`⚠️  Simulation for ${vehicleId} might already be running`);
            }
        }

        console.log('\n📍 Vehicles are now moving on their routes!');
        console.log('🌐 Open http://localhost:3000 to see live tracking');

    } catch (error) {
        console.error('Error starting simulation:', error.message);
    }
}

startSimulation();
EOF

# Execute simulation script in backend container
docker exec transport-backend node /tmp/start_simulation.js 2>/dev/null || {
    echo -e "${YELLOW}⚠️  Simulation might already be running${NC}"
}

# Display status
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 Quick Start Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "📊 System Status:"
echo "  • Backend API: http://localhost:5000"
echo "  • Frontend App: http://localhost:3000"
echo "  • API Gateway: http://localhost:80"
echo ""
echo "🚌 Sample Data Added:"
echo "  • 2 Routes (15A Airport Express, 10C City Circular - Chhatrapati Sambhajinagar)"
echo "  • 3 Vehicles (BUS_001, BUS_002, BUS_003)"
echo "  • Live GPS simulation is running"
echo ""
echo "🔍 Test the System:"
echo "  1. Open http://localhost:3000 in your browser"
echo "  2. Navigate to 'Live Tracking' to see vehicles moving"
echo "  3. Check 'Routes' to see route information"
echo ""
echo "📡 API Endpoints to Test:"
echo "  • Get all vehicles: curl http://localhost:5000/api/vehicles"
echo "  • Get all routes: curl http://localhost:5000/api/routes"
echo "  • Track BUS_001: curl http://localhost:5000/api/tracking/live/BUS_001"
echo ""
echo "🛠️  For hardware setup guide, see: VEHICLE_TRACKING_GUIDE.md"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop watching logs${NC}"
echo ""

# Watch logs
echo "📜 Showing real-time logs..."
docker logs -f transport-backend --tail 20