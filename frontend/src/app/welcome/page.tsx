'use client';

import { Bus } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function WelcomeScreen() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-8">
      {/* App Logo */}
      <div className="flex items-center justify-center w-24 h-24 mb-8">
        <div className="relative">
          <Bus
            size={64}
            className="text-black"
            strokeWidth={2}
          />
          {/* Orange accent dot */}
          <div
            className="absolute -top-2 -right-2 w-4 h-4 rounded-full"
            style={{ backgroundColor: 'var(--color-accent-primary)' }}
          />
        </div>
      </div>

      {/* App Name */}
      <h1 className="text-3xl font-bold text-center mb-2">
        BusTracker
      </h1>

      {/* Tagline */}
      <p className="text-xl font-medium text-center mb-12 text-black">
        Track Buses in Real-Time
      </p>

      {/* Features List */}
      <div className="w-full max-w-sm space-y-4 mb-12">
        <div className="flex items-start space-x-3">
          <div
            className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
            style={{ backgroundColor: 'var(--color-accent-primary)' }}
          />
          <p className="text-base text-black">
            Real-time bus locations and arrivals
          </p>
        </div>
        <div className="flex items-start space-x-3">
          <div
            className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
            style={{ backgroundColor: 'var(--color-accent-primary)' }}
          />
          <p className="text-base text-black">
            Smart notifications and alerts
          </p>
        </div>
        <div className="flex items-start space-x-3">
          <div
            className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
            style={{ backgroundColor: 'var(--color-accent-primary)' }}
          />
          <p className="text-base text-black">
            Never miss your bus again
          </p>
        </div>
      </div>

      {/* CTA Button */}
      <button
        onClick={handleGetStarted}
        className="btn-primary w-full max-w-sm text-lg"
      >
        Get Started
      </button>

      {/* Version/Legal */}
      <p className="text-sm text-gray-500 text-center mt-8">
        v1.0.0 • Made for smart commuters
      </p>
    </div>
  );
}