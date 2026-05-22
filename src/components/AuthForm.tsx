"use client";

import React, { useState } from 'react';
import { useAuth, UserRole } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { KeyRound, User, Lock, ArrowRight, ShieldCheck } from 'lucide-react';

interface AuthFormProps {
  role: UserRole;
}

type AuthStep = 'LOGIN' | 'OTP' | 'FORGOT_PASSWORD_OTP' | 'RESET_PASSWORD';

export default function AuthForm({ role }: AuthFormProps) {
  const [step, setStep] = useState<AuthStep>('LOGIN');
  const [aadhar, setAadhar] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    // Mock Validation
    if (aadhar.length === 12 && password === 'password123') {
      setStep('OTP');
    } else {
      setError('Invalid Aadhar number or password. (Hint: use password123)');
    }
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (otp === '123456') {
      login(role, aadhar);
      router.push(`/${role}`);
    } else {
      setError('Invalid OTP. (Hint: use 123456)');
    }
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    if (aadhar.length !== 12) {
      setError('Please enter a valid 12-digit Aadhar number first.');
      return;
    }
    setError('');
    setStep('FORGOT_PASSWORD_OTP');
  };

  const handleResetOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (otp === '123456') {
      setStep('RESET_PASSWORD');
      setOtp('');
    } else {
      setError('Invalid OTP. (Hint: use 123456)');
    }
  };

  const handleNewPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate password reset success
    setStep('LOGIN');
    setPassword('');
    setError('Password reset successfully. Please login.');
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-white/80 backdrop-blur-xl shadow-2xl rounded-3xl border border-gray-100">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 text-blue-600 mb-4">
          <ShieldCheck size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 capitalize">{role} Portal</h2>
        <p className="text-gray-500 mt-2 text-sm">
          Secure access to longitudinal patient records.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium border border-red-100 flex items-start gap-3">
          <span className="mt-0.5">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {step === 'LOGIN' && (
        <form onSubmit={handleLoginSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Aadhar Number</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                maxLength={12}
                value={aadhar}
                onChange={(e) => setAadhar(e.target.value.replace(/\D/g, ''))}
                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="12-digit Aadhar ID"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={18} className="text-gray-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <button type="button" onClick={handleForgotPassword} className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors">
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            <span>Proceed Securely</span>
            <ArrowRight size={18} />
          </button>
        </form>
      )}

      {step === 'OTP' && (
        <form onSubmit={handleOtpSubmit} className="space-y-5">
          <div className="text-center mb-6">
            <p className="text-sm text-gray-600">Enter the 6-digit OTP sent to the mobile number registered with your Aadhar.</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">One-Time Password (OTP)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <KeyRound size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-center tracking-[0.5em] text-lg font-bold transition-all"
                placeholder="------"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            Verify & Login
          </button>
          <button type="button" onClick={() => setStep('LOGIN')} className="w-full text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors mt-4">
            Cancel
          </button>
        </form>
      )}

      {step === 'FORGOT_PASSWORD_OTP' && (
        <form onSubmit={handleResetOtpSubmit} className="space-y-5">
          <div className="text-center mb-6">
            <p className="text-sm text-gray-600">Enter the OTP sent to verify your identity for Aadhar <strong>{aadhar.slice(0,4)}-XXXX-XXXX</strong>.</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Recovery OTP</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <KeyRound size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-center tracking-[0.5em] text-lg font-bold transition-all"
                placeholder="------"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            Verify OTP
          </button>
          <button type="button" onClick={() => setStep('LOGIN')} className="w-full text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors mt-4">
            Back to Login
          </button>
        </form>
      )}

      {step === 'RESET_PASSWORD' && (
        <form onSubmit={handleNewPasswordSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">New Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={18} className="text-gray-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            Set New Password
          </button>
        </form>
      )}
    </div>
  );
}
