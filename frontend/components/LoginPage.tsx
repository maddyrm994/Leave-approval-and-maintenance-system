
import React, { useState } from 'react';
import { CalendarCheckIcon } from './icons';

interface LoginPageProps {
    onLogin: (email: string, password: string) => void;
    isLoading: boolean;
    error: string | null;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, isLoading, error }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (email && password) {
            onLogin(email, password);
        }
    };

    return (
        <div className="min-h-screen bg-white">
            <div className="flex flex-col lg:grid lg:grid-cols-2">
                {/* Branding Panel */}
                <div className="hidden lg:flex flex-col items-center justify-center bg-gradient-to-br from-red-600 to-rose-700 text-white p-12 text-center">
                    <CalendarCheckIcon className="w-24 h-24 mb-6" />
                    <h1 className="text-5xl font-extrabold tracking-tight">LeaveFlow</h1>
                    <p className="mt-4 text-lg max-w-sm">
                        Streamline your leave management process with ease and efficiency.
                    </p>
                </div>

                {/* Form Panel */}
                <div className="flex items-center justify-center p-8 sm:p-12 lg:p-16 h-screen">
                    <div className="w-full max-w-md">
                        <div className="text-center mb-8 lg:hidden">
                            <h1 className="text-3xl font-bold text-red-600">LeaveFlow</h1>
                        </div>
                        <h2 className="text-3xl font-bold text-slate-800">Log in to your account</h2>
                        <p className="text-slate-500 text-base mt-2 mb-8">Welcome back! Please enter your details.</p>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm" role="alert">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
                                    placeholder="e.g., adam.admin@example.com"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full px-4 py-3 bg-red-600 text-white rounded-lg text-base font-semibold hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-wait transition-colors"
                            >
                                {isLoading ? 'Signing In...' : 'Sign In'}
                            </button>
                        </form>
                         <p className="text-xs text-slate-400 text-center mt-8">
                            This is a simulated login. Passwords are in the source code.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;