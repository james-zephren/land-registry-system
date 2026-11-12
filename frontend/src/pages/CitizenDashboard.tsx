import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useLandStore } from '../store/index.js';
import { landService, transferService } from '../services/index.js';
import { validateKenyanLandReference, suggestLandReferenceFormat } from '../utils/validation.js';

export const CitizenDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { lands, setLands } = useLandStore();
  const [isLoading, setIsLoading] = useState(true);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [formData, setFormData] = useState({
    parcelId: '',
    location: '',
    area: 0,
    documentHash: '',
    description: '',
  });
  const [validation, setValidation] = useState<any>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [showTransfers, setShowTransfers] = useState(false);

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const loadLands = async () => {
      try {
        const userLands = await landService.getUserLands();
        setLands(Array.isArray(userLands) ? userLands : []);
      } catch (error) {
        console.error('Failed to load lands', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadLands();
    loadTransfers();
  }, [setLands]);

  const loadTransfers = async () => {
    try {
      const userTransfers = await transferService.getUserTransfers();
      setTransfers(Array.isArray(userTransfers) ? userTransfers : []);
    } catch (error) {
      console.error('Failed to load transfers', error);
    }
  };

  // Filter lands based on search term and status
  const getFilteredLands = () => {
    let filtered = [...lands];
    if (searchTerm) {
      filtered = filtered.filter(land =>
        land.parcelId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        land.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(land => land.status === statusFilter);
    }
    return filtered;
  };

  const filteredLands = getFilteredLands();

  const handleParcelIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, parcelId: value });
    if (value.trim()) {
      const result = validateKenyanLandReference(value);
      setValidation(result);
      if (result.isValid && formError?.includes('Parcel ID')) {
        setFormError(null);
      }
    } else {
      setValidation(null);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const validationResult = validateKenyanLandReference(formData.parcelId);
    if (!validationResult.isValid) {
      setFormError(validationResult.error || 'Invalid parcel ID format');
      return;
    }
    if (!formData.location.trim()) {
      setFormError('Location is required');
      return;
    }
    if (formData.area <= 0 || isNaN(formData.area)) {
      setFormError('Area must be a positive number');
      return;
    }
    try {
      const newLand = await landService.register({
        parcelId: validationResult.normalized || formData.parcelId,
        location: formData.location,
        area: formData.area,
        documentHash: formData.documentHash || undefined,
      });
      setLands([...lands, newLand]);
      setFormData({ parcelId: '', location: '', area: 0, documentHash: '', description: '' });
      setValidation(null);
      setShowRegisterForm(false);
      setRegisterSuccess(true);
      setTimeout(() => setRegisterSuccess(false), 3000);
    } catch (error: any) {
      console.error('Registration error:', error);
      setFormError(error.response?.data?.message || 'Failed to register land. Please try again.');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initiateTransfer = async (landId: string) => {
    const recipientEmail = prompt('Enter recipient email address:');
    if (!recipientEmail) return;
    try {
      const token = localStorage.getItem('accessToken');
      const userResponse = await fetch(`http://localhost:5000/api/users/by-email/${recipientEmail}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const userResult = await userResponse.json();
      if (!userResponse.ok) {
        alert('Recipient not found');
        return;
      }
      await transferService.initiate({ landId, toOwnerId: userResult.data.id });
      alert('Transfer request submitted! Waiting for officer approval.');
      loadTransfers();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Transfer failed');
    }
  };

  const canTransfer = (land: any) => {
    return user?.role === 'CITIZEN' && 
           land?.owner?.id === user?.id && 
           (land?.status === 'VERIFIED' || land?.status === 'APPROVED' || land?.status === 'TRANSFERRED');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VERIFIED': return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800';
      case 'APPROVED': return 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800';
      case 'PENDING': return 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800';
      case 'REJECTED': return 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800';
      case 'TRANSFERRED': return 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800';
      default: return 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'VERIFIED': return <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>;
      case 'APPROVED': return <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>;
      case 'PENDING': return <svg className="w-4 h-4 mr-1 animate-pulse" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="mt-4 text-gray-600">Loading your lands...</p>
        </div>
      </div>
    );
  }

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
              <span className="text-2xl font-bold bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent">Ardhi Sasa</span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600">Citizen Portal</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 px-3 py-1 bg-green-50 rounded-full">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">{user?.name?.charAt(0).toUpperCase() || 'U'}</span>
                </div>
                <span className="text-gray-700 font-medium">{user?.name}</span>
              </div>
              <button onClick={handleLogout} className="flex items-center space-x-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Lands</h1>
              <p className="text-gray-600 mt-1">Manage and track your registered land parcels</p>
            </div>
            <button
              onClick={() => {
                setShowRegisterForm(!showRegisterForm);
                setFormError(null);
                setValidation(null);
              }}
              className={`inline-flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition ${
                showRegisterForm
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-md'
              }`}
            >
              {showRegisterForm ? (
                <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg><span>Cancel</span></>
              ) : (
                <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg><span>Register New Land</span></>
              )}
            </button>
          </div>

          {/* Stats Card */}
          <div className="mt-6 bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /></svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Registered Lands</p>
                  <p className="text-2xl font-bold text-gray-900">{lands.length}</p>
                </div>
              </div>
              <div className="h-12 w-px bg-gray-200"></div>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-100 to-amber-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pending Approvals</p>
                  <p className="text-2xl font-bold text-gray-900">{lands.filter(l => l.status === 'PENDING').length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Registration Form */}
        {showRegisterForm && (
          <div className="mb-8 bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
              <h3 className="text-xl font-bold text-white">Register New Land</h3>
              <p className="text-green-100 text-sm">Fill in the details below to register your land parcel</p>
            </div>
            <form onSubmit={handleRegister} className="p-6 space-y-6">
              {registerSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  <span className="text-green-700">Land registered successfully! Waiting for officer approval.</span>
                </div>
              )}
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
                  <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                  <span className="text-red-700">{formError}</span>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Parcel ID / Land Reference *</label>
                  <input type="text" value={formData.parcelId} onChange={handleParcelIdChange} className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${validation?.isValid === false ? 'border-red-500 focus:ring-red-500' : validation?.isValid ? 'border-green-500 focus:ring-green-500' : 'border-gray-300 focus:ring-green-500'}`} placeholder="e.g., LR12345/2025" required />
                  {validation && (
                    <p className={`mt-1 text-sm ${validation.isValid ? 'text-green-600' : 'text-red-600'}`}>
                      {validation.isValid ? <>✓ Valid {validation.format?.replace('Format', '')} format</> : <>{validation.error}<button type="button" onClick={() => alert(suggestLandReferenceFormat())} className="ml-2 text-blue-600 hover:text-blue-800 underline">Show examples</button></>}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">Format: LR12345/2025, Nairobi/Block/123/Plot/456, KSM/12345, etc.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location / Address *</label>
                  <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="e.g., Nairobi, Kasarani, Plot 123" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Area (in acres or sq ft) *</label>
                  <input type="number" step="0.01" value={formData.area} onChange={(e) => setFormData({ ...formData, area: parseFloat(e.target.value) })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="0.00" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Document Hash (Optional)</label>
                  <input type="text" value={formData.documentHash} onChange={(e) => setFormData({ ...formData, documentHash: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="IPFS hash or document reference" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Additional details about the land..." />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 rounded-lg hover:from-green-700 hover:to-emerald-700 transition font-medium">Register Land</button>
                <button type="button" onClick={() => { setShowRegisterForm(false); setFormError(null); setValidation(null); }} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="mb-6 bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="🔍 Search by Parcel ID or Location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="all">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="VERIFIED">Verified</option>
                <option value="REJECTED">Rejected</option>
                <option value="TRANSFERRED">Transferred</option>
              </select>
            </div>
            <button
              onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Clear Filters
            </button>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            Showing {filteredLands.length} of {lands.length} lands
          </div>
        </div>

        {/* Lands Grid */}
        {filteredLands.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLands.map((land) => (
              <div
                key={land.id}
                className="group bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border border-gray-100 hover:border-green-200"
                onClick={() => navigate(`/land/${encodeURIComponent(land.parcelId)}`)}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-green-600 transition">{land.parcelId}</h3>
                      <p className="text-sm text-gray-500 mt-1">{land.location}</p>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(land.status)}`}>
                      {getStatusIcon(land.status)}{land.status}
                    </span>
                  </div>

                  {/* Blockchain Integrity Badge */}
                  {land.blockchainHash && land.blockchainHash !== '' && (
                    <div className="mt-2 flex items-center">
                      <div className="flex items-center px-2 py-1 rounded-full">
                        {land.status === 'VERIFIED' || land.status === 'TRANSFERRED' ? (
                          <>
                            <svg className="w-3 h-3 text-green-600 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Blockchain Verified</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3 text-yellow-600 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                            <span className="text-xs font-medium text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">Pending Verification</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {canTransfer(land) && (
                    <div className="mt-2">
                      <button onClick={(e) => { e.stopPropagation(); initiateTransfer(land.id); }} className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm font-medium">Request Transfer</button>
                    </div>
                  )}

                  <div className="space-y-2 text-sm mt-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-500">Area</span><span className="font-medium text-gray-900">{land.area} sq ft</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-500">Blockchain Hash</span>
                      <span className="font-mono text-xs text-gray-600 truncate max-w-[150px]">{land.dataHash?.substring(0, 16)}...</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-500">Registered</span>
                      <span className="text-gray-600">{new Date(land.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <button className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center">View Details<svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Lands Registered Yet</h3>
            <p className="text-gray-500 mb-6">Get started by registering your first land parcel</p>
            <button onClick={() => setShowRegisterForm(true)} className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition shadow-md">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              <span>Register Your First Land</span>
            </button>
          </div>
        )}

        {/* Transfer History Section */}
        <div className="mt-8">
          <button onClick={() => setShowTransfers(!showTransfers)} className={`inline-flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition ${showTransfers ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-md'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
            <span>{showTransfers ? 'Hide' : 'View'} Transfer History</span>
          </button>
        </div>

        {showTransfers && (
          <div className="mt-4 bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b"><h3 className="text-lg font-bold text-gray-900">Transfer History</h3></div>
            {transfers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                <p>No transfer requests yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {transfers.map((transfer) => (
                  <div key={transfer.id} className="p-4 hover:bg-gray-50 transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-gray-900">{transfer.land?.parcelId}</p>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${transfer.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : transfer.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : transfer.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>{transfer.status}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{transfer.isOutgoing ? <>Transferring to <span className="font-medium">{transfer.toOwner?.name}</span></> : <>Receiving from <span className="font-medium">{transfer.fromOwner?.name}</span></>}</p>
                        <p className="text-xs text-gray-400 mt-1">{new Date(transfer.createdAt).toLocaleString()}</p>
                        {transfer.status === 'PENDING' && transfer.isOutgoing && <p className="text-xs text-yellow-600 mt-2">⏳ Waiting for officer approval ({transfer.approvals || 0}/{transfer.requiredApprovals || 2} approvals)</p>}
                      </div>
                      <div className="text-right"><span className={`text-xs px-2 py-1 rounded-full ${transfer.isIncoming ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>{transfer.isIncoming ? 'Incoming' : 'Outgoing'}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CitizenDashboard;