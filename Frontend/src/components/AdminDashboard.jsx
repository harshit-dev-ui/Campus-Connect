import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import MentorshipNavbar from './MentorshipNavbar';

// Configure axios defaults
axios.defaults.baseURL = 'https://campus-connect-1-7rgs.onrender.com/';
axios.defaults.withCredentials = true;

const AdminDashboard = () => {
    const [applications, setApplications] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [isDarkMode, setIsDarkMode] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const initializeDashboard = async () => {
            try {
                setLoading(true);
                // Check if admin info exists
                const adminInfo = localStorage.getItem('adminInfo');
                if (!adminInfo) {
                    console.log("No admin info in localStorage");
                    navigate('/admin/login');
                    return;
                }

                // Verify admin authentication first
                console.log("Verifying admin authentication...");
                const verifyResponse = await axios.get('/api/admin/verify');
                console.log("Verify response:", verifyResponse.data);

                if (!verifyResponse.data.isAuthenticated) {
                    console.log("Admin not authenticated");
                    navigate('/admin/login');
                    return;
                }

                // Update stored admin info with latest data
                localStorage.setItem('adminInfo', JSON.stringify(verifyResponse.data.admin));

                // If authenticated, fetch data
                console.log("Fetching dashboard data...");
                const [applicationsResponse, statsResponse] = await Promise.all([
                    axios.get('/api/admin/applications'),
                    axios.get('/api/admin/stats')
                ]);

                console.log("Applications response:", {
                    status: applicationsResponse.status,
                    headers: applicationsResponse.headers,
                    data: applicationsResponse.data
                });

                console.log("Stats response:", {
                    status: statsResponse.status,
                    data: statsResponse.data
                });

                if (Array.isArray(applicationsResponse.data)) {
                    console.log("Applications details:", {
                        count: applicationsResponse.data.length,
                        applications: applicationsResponse.data.map(app => ({
                            id: app._id,
                            studentName: app.studentId?.name,
                            college: app.studentId?.college,
                            status: app.status,
                            hasStudentId: !!app.studentId
                        }))
                    });
                } else {
                    console.log("Unexpected applications data format:", applicationsResponse.data);
                }

                setApplications(applicationsResponse.data);
                setStats(statsResponse.data);
                setMessage('');
            } catch (error) {
                console.error('Error initializing dashboard:', error);
                if (error.response?.status === 401 || error.response?.status === 403) {
                    console.log("Auth error, redirecting to login");
                    localStorage.removeItem('adminInfo');
                    navigate('/admin/login');
                } else {
                    setMessage('Error loading dashboard data. Please try again.');
                }
            } finally {
                setLoading(false);
            }
        };

        // Check system preference for dark mode
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setIsDarkMode(prefersDark);

        initializeDashboard();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleStatusUpdate = async (applicationId, status, feedback = '') => {
        try {
            setMessage('');
            console.log("Sending status update request:", {
                applicationId,
                status,
                feedback
            });

            const adminInfo = JSON.parse(localStorage.getItem('adminInfo'));
            console.log("Current admin info:", {
                college: adminInfo?.college
            });

            const response = await axios.put('/api/admin/applications/status', {
                applicationId,
                status,
                feedback
            });

            console.log("Status update response:", response.data);

            if (response.data.application) {
                // Update applications list
                setApplications(prev =>
                    prev.map(app =>
                        app._id === applicationId
                            ? { ...app, status: status }
                            : app
                    )
                );

                // Refresh stats
                const statsResponse = await axios.get('/api/admin/stats');
                setStats(statsResponse.data);
                setMessage(response.data.message);
            }
        } catch (error) {
            console.error("Status update error:", {
                message: error.response?.data?.message,
                debug: error.response?.data?.debug,
                status: error.response?.status
            });

            setMessage(
                error.response?.data?.message ||
                'Error updating application status'
            );
        }
    };

    const toggleDarkMode = () => {
        setIsDarkMode(!isDarkMode);
    };

    const handleSignOut = async () => {
        try {
            setMessage('');
            const response = await axios.post('/api/admin/signout');

            if (response.status === 200) {
                navigate('/admin/login');
            }
        } catch (error) {
            console.error('Signout error:', error);
            setMessage(error.response?.data?.message || 'Error signing out. Please try again.');
            if (error.response?.status === 401) {
                navigate('/admin/login');
            }
        }
    };

    if (loading) {
        return (
            <div className={`min-h-screen ${isDarkMode ? 'bg-black text-white' : 'bg-gray-50 text-gray-900'} p-8 flex items-center justify-center`}>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center"
                >
                    <div className={`w-16 h-16 border-4 ${isDarkMode ? 'border-green-500' : 'border-green-600'} border-t-transparent rounded-full animate-spin mx-auto mb-4`}></div>
                    <p className={`text-xl ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>Loading...</p>
                </motion.div>
            </div>
        );
    }

    return (
        <>
            <MentorshipNavbar isDarkMode={isDarkMode} />
            <div className={`min-h-screen ${isDarkMode ? 'bg-black text-white' : 'bg-gray-50 text-gray-900'} pt-20 p-8`}>
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <motion.h1
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500"
                        >
                            Admin Dashboard
                        </motion.h1>
                        <div className="flex items-center gap-4">
                            <motion.button
                                onClick={toggleDarkMode}
                                className={`p-2 rounded-full ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                {isDarkMode ? '🌞' : '🌙'}
                            </motion.button>
                            <motion.button
                                onClick={handleSignOut}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg shadow-lg hover:bg-red-700 transition-colors"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Sign Out
                            </motion.button>
                        </div>
                    </div>

                    {/* Statistics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg border ${isDarkMode ? 'border-green-500' : 'border-green-600'} shadow-lg`}
                        >
                            <h3 className="text-lg font-semibold mb-2 text-green-400">Pending Applications</h3>
                            <p className="text-3xl font-bold">{stats.pending || 0}</p>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg border ${isDarkMode ? 'border-green-500' : 'border-green-600'} shadow-lg`}
                        >
                            <h3 className="text-lg font-semibold mb-2 text-green-400">Approved Applications</h3>
                            <p className="text-3xl font-bold">{stats.approved || 0}</p>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg border ${isDarkMode ? 'border-green-500' : 'border-green-600'} shadow-lg`}
                        >
                            <h3 className="text-lg font-semibold mb-2 text-green-400">Rejected Applications</h3>
                            <p className="text-3xl font-bold">{stats.rejected || 0}</p>
                        </motion.div>
                    </div>

                    {message && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`p-4 rounded mb-6 ${message.includes('successfully') ? 'bg-green-900' : 'bg-red-900'}`}
                        >
                            {message}
                        </motion.div>
                    )}

                    {/* Applications Table */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg border ${isDarkMode ? 'border-green-500' : 'border-green-600'} shadow-lg overflow-hidden`}
                    >
                        <div className="overflow-x-auto">
                            {applications.length === 0 ? (
                                <div className="p-8 text-center">
                                    <p className="text-xl text-gray-400">No active applications found</p>
                                </div>
                            ) : (
                                <table className="w-full">
                                    <thead>
                                        <tr className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Applicant</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Skills</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">SPI</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Applied On</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700">
                                        {applications.map((application) => (
                                            application.studentId && (  // Only render if studentId exists
                                                <motion.tr
                                                    key={application._id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className={`${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}
                                                >
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium">{application.studentId.name}</div>
                                                        <div className="text-sm text-gray-400">{application.studentId.email}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-wrap gap-1">
                                                            {application.skills.map((skill, index) => (
                                                                <span
                                                                    key={index}
                                                                    className={`px-2 py-1 text-xs rounded-full ${isDarkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800'
                                                                        }`}
                                                                >
                                                                    {skill}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{application.spi}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span
                                                            className={`px-2 py-1 text-xs rounded-full ${application.status === 'pending'
                                                                ? 'bg-yellow-900 text-yellow-300'
                                                                : application.status === 'approved'
                                                                    ? 'bg-green-900 text-green-300'
                                                                    : 'bg-red-900 text-red-300'
                                                                }`}
                                                        >
                                                            {application.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                        {new Date(application.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                        {application.status === 'pending' && (
                                                            <div className="flex gap-2">
                                                                <motion.button
                                                                    onClick={() => handleStatusUpdate(application._id, 'approved')}
                                                                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                                                                    whileHover={{ scale: 1.05 }}
                                                                    whileTap={{ scale: 0.95 }}
                                                                    disabled={loading}
                                                                >
                                                                    {loading ? 'Processing...' : 'Approve'}
                                                                </motion.button>
                                                                <motion.button
                                                                    onClick={() => handleStatusUpdate(application._id, 'rejected')}
                                                                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                                                                    whileHover={{ scale: 1.05 }}
                                                                    whileTap={{ scale: 0.95 }}
                                                                    disabled={loading}
                                                                >
                                                                    {loading ? 'Processing...' : 'Reject'}
                                                                </motion.button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </motion.tr>
                                            )
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </>
    );
};

export default AdminDashboard; 