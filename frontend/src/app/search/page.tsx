'use client';

import { useState } from 'react';
import { ArrowLeft, Search, Bus, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import MobileBottomNav from '@/components/MobileBottomNav';

interface RouteResult {
  id: string;
  number: string;
  name: string;
  destination: string;
  eta: string;
  occupancy: 'low' | 'medium' | 'high';
  status: 'active' | 'delayed' | 'offline';
}

export default function SearchRoutesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches] = useState([
    'Route 42',
    'Central Station',
    'City Mall',
    'University',
  ]);

  const router = useRouter();

  // Mock search results
  const searchResults: RouteResult[] = [
    {
      id: '1',
      number: '42',
      name: 'City Express',
      destination: 'Central Station',
      eta: '3 mins',
      occupancy: 'medium',
      status: 'active'
    },
    {
      id: '2',
      number: '15',
      name: 'Mall Connector',
      destination: 'City Mall',
      eta: '7 mins',
      occupancy: 'low',
      status: 'active'
    },
    {
      id: '3',
      number: '28',
      name: 'University Link',
      destination: 'University Gate',
      eta: '12 mins',
      occupancy: 'high',
      status: 'delayed'
    },
  ];

  const filteredResults = searchQuery.length > 0
    ? searchResults.filter(route =>
      route.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      route.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      route.destination.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : [];

  const getOccupancyColor = (level: string) => {
    switch (level) {
      case 'low': return 'var(--color-occupancy-low)';
      case 'high': return 'var(--color-occupancy-high)';
      default: return 'var(--color-occupancy-medium)';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delayed': return '#EF4444';
      case 'offline': return '#6B7280';
      default: return 'var(--color-occupancy-low)';
    }
  };

  const handleRouteSelect = (route: RouteResult) => {
    // Navigate to route details or track this route
    router.push(`/?route=${route.id}`);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center px-4 py-4 border-b border-gray-100">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all mr-2"
        >
          <ArrowLeft size={24} className="text-black" />
        </button>
        <h1 className="text-lg font-semibold">Search Routes</h1>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-4">
        <div className="relative">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            <Search size={20} className="text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search routes, stops, destinations..."
            className="input-field pl-11 pr-4"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pb-20">
        {searchQuery.length === 0 ? (
          <>
            {/* Recent Searches */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3">Recent Searches</h2>
              <div className="space-y-2">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => setSearchQuery(search)}
                    className="w-full text-left p-3 rounded-xl border border-gray-100 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Search size={16} className="text-gray-500" />
                      </div>
                      <span className="text-base">{search}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Popular Routes */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Popular Routes</h2>
              <div className="space-y-3">
                {searchResults.map((route) => (
                  <button
                    key={route.id}
                    onClick={() => handleRouteSelect(route)}
                    className="w-full text-left p-4 rounded-xl border border-gray-100 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: 'var(--color-accent-primary)' }}
                        >
                          <Bus size={20} />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-lg">{route.number}</span>
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: getStatusColor(route.status) }}
                            />
                          </div>
                          <p className="text-gray-600 text-sm">{route.destination}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className="font-semibold"
                          style={{ color: 'var(--color-accent-primary)' }}
                        >
                          {route.eta}
                        </p>
                        <div className="flex items-center justify-end space-x-1 mt-1">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: getOccupancyColor(route.occupancy) }}
                          />
                          <span className="text-xs text-gray-500 capitalize">
                            {route.occupancy}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Search Results */}
            <div>
              <h2 className="text-lg font-semibold mb-3">
                Results for &quot;{searchQuery}&quot;
              </h2>

              {filteredResults.length > 0 ? (
                <div className="space-y-3">
                  {filteredResults.map((route) => (
                    <button
                      key={route.id}
                      onClick={() => handleRouteSelect(route)}
                      className="w-full text-left p-4 rounded-xl border border-gray-100 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: 'var(--color-accent-primary)' }}
                          >
                            {route.number}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold">{route.name}</span>
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: getStatusColor(route.status) }}
                              />
                            </div>
                            <p className="text-gray-600 text-sm">to {route.destination}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-1">
                            <Clock size={14} className="text-gray-400" />
                            <span
                              className="font-semibold"
                              style={{ color: 'var(--color-accent-primary)' }}
                            >
                              {route.eta}
                            </span>
                          </div>
                          <div className="flex items-center justify-end space-x-1 mt-1">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: getOccupancyColor(route.occupancy) }}
                            />
                            <span className="text-xs text-gray-500 capitalize">
                              {route.occupancy}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search size={24} className="text-gray-400" />
                  </div>
                  <p className="text-gray-500">No routes found for &quot;{searchQuery}&quot;</p>
                  <p className="text-gray-400 text-sm mt-1">Try searching for route numbers or destinations</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}