'use client';

import { X, Clock, Users, MapPin, Bell } from 'lucide-react';
import { Vehicle } from '@/types';

interface BusDetailsBottomSheetProps {
  vehicle: Vehicle;
  onClose: () => void;
  onSetAlert: () => void;
}

export default function BusDetailsBottomSheet({
  vehicle,
  onClose,
  onSetAlert
}: BusDetailsBottomSheetProps) {
  // Mock data for demonstration
  const upcomingStops = [
    { name: 'Central Station', eta: '2 mins', distance: '0.8 km' },
    { name: 'City Mall', eta: '5 mins', distance: '2.1 km' },
    { name: 'University Gate', eta: '8 mins', distance: '3.5 km' },
    { name: 'Hospital', eta: '12 mins', distance: '5.2 km' },
  ];

  const getOccupancyColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'low':
        return 'var(--color-occupancy-low)';
      case 'high':
        return 'var(--color-occupancy-high)';
      default:
        return 'var(--color-occupancy-medium)';
    }
  };

  const getOccupancyLevel = () => {
    // Mock occupancy level
    return 'Medium';
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-25 pointer-events-auto"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl pointer-events-auto max-h-[80vh] overflow-hidden">
        {/* Handle Bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold">
              Bus {vehicle.vehicleNumber}
            </h2>
            <p className="text-gray-600 text-sm">
              Route {vehicle.currentRoute || 'N/A'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto pb-6">
          {/* Key Info Cards */}
          <div className="px-6 py-4 space-y-3">
            {/* ETA Card */}
            <div className="flex items-center justify-between p-4 bg-orange-50 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white rounded-lg">
                  <Clock
                    size={20}
                    style={{ color: 'var(--color-accent-primary)' }}
                  />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Next Stop ETA</p>
                  <p
                    className="text-lg font-bold"
                    style={{ color: 'var(--color-accent-primary)' }}
                  >
                    2 mins
                  </p>
                </div>
              </div>
            </div>

            {/* Occupancy Card */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white rounded-lg">
                  <Users
                    size={20}
                    className="text-gray-600"
                  />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Occupancy Level</p>
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getOccupancyColor(getOccupancyLevel()) }}
                    />
                    <p className="text-lg font-semibold">
                      {getOccupancyLevel()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Stops */}
          <div className="px-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <MapPin size={20} className="mr-2" />
              Upcoming Stops
            </h3>

            <div className="space-y-3">
              {upcomingStops.map((stop, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border border-gray-100 rounded-xl"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                      style={{ backgroundColor: index === 0 ? 'var(--color-accent-primary)' : '#9CA3AF' }}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{stop.name}</p>
                      <p className="text-sm text-gray-500">{stop.distance}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${index === 0 ? 'text-orange-600' : 'text-gray-600'
                        }`}
                    >
                      {stop.eta}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Button */}
          <div className="px-6 pt-6">
            <button
              onClick={onSetAlert}
              className="btn-primary w-full flex items-center justify-center space-x-2"
            >
              <Bell size={18} />
              <span>Set Alert for This Bus</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}