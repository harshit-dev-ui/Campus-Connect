import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useSetRecoilState } from 'recoil';
import { userState } from '../atoms/userAtoms';
import { loginSuccess } from '../redux/authslice';
import { useDispatch } from 'react-redux';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const setUser = useSetRecoilState(userState);
  const dispatch = useDispatch();

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await axios.get("https://campus-connect-1-7rgs.onrender.com//auth/dashboard", {
          withCredentials: true,
        });
        if (response.status === 200) {
          navigate('/dashboard')
        }
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          setError("Unauthorized: Please log in");
          navigate("/login");
        } else {
          setError("An error occurred while loading the dashboard");
        }
      }
    }
    checkAuth()
  }, [navigate]);

  const handleUsernameChange = (e) => setUsername(e.target.value);
  const handlePasswordChange = (e) => setPassword(e.target.value);
  const handleOtpChange = (e) => setOtp(e.target.value);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(
        'https://campus-connect-1-7rgs.onrender.com//auth/login',
        { username, password },
        { withCredentials: true }
      );
      if (response.status === 200) {
        navigate('/dashboard')
        setError('');
      }
    } catch (error) {
      setError(error.response ? error.response.data.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(
        'https://campus-connect-1-7rgs.onrender.com//auth/verify-login',
        { username, otp },
        { withCredentials: true }
      );
      if (response.data.message == "Welcome to the dashboard") {
        dispatch(loginSuccess(response.data));
        navigate('/dashboard');
      }
    } catch (error) {
      console.log(error);
      setError(error.response ? error.response.data.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        'https://campus-connect-1-7rgs.onrender.com//auth/resend-otp',
        { username },
        { withCredentials: true }
      );
      if (response.status === 200) {
        setError('');
        alert('OTP has been resent!');
      }
    } catch (error) {
      setError(error.response ? error.response.data.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="w-full max-w-md p-8 bg-gray-800 shadow-lg rounded-lg">
        <h2 className="text-2xl font-bold text-center mb-6 text-white">Login</h2>
        {!otpSent ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-gray-300 font-medium">Username</label>
              <input
                type="text"
                value={username}
                onChange={handleUsernameChange}
                required
                className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-gray-300 font-medium">Password</label>
              <input
                type="password"
                value={password}
                onChange={handlePasswordChange}
                required
                className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-300"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Login'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-300 font-medium">OTP</label>
              <input
                type="text"
                value={otp}
                onChange={handleOtpChange}
                required
                className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-green-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-green-700 transition duration-300"
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={handleResendOtp}
                className="text-blue-400 hover:text-blue-300"
                disabled={loading}
              >
                Resend OTP
              </button>
            </div>
          </form>
        )}
        {error && (
          <p className="text-red-400 text-sm mt-4 text-center">{error}</p>
        )}

        <div className="mt-6 text-center">
          <p className="text-gray-400">
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="text-blue-400 hover:text-blue-300 hover:underline"
            >
              Create an Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;