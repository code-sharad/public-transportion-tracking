'use client';

import MobileBottomNav from '@/components/MobileBottomNav';

export default function Nearby() {
  const nearbyStops = [
    { id: 's1', name: 'Central Station', distance: '200 m' },
    { id: 's2', name: 'City Mall Stop', distance: '450 m' },
    { id: 's3', name: 'University Gate', distance: '800 m' },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col pb-20">
      <div className="px-4 py-5 border-b border-gray-100">
        <h1 className="text-2xl font-bold">Nearby Stops</h1>
      </div>
      <div className="flex-1 px-4 py-4 space-y-3">
        {nearbyStops.map((s) => (
          <div key={s.id} className="flex items-center justify-between p-4 border rounded-xl">
            <div>
              <p className="font-medium">{s.name}</p>
              <p className="text-sm text-gray-500">{s.distance}</p>
            </div>
            <button className="btn-primary">Navigate</button>
          </div>
        ))}
      </div>
      <MobileBottomNav />
    </div>
  );
}
