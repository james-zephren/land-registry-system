import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { landService } from '../services/index.js';
import { validateKenyanLandReference } from '../utils/validation.js';

interface VerificationResult {
  isValid: boolean;
  land?: {
    parcelId: string;
    owner: {
      name: string;
    };
    location: string;
    area: number;
    status: string;
    registeredAt: string;
    dataHash: string;
    blockchainHash: string;
  };
  message?: string;
  integrityVerified?: boolean;
}

export const PublicVerificationPage: React.FC = () => {
  const [parcelId, setParcelId] = useState('');
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<any>(null);

  const handleParcelIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setParcelId(value);
    
    // Real-time validation
    if (value.trim()) {
      const result = validateKenyanLandReference(value);
      setValidation(result);
      setError(null);
    } else {
      setValidation(null);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate parcel ID
    const validationResult = validateKenyanLandReference(parcelId);
    if (!validationResult.isValid) {
      setError(validationResult.error || 'Invalid parcel ID format');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setVerificationResult(null);
    
    try {
      // Get land details
      const land = await landService.getLand(validationResult.normalized || parcelId);
      
      // Verify integrity against blockchain
      const verification = await landService.verify(land.parcelId, land.dataHash);
      
      setVerificationResult({
        isValid: true,
        land: {
          parcelId: land.parcelId,
          owner: { name: land.owner?.name || 'Unknown' },
          location: land.location,
          area: land.area,
          status: land.status,
          registeredAt: land.createdAt,
          dataHash: land.dataHash,
          blockchainHash: land.blockchainHash,
        },
        integrityVerified: verification.isValid,
        message: verification.isValid 
          ? '✓ Land record is valid and matches blockchain records'
          : '⚠️ Warning: Land record does NOT match blockchain records! Possible tampering detected.',
      });
    } catch (err: any) {
      console.error('Verification error:', err);
      if (err.response?.status === 404) {
        setError('Land not found. Please check the parcel ID and try again.');
      } else {
        setError(err.response?.data?.message || 'Failed to verify land. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return 'bg-green-100 text-green-800';
      case 'APPROVED':
        return 'bg-blue-100 text-blue-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'TRANSFERRED':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return '✓';
      case 'APPROVED':
        return '✔';
      case 'PENDING':
        return '⏳';
      case 'REJECTED':
        return '✗';
      case 'TRANSFERRED':
        return '↺';
      default:
        return '•';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      {/* Navigation Bar */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent">
                Ardhi Sasa
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/" className="text-gray-600 hover:text-green-600 transition">
                Home
              </Link>
              <Link to="/login" className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-emerald-700 transition">
                Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Verify Land Ownership
          </h1>
          <p className="text-xl text-gray-600">
            Search by Parcel ID to verify land ownership and check blockchain integrity
          </p>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <form onSubmit={handleVerify} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parcel ID / Land Reference
              </label>
              <input
                type="text"
                value={parcelId}
                onChange={handleParcelIdChange}
                placeholder="e.g., LR12345/2025, KSM/12345, Nairobi/Block/123/Plot/456"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                  validation?.isValid === false
                    ? 'border-red-500 focus:ring-red-500'
                    : validation?.isValid
                    ? 'border-green-500 focus:ring-green-500'
                    : 'border-gray-300 focus:ring-green-500'
                }`}
              />
              {validation && (
                <p className={`mt-2 text-sm ${validation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                  {validation.isValid
                    ? `✓ Valid ${validation.format?.replace('Format', '')} format`
                    : validation.error}
                </p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                Enter the Parcel ID in Kenyan Land Registry format
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || (parcelId && validation?.isValid === false)}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 transition font-medium disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </span>
              ) : (
                'Verify Land'
              )}
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Verification Result */}
        {verificationResult && verificationResult.land && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Integrity Banner */}
            <div className={`p-4 ${verificationResult.integrityVerified ? 'bg-green-50 border-b border-green-200' : 'bg-red-50 border-b border-red-200'}`}>
              <div className="flex items-center">
                {verificationResult.integrityVerified ? (
                  <svg className="w-6 h-6 text-green-600 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-red-600 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 9a1 1 0 112 0v4a1 1 0 11-2 0V9zm1 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                )}
                <p className={`font-medium ${verificationResult.integrityVerified ? 'text-green-700' : 'text-red-700'}`}>
                  {verificationResult.message}
                </p>
              </div>
            </div>

            {/* Land Details */}
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{verificationResult.land.parcelId}</h2>
                  <p className="text-gray-500 mt-1">{verificationResult.land.location}</p>
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(verificationResult.land.status)}`}>
                  {getStatusIcon(verificationResult.land.status)} {verificationResult.land.status}
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Registered Owner</p>
                    <p className="font-medium text-gray-900">{verificationResult.land.owner.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Area</p>
                    <p className="font-medium text-gray-900">{verificationResult.land.area} sq ft</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Registration Date</p>
                    <p className="font-medium text-gray-900">
                      {new Date(verificationResult.land.registeredAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Blockchain Status</p>
                    <div className="flex items-center mt-1">
                      <div className={`w-3 h-3 rounded-full mr-2 ${verificationResult.integrityVerified ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <p className="font-medium text-gray-900">
                        {verificationResult.integrityVerified ? 'Verified on Blockchain' : 'Blockchain Mismatch'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Blockchain Hash</p>
                    <p className="font-mono text-xs text-gray-600 break-all">
                      {verificationResult.land.blockchainHash?.substring(0, 66)}...
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Data Hash</p>
                    <p className="font-mono text-xs text-gray-600 break-all">
                      {verificationResult.land.dataHash?.substring(0, 66)}...
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    This verification is powered by blockchain technology. Records are immutable and tamper-proof.
                  </p>
                  <button
                    onClick={() => window.print()}
                    className="text-green-600 hover:text-green-700 text-sm font-medium"
                  >
                    Print Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Trust Badges */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500 mb-4">Trusted by</p>
          <div className="flex justify-center space-x-8">
            <div className="text-gray-400">✓ Blockchain Secured</div>
            <div className="text-gray-400">✓ Government Approved</div>
            <div className="text-gray-400">✓ Immutable Records</div>
          </div>
        </div>
      </div>
    </div>
  );
};