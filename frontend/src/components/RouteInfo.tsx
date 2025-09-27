import React from 'react';
import { X, MapPin, Clock } from 'lucide-react';
import { Route, Vehicle } from '@/types';

interface RouteInfoProps {
  route: Route;
  vehicles: Vehicle[];
  onVehicleSelect: (vehicle: Vehicle) => void;
  onClose: () => void;
}

const RouteInfo: React.FC<RouteInfoProps> = ({ route, vehicles, onVehicleSelect, onClose }) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">{route.name}</h3>
          <p className="text-sm text-gray-500">Route {route.routeNumber}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center text-sm">
          <MapPin className="h-4 w-4 mr-2 text-gray-400" />
          <span>{route.stops.length} stops</span>
        </div>
        <div className="flex items-center text-sm">
          <Clock className="h-4 w-4 mr-2 text-gray-400" />
          <span>{route.estimatedDuration} minutes</span>
        </div>
      </div>

      {vehicles.length > 0 && (
        <div className="mt-4">
          <h4 className="font-medium mb-2">Active Vehicles</h4>
          <div className="space-y-2">
            {vehicles.map((vehicle) => (
              <button
                key={vehicle.id}
                onClick={() => onVehicleSelect(vehicle)}
                className="w-full text-left p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
              >
                <span className="font-medium">{vehicle.vehicleNumber}</span>
                <span className="ml-2 text-sm text-gray-500">
                  {vehicle.currentOccupancy}/{vehicle.capacity} passengers
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteInfo;