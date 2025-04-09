import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

// Configure axios defaults
axios.defaults.baseURL = 'https://campus-connect-1-7rgs.onrender.com/';
axios.defaults.withCredentials = true;

const AdminLogin = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        adminCode: ''
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const navigate = useNavigate();

    // Check if user is already authenticated
    const checkAuthStatus = useCallback(async () => {
        try {
            const adminInfo = localStorage.getItem('adminInfo');
            if (!adminInfo) {
                console.log("No admin info in localStorage");
                setIsInitializing(false);
                return;
            }

            console.log("Checking auth status with stored admin info");
            const response = await axios.get('/api/admin/verify');
            console.log("Verify response:", response.data);

            if (response.data.isAuthenticated) {
                console.log("Admin is authenticated, redirecting to dashboard");
                // Update stored admin info with latest data
                localStorage.setItem('adminInfo', JSON.stringify(response.data.admin));
                navigate('/admin/dashboard');
            } else {
                console.log("Admin not authenticated, clearing localStorage");
                localStorage.removeItem('adminInfo');
                setIsInitializing(false);
            }
        } catch (error) {
            console.log('Auth check failed:', error);
            localStorage.removeItem('adminInfo');
            setIsInitializing(false);
        }
    }, [navigate]);

    useEffect(() => {
        checkAuthStatus();
    }, [checkAuthStatus]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error when user starts typing
        if (error) setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            console.log("Attempting admin login");
            const response = await axios.post('/api/admin/login', formData);
            console.log("Login response:", response.data);

            if (response.data.message === 'Login successful') {
                console.log("Login successful, storing admin info");
                localStorage.setItem('adminInfo', JSON.stringify(response.data.admin));
                navigate('/admin/dashboard');
            }
        } catch (error) {
            console.error('Login failed:', error);
            setError(error.response?.data?.message || 'Login failed. Please try again.');
            setIsLoading(false);
        }
    };

    if (isInitializing) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-lg"
            >
                <div>
                    <motion.h2
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-6 text-center text-3xl font-extrabold text-gray-900"
                    >
                        Admin Login
                    </motion.h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Please sign in with your admin credentials
                    </p>
                </div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
                        role="alert"
                    >
                        <span className="block sm:inline">{error}</span>
                    </motion.div>
                )}

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                                placeholder="Enter your email"
                                value={formData.email}
                                onChange={handleChange}
                                disabled={isLoading}
                            />
                        </div>
                        <div>
                            <label htmlFor="adminCode" className="block text-sm font-medium text-gray-700 mb-1">
                                Admin Code
                            </label>
                            <input
                                id="adminCode"
                                name="adminCode"
                                type="text"
                                required
                                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                                placeholder="Enter your admin code"
                                value={formData.adminCode}
                                onChange={handleChange}
                                disabled={isLoading}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                                placeholder="Enter your password"
                                value={formData.password}
                                onChange={handleChange}
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div>
                        <motion.button
                            whileHover={{ scale: isLoading ? 1 : 1.02 }}
                            whileTap={{ scale: isLoading ? 1 : 0.98 }}
                            type="submit"
                            disabled={isLoading}
                            className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${isLoading
                                ? 'bg-green-400 cursor-not-allowed'
                                : 'bg-green-600 hover:bg-green-700'
                                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
                        >
                            {isLoading ? (
                                <div className="flex items-center">
                                    <svg
                                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        ></circle>
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                    </svg>
                                    Signing in...
                                </div>
                            ) : (
                                'Sign in'
                            )}
                        </motion.button>
                    </div>
                </form>

                <div className="mt-4 text-center">
                    <p className="text-xs text-gray-500">
                        Contact your institution's administrator for admin access
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default AdminLogin; 