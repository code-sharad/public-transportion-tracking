export interface Vehicle {
  id: string;
  vehicleNumber: string;
  type: 'bus' | 'train' | 'metro' | 'tram' | 'ferry';
  capacity: number;
  currentOccupancy: number;
  status: 'active' | 'inactive' | 'maintenance' | 'emergency';
  position: {
    latitude: number;
    longitude: number;
  };
  speed: number;
  heading: number;
  currentRoute: string;
  nextStop?: string;
  estimatedArrival?: Date;
  delay?: number;
  occupancyPercentage?: number;
  lastUpdated: Date;
}

export interface Stop {
  id: string;
  stopId: string;
  name: string;
  type: 'bus_stop' | 'train_station' | 'metro_station' | 'tram_stop' | 'ferry_terminal' | 'interchange';
  location: {
    coordinates: [number, number];
  };
  status: 'operational' | 'closed' | 'maintenance' | 'emergency';
  waitingPassengers?: number;
}

export interface Route {
  id: string;
  routeNumber: string;
  name: string;
  type: 'bus' | 'train' | 'metro' | 'tram' | 'ferry';
  status: 'active' | 'inactive' | 'temporary';
  stops: Array<{
    stop: Stop;
    arrivalTime: string;
    departureTime: string;
    sequence: number;
    distance: number;
    duration: number;
  }>;
  totalDistance: number;
  estimatedDuration: number;
  color: string;
}