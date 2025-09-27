'use client';

import { useState } from 'react';
import { ArrowLeft, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LoginScreen() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.length !== 10) return;

    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setStep('otp');
    }, 1000);
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;

    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      router.push('/');
    }, 1000);
  };

  const handleContinueAsGuest = () => {
    router.push('/');
  };

  const handleBack = () => {
    if (step === 'otp') {
      setStep('phone');
    } else {
      router.back();
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <button
          onClick={handleBack}
          className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
        >
          <ArrowLeft size={24} className="text-black" />
        </button>
        <h2 className="text-lg font-semibold">
          {step === 'phone' ? 'Welcome!' : 'Verify Phone'}
        </h2>
        <div className="w-10" /> {/* Spacer */}
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 py-8">
        {step === 'phone' ? (
          <>
            {/* Phone Input */}
            <div className="mb-8">
              <div className="flex items-center justify-center w-16 h-16 bg-orange-50 rounded-full mb-6 mx-auto">
                <Phone size={24} style={{ color: 'var(--color-accent-primary)' }} />
              </div>

              <h1 className="text-2xl font-bold text-center mb-2">
                Enter your phone number
              </h1>
              <p className="text-base text-gray-600 text-center mb-8">
                We&apos;ll send you a verification code to get started
              </p>

              <form onSubmit={handlePhoneSubmit} className="space-y-6">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      +91
                    </div>
                    <input
                      id="phone"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="Enter 10-digit number"
                      className="input-field pl-12"
                      maxLength={10}
                      required
                    />
                    {phoneNumber.length === 10 && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: 'var(--color-occupancy-low)' }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={phoneNumber.length !== 10 || loading}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending...' : 'Continue'}
                </button>
              </form>
            </div>
          </>
        ) : (
          <>
            {/* OTP Input */}
            <div className="mb-8">
              <div className="flex items-center justify-center w-16 h-16 bg-orange-50 rounded-full mb-6 mx-auto">
                <Phone size={24} style={{ color: 'var(--color-accent-primary)' }} />
              </div>

              <h1 className="text-2xl font-bold text-center mb-2">
                Enter verification code
              </h1>
              <p className="text-base text-gray-600 text-center mb-8">
                We sent a 6-digit code to +91 {phoneNumber}
              </p>

              <form onSubmit={handleOtpSubmit} className="space-y-6">
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium mb-2">
                    Verification Code
                  </label>
                  <input
                    id="otp"
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    className="input-field text-center text-2xl tracking-widest"
                    maxLength={6}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={otp.length !== 6 || loading}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Verifying...' : 'Verify & Continue'}
                </button>

                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="w-full text-center text-base underline"
                  style={{ color: 'var(--color-accent-primary)' }}
                >
                  Change phone number
                </button>
              </form>
            </div>
          </>
        )}

        {/* Guest Option */}
        {step === 'phone' && (
          <div className="border-t border-gray-100 pt-6">
            <button
              onClick={handleContinueAsGuest}
              className="w-full text-center text-base underline text-black"
            >
              Continue as Guest
            </button>
          </div>
        )}
      </div>
    </div>
  );
}