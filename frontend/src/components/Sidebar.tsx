import React from 'react';
import { ChevronLeft, ChevronRight, Bus, Train, Navigation } from 'lucide-react';
import { Route } from '@/types';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  selectedRoute: Route | null;
  onRouteSelect: (route: Route | null) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle, selectedRoute: _selectedRoute, onRouteSelect: _onRouteSelect }) => {
  return (
    <div className={`${isOpen ? 'w-64' : 'w-16'} !text-black bg-white shadow-lg transition-all duration-300`}>
      <div className="p-4">
        <button
          onClick={onToggle}
          className="mb-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {isOpen ? <ChevronLeft /> : <ChevronRight />}
        </button>

        {isOpen && (
          <div className='text-black'>
            <h2 className="text-lg font-semibold mb-4">Transport Options</h2>
            <div className="space-y-2">
              <button className="w-full flex items-center p-3 hover:bg-gray-100 rounded-lg">
                <Bus className="mr-3 h-5 w-5" />
                <span>Buses</span>
              </button>
              {/* <button className="w-full flex items-center p-3  hover:bg-gray-100 rounded-lg">
                <Train className="mr-3 h-5 w-5" />
                <span>Trains</span>
              </button> */}
              <button className="w-full flex items-center p-3 hover:bg-gray-100 rounded-lg">
                <Navigation className="mr-3 h-5 w-5" />
                <span>Near Me</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;