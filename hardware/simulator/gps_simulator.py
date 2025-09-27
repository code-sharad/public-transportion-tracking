#!/usr/bin/env python3
"""
GPS Bus Simulator for Testing
Simulates multiple buses following predefined routes with realistic movement
"""

import json
import time
import random
import math
import paho.mqtt.client as mqtt
import threading
from datetime import datetime
from typing import List, Tuple, Dict

class BusSimulator:
    def __init__(self, bus_id: str, route_points: List[Tuple[float, float]], city: str = "jaipur"):
        self.bus_id = bus_id
        self.route_points = route_points
        self.city = city
        self.current_index = 0
        self.current_position = route_points[0]
        self.speed = 30  # km/h
        self.heading = 0
        self.is_running = True
        self.at_stop = False
        self.stop_duration = 0
        
    def calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two points in meters"""
        R = 6371000  # Earth's radius in meters
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)
        
        a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        return R * c
    
    def calculate_heading(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate heading between two points"""
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lon = math.radians(lon2 - lon1)
        
        x = math.sin(delta_lon) * math.cos(lat2_rad)
        y = math.cos(lat1_rad) * math.sin(lat2_rad) - math.sin(lat1_rad) * math.cos(lat2_rad) * math.cos(delta_lon)
        
        heading = math.degrees(math.atan2(x, y))
        return (heading + 360) % 360
    
    def move_towards_next_point(self) -> None:
        """Move bus towards next point on route"""
        if self.at_stop:
            self.stop_duration -= 1
            if self.stop_duration <= 0:
                self.at_stop = False
            return
        
        target_point = self.route_points[self.current_index]
        distance = self.calculate_distance(
            self.current_position[0], self.current_position[1],
            target_point[0], target_point[1]
        )
        
        # Check if we've reached the target point
        if distance < 20:  # Within 20 meters
            self.current_index = (self.current_index + 1) % len(self.route_points)
            
            # Simulate stop at some points (30% chance)
            if random.random() < 0.3:
                self.at_stop = True
                self.stop_duration = random.randint(10, 30)  # 10-30 seconds
            return
        
        # Calculate movement
        self.heading = self.calculate_heading(
            self.current_position[0], self.current_position[1],
            target_point[0], target_point[1]
        )
        
        # Add some randomness to speed (traffic, stops, etc.)
        actual_speed = self.speed * (0.7 + random.random() * 0.6)  # 70% to 130% of base speed
        
        # Calculate distance to move (in meters)
        distance_to_move = (actual_speed * 1000 / 3600)  # meters per second
        
        # Calculate new position
        lat_change = distance_to_move * math.cos(math.radians(self.heading)) / 111111
        lon_change = distance_to_move * math.sin(math.radians(self.heading)) / (111111 * math.cos(math.radians(self.current_position[0])))
        
        self.current_position = (
            self.current_position[0] + lat_change,
            self.current_position[1] + lon_change
        )
    
    def get_gps_data(self) -> Dict:
        """Get current GPS data in the format expected by the system"""
        return {
            "id": self.bus_id,
            "lat": round(self.current_position[0], 6),
            "lng": round(self.current_position[1], 6),
            "spd": 0 if self.at_stop else round(self.speed * (0.7 + random.random() * 0.6), 1),
            "hdg": round(self.heading, 1),
            "ts": int(time.time() * 1000),
            "sat": random.randint(6, 12),  # Simulate satellite count
            "hdop": round(0.8 + random.random() * 0.4, 1)  # Simulate accuracy
        }

class GPSSimulator:
    def __init__(self, mqtt_host: str = "localhost", mqtt_port: int = 1883):
        self.mqtt_host = mqtt_host
        self.mqtt_port = mqtt_port
        self.mqtt_client = mqtt.Client()
        self.buses: List[BusSimulator] = []
        self.running = False
        
        # Setup MQTT callbacks
        self.mqtt_client.on_connect = self.on_connect
        self.mqtt_client.on_disconnect = self.on_disconnect
        
    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            print(f"✅ Connected to MQTT broker at {self.mqtt_host}:{self.mqtt_port}")
        else:
            print(f"❌ Failed to connect to MQTT broker. Return code: {rc}")
    
    def on_disconnect(self, client, userdata, rc):
        print(f"Disconnected from MQTT broker. Return code: {rc}")
    
    def add_bus(self, bus_id: str, route_points: List[Tuple[float, float]], city: str = "jaipur"):
        """Add a bus to the simulation"""
        bus = BusSimulator(bus_id, route_points, city)
        self.buses.append(bus)
        print(f"Added bus {bus_id} with {len(route_points)} route points")
    
    def connect_mqtt(self):
        """Connect to MQTT broker"""
        try:
            self.mqtt_client.connect(self.mqtt_host, self.mqtt_port, 60)
            self.mqtt_client.loop_start()
            time.sleep(1)  # Give it time to connect
            return True
        except Exception as e:
            print(f"Failed to connect to MQTT: {e}")
            return False
    
    def publish_bus_data(self, bus: BusSimulator):
        """Publish GPS data for a single bus"""
        topic = f"{bus.city}/bus/{bus.bus_id}"
        data = bus.get_gps_data()
        payload = json.dumps(data)
        
        result = self.mqtt_client.publish(topic, payload, qos=1)
        if result.rc == 0:
            print(f"📍 {bus.bus_id}: lat={data['lat']}, lng={data['lng']}, spd={data['spd']} km/h")
        else:
            print(f"Failed to publish data for {bus.bus_id}")
    
    def simulation_loop(self):
        """Main simulation loop"""
        while self.running:
            for bus in self.buses:
                bus.move_towards_next_point()
                self.publish_bus_data(bus)
            time.sleep(5)  # Update every 5 seconds
    
    def start(self):
        """Start the simulation"""
        if not self.connect_mqtt():
            print("Cannot start simulation without MQTT connection")
            return
        
        self.running = True
        print(f"🚌 Starting simulation with {len(self.buses)} buses...")
        
        # Run simulation in separate thread
        sim_thread = threading.Thread(target=self.simulation_loop)
        sim_thread.daemon = True
        sim_thread.start()
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n🛑 Stopping simulation...")
            self.stop()
    
    def stop(self):
        """Stop the simulation"""
        self.running = False
        self.mqtt_client.loop_stop()
        self.mqtt_client.disconnect()

# Sample routes for Jaipur
JAIPUR_ROUTES = {
    "route_1": [  # Ajmeri Gate to Sanganer
        (26.9124, 75.7873),  # Ajmeri Gate
        (26.9098, 75.7891),  # Chandpole
        (26.9056, 75.7925),  # MI Road
        (26.8973, 75.8089),  # Tonk Road
        (26.8856, 75.8156),  # Gopalpura
        (26.8734, 75.8234),  # Sanganer
    ],
    "route_2": [  # Raja Park to Vaishali Nagar
        (26.9000, 75.8200),  # Raja Park
        (26.8956, 75.8156),  # Agarwal Farm
        (26.8890, 75.8089),  # Mansarovar
        (26.8823, 75.7956),  # Shipra Path
        (26.8756, 75.7823),  # Vaishali Nagar
    ],
    "route_3": [  # Sindhi Camp to Malviya Nagar
        (26.9234, 75.8012),  # Sindhi Camp
        (26.9156, 75.8089),  # Railway Station
        (26.9089, 75.8156),  # Gopalbari
        (26.8956, 75.8234),  # Jagatpura
        (26.8823, 75.8312),  # Malviya Nagar
    ]
}

def main():
    # Create simulator
    simulator = GPSSimulator(mqtt_host="localhost", mqtt_port=1883)
    
    # Add buses to routes
    bus_counter = 1
    for route_name, route_points in JAIPUR_ROUTES.items():
        # Add 3-4 buses per route
        for i in range(random.randint(3, 4)):
            bus_id = f"BUS_{bus_counter:03d}"
            # Start buses at different points along the route
            rotated_points = route_points[i:] + route_points[:i]
            simulator.add_bus(bus_id, rotated_points)
            bus_counter += 1
    
    # Start simulation
    simulator.start()

if __name__ == "__main__":
    main()