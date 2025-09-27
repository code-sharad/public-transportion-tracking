'use client';

import { useState } from 'react';
import { Bell, Clock, Bus, X, AlertTriangle, CheckCircle } from 'lucide-react';
import MobileBottomNav from '@/components/MobileBottomNav';

interface Alert {
  id: string;
  type: 'arrival' | 'delay' | 'route_change' | 'general';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  busNumber?: string;
  route?: string;
  priority: 'high' | 'medium' | 'low';
}

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: '1',
      type: 'arrival',
      title: 'Bus 42 Arriving Soon',
      message: 'Your bus will arrive at Central Station in 3 minutes',
      timestamp: '2 mins ago',
      isRead: false,
      busNumber: '42',
      route: 'City Express',
      priority: 'high'
    },
    {
      id: '2',
      type: 'delay',
      title: 'Route 15 Delayed',
      message: 'Bus 15 is running 8 minutes behind schedule due to traffic',
      timestamp: '15 mins ago',
      isRead: false,
      busNumber: '15',
      route: 'Mall Connector',
      priority: 'medium'
    },
    {
      id: '3',
      type: 'route_change',
      title: 'Route 28 Diverted',
      message: 'Route 28 is temporarily diverted due to road construction',
      timestamp: '1 hour ago',
      isRead: true,
      busNumber: '28',
      route: 'University Link',
      priority: 'medium'
    },
    {
      id: '4',
      type: 'general',
      title: 'Service Update',
      message: 'New bus stops added to Route 42. Check the updated schedule.',
      timestamp: '3 hours ago',
      isRead: true,
      priority: 'low'
    },
  ]);

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'arrival': return Bell;
      case 'delay': return Clock;
      case 'route_change': return AlertTriangle;
      default: return Bus;
    }
  };

  const getAlertColor = (type: string, priority: string) => {
    if (priority === 'high') return 'var(--color-accent-primary)';
    switch (type) {
      case 'arrival': return 'var(--color-occupancy-low)';
      case 'delay': return 'var(--color-occupancy-high)';
      case 'route_change': return 'var(--color-occupancy-medium)';
      default: return '#6B7280';
    }
  };

  const markAsRead = (alertId: string) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId ? { ...alert, isRead: true } : alert
    ));
  };

  const deleteAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const markAllAsRead = () => {
    setAlerts(prev => prev.map(alert => ({ ...alert, isRead: true })));
  };

  const filteredAlerts = filter === 'unread'
    ? alerts.filter(alert => !alert.isRead)
    : alerts;

  const unreadCount = alerts.filter(alert => !alert.isRead).length;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-sm font-medium underline"
              style={{ color: 'var(--color-accent-primary)' }}
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all'
                ? 'bg-white text-black shadow-sm'
                : 'text-gray-600'
              }`}
          >
            All ({alerts.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'unread'
                ? 'bg-white text-black shadow-sm'
                : 'text-gray-600'
              }`}
          >
            Unread ({unreadCount})
          </button>
        </div>
      </div>

      {/* Alerts List */}
      <div className="flex-1 px-4 py-4 pb-20">
        {filteredAlerts.length > 0 ? (
          <div className="space-y-3">
            {filteredAlerts.map((alert) => {
              const Icon = getAlertIcon(alert.type);
              const color = getAlertColor(alert.type, alert.priority);

              return (
                <div
                  key={alert.id}
                  className={`
                    relative p-4 rounded-xl border transition-colors
                    ${alert.isRead
                      ? 'border-gray-100 bg-white'
                      : 'border-orange-200 bg-orange-50'
                    }
                  `}
                >
                  {/* Unread Indicator */}
                  {!alert.isRead && (
                    <div
                      className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full"
                      style={{ backgroundColor: 'var(--color-accent-primary)' }}
                    />
                  )}

                  <div className={`flex items-start space-x-3 ${!alert.isRead ? 'ml-3' : ''}`}>
                    {/* Icon */}
                    <div
                      className="p-2 rounded-lg flex-shrink-0"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      <Icon size={20} style={{ color }} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-base mb-1">
                            {alert.title}
                          </h3>
                          <p className="text-gray-600 text-sm leading-relaxed mb-2">
                            {alert.message}
                          </p>

                          {/* Bus Info */}
                          {alert.busNumber && (
                            <div className="flex items-center space-x-2 mb-2">
                              <div
                                className="px-2 py-1 rounded text-xs font-medium text-white"
                                style={{ backgroundColor: 'var(--color-accent-primary)' }}
                              >
                                Bus {alert.busNumber}
                              </div>
                              {alert.route && (
                                <span className="text-xs text-gray-500">
                                  {alert.route}
                                </span>
                              )}
                            </div>
                          )}

                          <p className="text-xs text-gray-400">
                            {alert.timestamp}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2 ml-2">
                          {!alert.isRead && (
                            <button
                              onClick={() => markAsRead(alert.id)}
                              className="p-1 rounded-full hover:bg-gray-100"
                              title="Mark as read"
                            >
                              <CheckCircle size={16} className="text-gray-400" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteAlert(alert.id)}
                            className="p-1 rounded-full hover:bg-gray-100"
                            title="Delete"
                          >
                            <X size={16} className="text-gray-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell size={24} className="text-gray-400" />
            </div>
            <p className="text-gray-500 mb-2">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
            <p className="text-gray-400 text-sm">
              {filter === 'unread'
                ? 'All caught up! Check back later for updates.'
                : 'You&apos;ll receive notifications about bus arrivals and updates here.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}