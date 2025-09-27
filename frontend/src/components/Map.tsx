'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Vehicle, Route, Stop } from '@/types';

// Fix for default markers in React Leaflet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
});

interface MapProps {
  vehicles: Vehicle[];
  routes: Route[];
  stops: Stop[];
  selectedRoute: Route | null;
  selectedVehicle: Vehicle | null;
  userLocation: [number, number] | null;
  userAccuracy?: number;
  onVehicleSelect: (vehicle: Vehicle) => void;
}

// Component to update map center when user location changes
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

const Map: React.FC<MapProps> = ({
  vehicles,
  routes,
  stops,
  selectedRoute,
  selectedVehicle,
  userLocation,
  userAccuracy,
  onVehicleSelect,
}) => {
  const defaultCenter: [number, number] = userLocation || [28.6139, 77.2090]; // Delhi coordinates

  // Custom icon for vehicles (PRD orange) - with fallback to divIcon if asset missing
  let vehicleIcon: L.Icon | L.DivIcon;
  try {
    vehicleIcon = new L.Icon({
      iconUrl: '/bus-icon.png',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
      className: 'prdbus-icon',
    });
  } catch {
    vehicleIcon = L.divIcon({
      className: 'prdbus-divicon',
      html: '<div style="width:20px;height:20px;background:#FF6F00;border-radius:4px;border:2px solid #fff;box-shadow:0 0 0 1px #FF6F00"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
  }

  // Custom icon for stops (PRD black) - with fallback to divIcon
  let stopIcon: L.Icon | L.DivIcon;
  try {
    stopIcon = new L.Icon({
      iconUrl: '/stop-icon.png',
      iconSize: [24, 24],
      iconAnchor: [12, 24],
      popupAnchor: [0, -24],
      className: 'prdstp-icon',
    });
  } catch {
    stopIcon = L.divIcon({
      className: 'prdstp-divicon',
      html: '<div style="width:10px;height:10px;background:#000;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px #000"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
  }

  // Prevent unused warnings until fuller implementation uses these
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  selectedVehicle && selectedVehicle.id;
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  routes && routes.length;

  return (
    <MapContainer
      center={defaultCenter}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {userLocation && <MapUpdater center={userLocation} />}

      {/* User location marker */}
      {userLocation && (
        <Marker position={userLocation}>
          <Popup>Your Location</Popup>
        </Marker>
      )}

      {/* User accuracy circle */}
      {userLocation && typeof userAccuracy === 'number' && userAccuracy > 0 && (
        <Circle
          center={userLocation}
          radius={userAccuracy}
          pathOptions={{
            color: '#FF6F00',
            weight: 2,
            opacity: 0.6,
            fillColor: '#FF6F00',
            fillOpacity: 0.15,
          }}
        />
      )}

      {/* Vehicle markers */}
      {vehicles.map((vehicle) => (
        <Marker
          key={vehicle.id}
          position={[vehicle.position.latitude, vehicle.position.longitude]}
          icon={vehicleIcon}
          eventHandlers={{
            click: () => onVehicleSelect(vehicle),
          }}
        >
          <Popup>
            <div>
              <strong>{vehicle.vehicleNumber}</strong><br />
              Speed: {vehicle.speed} km/h<br />
              Occupancy: {vehicle.currentOccupancy}/{vehicle.capacity}<br />
              {vehicle.delay && vehicle.delay > 0 && (
                <>Delay: {vehicle.delay} minutes</>
              )}
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Stop markers */}
      {stops.map((stop) => (
        <Marker
          key={stop.id}
          position={[stop.location.coordinates[1], stop.location.coordinates[0]]}
          icon={stopIcon}
        >
          <Popup>
            <div>
              <strong>{stop.name}</strong><br />
              Type: {stop.type}<br />
              Status: {stop.status}
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Route polylines */}
      {selectedRoute && selectedRoute.stops.length > 1 && (
        <Polyline
          positions={selectedRoute.stops.map(s => [
            s.stop.location.coordinates[1],
            s.stop.location.coordinates[0]
          ])}
          color={selectedRoute.color || '#3498db'}
          weight={4}
          opacity={0.7}
        />
      )}
    </MapContainer>
  );
};

export default Map;