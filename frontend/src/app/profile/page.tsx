'use client';

import { useState } from 'react';
import MobileBottomNav from '@/components/MobileBottomNav';

export default function ProfileSettings() {
  const [language, setLanguage] = useState<'en' | 'hi' | 'mr'>('en');
  const [notifInApp, setNotifInApp] = useState(true);
  const [notifSMS, setNotifSMS] = useState(false);
  const [notifWhatsApp, setNotifWhatsApp] = useState(false);

  const savedRoutes = [
    { id: 'r1', number: '42', name: 'City Express' },
    { id: 'r2', number: '15', name: 'Mall Connector' },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col pb-20">
      <div className="px-4 py-5 border-b border-gray-100">
        <h1 className="text-2xl font-bold">Profile & Settings</h1>
      </div>

      <div className="flex-1 px-4 py-4 space-y-6">
        {/* User Profile */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Your Profile</h2>
          <div className="card">
            <p className="font-medium">Guest User</p>
            <p className="text-sm text-gray-500">Sign in to sync preferences</p>
          </div>
        </section>

        {/* Language Selection */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Language</h2>
          <div className="grid grid-cols-3 gap-2">
            {[
              { code: 'en', label: 'English' },
              { code: 'hi', label: 'हिन्दी' },
              { code: 'mr', label: 'मराठी' },
            ].map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code as 'en' | 'hi' | 'mr')}
                className={`px-3 py-3 rounded-xl border text-sm font-medium ${language === lang.code
                    ? 'text-white'
                    : 'text-black border-gray-200'
                  }`}
                style={language === lang.code ? { backgroundColor: 'var(--color-accent-primary)' } : {}}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </section>

        {/* Notification Preferences */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Notifications</h2>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 border rounded-xl">
              <span>In-app</span>
              <input type="checkbox" checked={notifInApp} onChange={(e) => setNotifInApp(e.target.checked)} />
            </label>
            <label className="flex items-center justify-between p-3 border rounded-xl">
              <span>SMS</span>
              <input type="checkbox" checked={notifSMS} onChange={(e) => setNotifSMS(e.target.checked)} />
            </label>
            <label className="flex items-center justify-between p-3 border rounded-xl">
              <span>WhatsApp</span>
              <input type="checkbox" checked={notifWhatsApp} onChange={(e) => setNotifWhatsApp(e.target.checked)} />
            </label>
          </div>
        </section>

        {/* Saved Routes */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Saved Routes</h2>
          <div className="space-y-2">
            {savedRoutes.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 border rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg text-white flex items-center justify-center font-bold" style={{ backgroundColor: 'var(--color-accent-primary)' }}>
                    {r.number}
                  </div>
                  <div>
                    <p className="font-medium">{r.name}</p>
                    <p className="text-xs text-gray-500">Route {r.number}</p>
                  </div>
                </div>
                <button className="text-sm font-medium underline" style={{ color: 'var(--color-accent-primary)' }}>Remove</button>
              </div>
            ))}
          </div>
        </section>

        {/* Logout */}
        <section>
          <button className="btn-primary w-full">Log out</button>
        </section>
      </div>

      <MobileBottomNav />
    </div>
  );
}
