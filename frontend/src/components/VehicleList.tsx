import React from 'react';
import { Bus, Users, Clock } from 'lucide-react';
import { Vehicle } from '@/types';

interface VehicleListProps {
  vehicles: Vehicle[];
  onVehicleSelect: (vehicle: Vehicle) => void;
}

const VehicleList: React.FC<VehicleListProps> = ({ vehicles, onVehicleSelect }) => {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">Active Vehicles</h3>
      <div className="space-y-2">
        {vehicles.map((vehicle) => (
          <div
            key={vehicle.id}
            onClick={() => onVehicleSelect(vehicle)}
            className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Bus className="h-5 w-5 text-blue-600 mr-2" />
                <span className="font-medium">{vehicle.vehicleNumber}</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-gray-500">
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  <span>{vehicle.currentOccupancy}/{vehicle.capacity}</span>
                </div>
                {vehicle.delay && vehicle.delay > 0 && (
                  <div className="flex items-center text-red-500">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>+{vehicle.delay}m</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VehicleList;