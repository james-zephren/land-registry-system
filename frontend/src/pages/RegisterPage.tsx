import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/index.js';
import { useAuthStore } from '../store/index.js';

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  walletAddress?: string;
  general?: string;
}

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUser, setTokens, setLoading } = useAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    walletAddress: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [generalError, setGeneralError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Name must be less than 100 characters';
    }

    const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address (e.g., name@example.com)';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    } else if (formData.password.length > 100) {
      newErrors.password = 'Password must be less than 100 characters';
    } else if (!/[A-Z]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter';
    } else if (!/[a-z]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one lowercase letter';
    } else if (!/[0-9]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one number';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (formData.walletAddress && formData.walletAddress.trim()) {
      const walletRegex = /^0x[a-fA-F0-9]{40}$/;
      if (!walletRegex.test(formData.walletAddress)) {
        newErrors.walletAddress = 'Invalid wallet address format. Must be 0x followed by 40 hex characters';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (generalError) setGeneralError('');
    if (successMessage) setSuccessMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setErrors({});
    setGeneralError('');
    setSuccessMessage('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setLoading(true);

    try {
      const { confirmPassword, ...registerData } = formData;
      const apiData = {
        ...registerData,
        walletAddress: registerData.walletAddress?.trim() || undefined,
      };

      const result = await authService.register(apiData);

      // After registration, show success message and redirect to login
      setSuccessMessage('Registration successful! Your account requires admin approval before you can log in. You will be redirected to login page.');

      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      console.error('Registration error:', err);

      if (err.response?.data) {
        const errorData = err.response.data;

        if (errorData.error === 'EMAIL_ALREADY_EXISTS') {
          setErrors({
            email: errorData.message || 'This email is already registered. Please login instead.'
          });
        } else if (errorData.error === 'WALLET_ALREADY_USED') {
          setErrors({
            walletAddress: errorData.message || 'This wallet address is already linked to another account.'
          });
        } else if (errorData.details && Array.isArray(errorData.details)) {
          const fieldErrors: FormErrors = {};
          errorData.details.forEach((detail: any) => {
            const field = detail.path?.[0] || 'general';
            if (field === 'email') fieldErrors.email = detail.message;
            else if (field === 'password') fieldErrors.password = detail.message;
            else if (field === 'name') fieldErrors.name = detail.message;
            else if (field === 'walletAddress') fieldErrors.walletAddress = detail.message;
            else fieldErrors.general = detail.message;
          });
          setErrors(fieldErrors);
        } else if (errorData.message) {
          if (errorData.message.toLowerCase().includes('email') ||
              errorData.message.toLowerCase().includes('already')) {
            setErrors({ email: errorData.message });
          } else {
            setGeneralError(errorData.message);
          }
        } else {
          setGeneralError('Registration failed. Please try again.');
        }
      } else if (err.message) {
        setGeneralError(err.message);
      } else {
        setGeneralError('Network error. Please check your connection and try again.');
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
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent">Create Account</h1>
          <p className="text-gray-500 mt-2">Join Ardhi Sasa - Secure Land Registry</p>
        </div>

        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
            <p className="text-sm text-green-700">{successMessage}</p>
          </div>
        )}

        {generalError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{generalError}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`mt-1 block w-full rounded-xl shadow-sm p-2.5 border ${errors.name ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-green-500 focus:border-green-500'} focus:outline-none focus:ring-2 transition`}
              placeholder="Enter your full name"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`mt-1 block w-full rounded-xl shadow-sm p-2.5 border ${errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-green-500 focus:border-green-500'} focus:outline-none focus:ring-2 transition`}
              placeholder="you@example.com"
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`mt-1 block w-full rounded-xl shadow-sm p-2.5 border ${errors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-green-500 focus:border-green-500'} focus:outline-none focus:ring-2 transition`}
              placeholder="Minimum 6 characters"
            />
            {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
            <p className="mt-1 text-xs text-gray-400">Must be at least 6 characters with uppercase, lowercase, and numbers</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`mt-1 block w-full rounded-xl shadow-sm p-2.5 border ${errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-green-500 focus:border-green-500'} focus:outline-none focus:ring-2 transition`}
              placeholder="Confirm your password"
            />
            {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Wallet Address <span className="text-gray-400">(Optional)</span></label>
            <input
              type="text"
              name="walletAddress"
              value={formData.walletAddress}
              onChange={handleChange}
              className={`mt-1 block w-full rounded-xl shadow-sm p-2.5 border ${errors.walletAddress ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-green-500 focus:border-green-500'} focus:outline-none focus:ring-2 transition`}
              placeholder="0x..."
            />
            {errors.walletAddress && <p className="mt-1 text-sm text-red-600">{errors.walletAddress}</p>}
            <p className="mt-1 text-xs text-gray-400">Your Ethereum wallet address for blockchain interactions</p>
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
                Creating Account...
              </span>
            ) : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-green-600 hover:text-green-700 font-medium">
              Sign in here
            </Link>
          </p>
        </div>

        <div className="mt-4 p-3 bg-green-50 rounded-xl">
          <p className="text-xs text-green-700 font-medium mb-1">Password Requirements:</p>
          <ul className="text-xs text-green-600 space-y-1">
            <li className="flex items-center">✓ At least 6 characters long</li>
            <li className="flex items-center">✓ Contains at least one uppercase letter (A-Z)</li>
            <li className="flex items-center">✓ Contains at least one lowercase letter (a-z)</li>
            <li className="flex items-center">✓ Contains at least one number (0-9)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};