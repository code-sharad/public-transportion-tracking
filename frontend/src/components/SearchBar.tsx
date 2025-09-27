import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Route, Stop } from '@/types';

interface SearchBarProps {
  onRouteSelect: (route: Route) => void;
  onStopSelect: (stop: Stop) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onRouteSelect: _onRouteSelect, onStopSelect: _onStopSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search logic here
    console.log('Searching for:', searchQuery);
  };

  return (
    <form onSubmit={handleSearch} className="w-full">
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search routes, stops, or vehicles..."
          className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
      </div>
    </form>
  );
};

export default SearchBar;