import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/index.js';
import { authService } from '../services/index.js';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUser, setTokens, setLoading, loadFromStorage } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const validateForm = (): boolean => {
    if (!email.trim()) {
      setValidationError('Email is required');
      return false;
    }
    const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setValidationError('Please enter a valid email address');
      return false;
    }
    if (!password) {
      setValidationError('Password is required');
      return false;
    }
    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return false;
    }
    setValidationError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setValidationError('');
    if (!validateForm()) return;

    setIsSubmitting(true);
    setLoading(true);

    try {
      const result = await authService.login({
        email: email.trim().toLowerCase(),
        password,
      });

      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');

      localStorage.setItem('user', JSON.stringify(result.user));
      localStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);

      setUser(result.user);
      setTokens(result.accessToken, result.refreshToken);

      // Redirect based on role
      switch (result.user.role) {
        case 'CITIZEN':
          navigate('/citizen');
          break;
        case 'OFFICER':
        case 'REGISTRAR':
        case 'SURVEYOR':
          navigate('/officer');
          break;
        case 'AUDITOR':
          navigate('/auditor');
          break;
        case 'ADMIN':
          navigate('/admin');
          break;
        default:
          navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Login error details:', err);
      const errorData = err.response?.data;
      if (errorData?.error === 'ACCOUNT_PENDING_APPROVAL') {
        setError('Your account is pending admin approval. You will be notified once approved.');
      } else if (errorData?.error === 'ACCOUNT_DISABLED') {
        setError('Your account has been disabled. Please contact administrator.');
      } else if (errorData?.message) {
        setError(errorData.message);
      } else if (err.message === 'No refresh token') {
        setError('Login failed. Please try again.');
      } else {
        setError(err.message || 'Login failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
        </div>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent">Ardhi Sasa</h1>
          <p className="text-gray-500 mt-2">Blockchain-Powered Land Registry</p>
        </div>

        {(error || validationError) && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{validationError || error}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (validationError) setValidationError('');
                if (error) setError('');
              }}
              className="block w-full rounded-xl border border-gray-200 shadow-sm p-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (validationError) setValidationError('');
                if (error) setError('');
              }}
              className="block w-full rounded-xl border border-gray-200 shadow-sm p-2.5 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
              placeholder="Enter your password"
              autoComplete="current-password"
            />
            <p className="mt-1 text-xs text-gray-400">Password must be at least 6 characters</p>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2.5 rounded-xl hover:from-green-700 hover:to-emerald-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Logging in...
              </span>
            ) : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-green-50 rounded-xl">
          <p className="text-xs font-medium text-green-700 text-center mb-2">Test Credentials</p>
          <div className="space-y-1 text-xs text-green-600">
            <p className="flex justify-between"><span>👤 Citizen:</span><span className="font-mono">citizen@example.com / password123</span></p>
            <p className="flex justify-between"><span>📋 Registrar:</span><span className="font-mono">officer1@example.com / password123</span></p>
            <p className="flex justify-between"><span>📐 Surveyor:</span><span className="font-mono">officer2@example.com / password123</span></p>
            <p className="flex justify-between"><span>👁️ Auditor:</span><span className="font-mono">auditor@example.com / password123</span></p>
            <p className="flex justify-between"><span>⚙️ Admin:</span><span className="font-mono">admin@example.com / password123</span></p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">Don't have an account? <Link to="/register" className="text-green-600 hover:text-green-700 font-medium">Create one here</Link></p>
        </div>
      </div>
    </div>
  );
};