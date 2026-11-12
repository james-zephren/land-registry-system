import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/index.js';
import {
  landService,
  approvalService,
  transferService,
} from '../services/index.js';

export const OfficerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [lands, setLands] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [pendingTransfers, setPendingTransfers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('approvals');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Search, Filter, and Report States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Determine officer role
  const userRole = user?.role;
  let officerRole = 'REGISTRAR';
  if (userRole === 'SURVEYOR') {
    officerRole = 'SURVEYOR';
  } else if (userRole === 'REGISTRAR' || userRole === 'OFFICER') {
    officerRole = 'REGISTRAR';
  }

  // Role-specific dashboard title
  const getDashboardTitle = () => {
    switch(officerRole) {
      case 'REGISTRAR':
        return { title: 'Land Registrar Dashboard', description: 'Process land registrations, verify documents, and issue title deeds' };
      case 'SURVEYOR':
        return { title: 'Surveyor Dashboard', description: 'Verify land boundaries, coordinates, and physical location' };
      default:
        return { title: 'Officer Dashboard', description: 'Manage land registrations and transfers' };
    }
  };
  const dashboard = getDashboardTitle();

  // Role-specific tabs
  const getTabs = () => {
    switch(officerRole) {
      case 'REGISTRAR':
        return [
          { id: 'approvals', label: 'Pending Registrations', count: pendingApprovals.length },
          { id: 'transfers', label: 'Pending Transfers', count: pendingTransfers.length },
          { id: 'all', label: 'All Lands', count: lands.length }
        ];
      case 'SURVEYOR':
        return [
          { id: 'pending_surveys', label: 'Pending Surveys', count: pendingApprovals.length },
          { id: 'completed', label: 'Completed Surveys', count: lands.filter(l => l.status === 'VERIFIED').length },
          { id: 'all', label: 'All Lands', count: lands.length }
        ];
      default:
        return [
          { id: 'approvals', label: 'Pending Approvals', count: pendingApprovals.length },
          { id: 'transfers', label: 'Pending Transfers', count: pendingTransfers.length },
          { id: 'all', label: 'All Lands', count: lands.length }
        ];
    }
  };
  const tabs = getTabs();

  // Load data
  const loadData = async () => {
    try {
      const allLands = await landService.getAllLands();
      setLands(Array.isArray(allLands) ? allLands : []);
      const pending = await approvalService.getPending();
      setPendingApprovals(Array.isArray(pending) ? pending : []);
    } catch (error: any) {
      console.error('Failed to load data', error);
      setError(error.response?.data?.message || 'Failed to load dashboard data');
    }
  };

  const loadPendingTransfers = async () => {
    try {
      const transfers = await transferService.getPendingApprovals();
      setPendingTransfers(Array.isArray(transfers) ? transfers : []);
    } catch (error) {
      console.error('Failed to load pending transfers', error);
    }
  };

  useEffect(() => {
    const loadAllData = async () => {
      setIsLoading(true);
      await loadData();
      await loadPendingTransfers();
      setIsLoading(false);
    };
    loadAllData();
  }, []);

  // Filter lands based on search, status, category, date
  const getFilteredLands = () => {
    let filtered = [...lands];
    if (searchTerm) {
      filtered = filtered.filter(land =>
        land.parcelId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        land.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        land.owner?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(land => land.status === statusFilter);
    }
    if (categoryFilter === 'registration') {
      filtered = filtered.filter(land => land.status !== 'TRANSFERRED');
    } else if (categoryFilter === 'transfer') {
      filtered = filtered.filter(land => land.status === 'TRANSFERRED');
    }
    if (startDate) {
      filtered = filtered.filter(land => new Date(land.createdAt) >= new Date(startDate));
    }
    if (endDate) {
      filtered = filtered.filter(land => new Date(land.createdAt) <= new Date(endDate));
    }
    return filtered;
  };

  const filteredLands = getFilteredLands();
  const totalCount = lands.length;
  const pendingCount = lands.filter(l => l.status === 'PENDING').length;
  const approvedCount = lands.filter(l => l.status === 'APPROVED').length;
  const verifiedCount = lands.filter(l => l.status === 'VERIFIED').length;
  const transferredCount = lands.filter(l => l.status === 'TRANSFERRED').length;
  const rejectedCount = lands.filter(l => l.status === 'REJECTED').length;

  // CSV Download function (Report)
 const downloadCSV = () => {
  if (!filteredLands.length) {
    alert('No data to export');
    return;
  }
  const escapeCSV = (cell: any) => {
    if (cell === undefined || cell === null) return '';
    const str = String(cell);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const headers = ['Parcel ID', 'Owner', 'Location', 'Area (sq ft)', 'Status', 'Registration Date'];
  const rows = filteredLands.map(land => [
    escapeCSV(land.parcelId),
    escapeCSV(land.owner?.name || 'Unknown'),
    escapeCSV(land.location),
    escapeCSV(land.area),
    escapeCSV(land.status),
    escapeCSV(new Date(land.createdAt).toLocaleDateString())
  ]);
  const csvContent = [headers.map(escapeCSV).join(','), ...rows.map(row => row.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.setAttribute('download', `lands_report_${new Date().toISOString().slice(0,19)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

  // Handlers
  const handleApprove = async (landId: string) => {
    try {
      setProcessingId(landId);
      await approvalService.approveLand(landId, 'Approved by officer');
      await loadData();
      alert('Land approved successfully!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to approve land');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (landId: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;
    try {
      setProcessingId(landId);
      await approvalService.rejectLand(landId, reason);
      await loadData();
      alert('Land rejected successfully!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to reject land');
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveTransfer = async (transferId: string) => {
    try {
      await transferService.approve(transferId);
      alert('Transfer approved successfully!');
      await loadPendingTransfers();
      await loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to approve transfer');
    }
  };

  const handleRejectTransfer = async (transferId: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;
    try {
      await transferService.reject(transferId, reason);
      alert('Transfer rejected');
      await loadPendingTransfers();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to reject transfer');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VERIFIED': return 'bg-green-100 text-green-800';
      case 'APPROVED': return 'bg-blue-100 text-blue-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'TRANSFERRED': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
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
              <span className="text-gray-600">{officerRole === 'SURVEYOR' ? 'Surveyor Portal' : 'Land Registrar Portal'}</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 px-3 py-1 bg-green-50 rounded-full">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">{user?.name?.charAt(0).toUpperCase() || 'O'}</span>
                </div>
                <span className="text-gray-700 font-medium">{user?.name}</span>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{officerRole === 'SURVEYOR' ? 'Surveyor' : 'Registrar'}</span>
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{dashboard.title}</h1>
          <p className="text-gray-600 mt-1">{dashboard.description}</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-700">{error}</p>
            <button onClick={() => window.location.reload()} className="mt-2 text-sm text-red-600 hover:text-red-800">Retry</button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-500">{officerRole === 'SURVEYOR' ? 'Pending Surveys' : 'Pending Registrations'}</p><p className="text-2xl font-bold text-yellow-600">{pendingApprovals.length}</p></div>
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-100 to-amber-100 rounded-xl flex items-center justify-center"><svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-500">{officerRole === 'SURVEYOR' ? 'Completed Surveys' : 'Pending Transfers'}</p><p className="text-2xl font-bold text-purple-600">{officerRole === 'SURVEYOR' ? verifiedCount : pendingTransfers.length}</p></div>
              <div className="w-12 h-12 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl flex items-center justify-center"><svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg></div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-500">Total Lands</p><p className="text-2xl font-bold text-gray-900">{lands.length}</p></div>
              <div className="w-12 h-12 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl flex items-center justify-center"><svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /></svg></div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-500">{officerRole === 'SURVEYOR' ? 'Verified Boundaries' : 'Issued Title Deeds'}</p><p className="text-2xl font-bold text-green-600">{verifiedCount}</p></div>
              <div className="w-12 h-12 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl flex items-center justify-center"><svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
            </div>
          </div>
        </div>

        {/* SEARCH, FILTER, REPORT SECTION */}
        <div className="mb-8 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Search & Filter Options</h3>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <input type="text" placeholder="🔍 Search by Parcel ID, Location, or Owner Name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border rounded-lg"><option value="all">All Status</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="VERIFIED">Verified</option><option value="REJECTED">Rejected</option><option value="TRANSFERRED">Transferred</option></select>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-4 py-2 border rounded-lg"><option value="all">All Categories</option><option value="registration">Land Registrations</option><option value="transfer">Ownership Transfers</option></select>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1"><label className="block text-sm text-gray-600 mb-1">From Date</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-4 py-2 border rounded-lg" /></div>
            <div className="flex-1"><label className="block text-sm text-gray-600 mb-1">To Date</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-4 py-2 border rounded-lg" /></div>
            <div className="flex items-end gap-2">
              <button onClick={downloadCSV} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download CSV
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            <button onClick={() => { setStatusFilter('all'); setCategoryFilter('all'); }} className="px-3 py-1 rounded-full text-sm bg-green-600 text-white">All ({totalCount})</button>
            <button onClick={() => setStatusFilter('PENDING')} className="px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-700 hover:bg-yellow-200">Pending ({pendingCount})</button>
            <button onClick={() => setStatusFilter('APPROVED')} className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700 hover:bg-blue-200">Approved ({approvedCount})</button>
            <button onClick={() => setStatusFilter('VERIFIED')} className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-700 hover:bg-green-200">Verified ({verifiedCount})</button>
            <button onClick={() => setStatusFilter('TRANSFERRED')} className="px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-700 hover:bg-purple-200">Transferred ({transferredCount})</button>
            <button onClick={() => setStatusFilter('REJECTED')} className="px-3 py-1 rounded-full text-sm bg-red-100 text-red-700 hover:bg-red-200">Rejected ({rejectedCount})</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-gray-200">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`py-3 px-4 font-medium border-b-2 transition ${activeTab === tab.id ? 'border-green-600 text-green-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Pending Approvals / Surveys Tab */}
        {(activeTab === 'approvals' || activeTab === 'pending_surveys') && (
          <div className="space-y-4">
            {pendingApprovals.length > 0 ? pendingApprovals.map((approval) => (
              <div key={approval.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div><h3 className="text-lg font-bold text-gray-900">{approval.land?.parcelId || 'N/A'}</h3><p className="text-sm text-gray-500">{approval.land?.location}</p></div>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">PENDING</span>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div><p className="text-sm text-gray-500">Owner</p><p className="font-medium">{approval.land?.owner?.name}</p></div>
                  <div><p className="text-sm text-gray-500">Area</p><p className="font-medium">{approval.land?.area} sq ft</p></div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleApprove(approval.land.id)} disabled={processingId === approval.land.id} className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50">
                    {processingId === approval.land.id ? 'Processing...' : (officerRole === 'SURVEYOR' ? '✓ Verify Survey' : '✓ Approve Registration')}
                  </button>
                  <button onClick={() => handleReject(approval.land.id)} disabled={processingId === approval.land.id} className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50">✗ Reject</button>
                </div>
              </div>
            )) : <div className="bg-white rounded-xl shadow-sm p-12 text-center"><p className="text-gray-500">{officerRole === 'SURVEYOR' ? 'No pending surveys' : 'No pending registrations'}</p></div>}
          </div>
        )}

        {/* Pending Transfers Tab */}
        {activeTab === 'transfers' && (
          <div className="space-y-4">
            {pendingTransfers.length > 0 ? pendingTransfers.map((transfer) => (
              <div key={transfer.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div><h3 className="text-lg font-bold text-gray-900">Transfer: {transfer.land?.parcelId}</h3><p className="text-sm text-gray-600">From: {transfer.fromOwner?.name} → To: {transfer.toOwner?.name}</p></div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">{transfer.approvals?.length || 0}/{transfer.requiredApprovals || 2} Approvals</span>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div><p className="text-sm text-gray-500">Location</p><p className="font-medium">{transfer.land?.location}</p></div>
                  <div><p className="text-sm text-gray-500">Area</p><p className="font-medium">{transfer.land?.area} sq ft</p></div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleApproveTransfer(transfer.id)} className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700">✓ Approve Transfer</button>
                  <button onClick={() => handleRejectTransfer(transfer.id)} className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700">✗ Reject Transfer</button>
                </div>
              </div>
            )) : <div className="bg-white rounded-xl shadow-sm p-12 text-center"><p className="text-gray-500">No pending transfers</p></div>}
          </div>
        )}

        {/* Completed Surveys Tab (Surveyor only) */}
        {activeTab === 'completed' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parcel ID</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Survey Date</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th></tr></thead>
                <tbody className="divide-y divide-gray-200">
                  {lands.filter(l => l.status === 'VERIFIED').map((land) => (
                    <tr key={land.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{land.parcelId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{land.owner?.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{land.location}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(land.updatedAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">VERIFIED</span></td>
                      <td className="px-6 py-4 whitespace-nowrap"><button onClick={() => navigate(`/land/${encodeURIComponent(land.parcelId)}`)} className="text-green-600 hover:text-green-700">View Details</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* All Lands Tab */}
        {activeTab === 'all' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parcel ID</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Area</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th></tr></thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredLands.map((land) => (
                    <tr key={land.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{land.parcelId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{land.owner?.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{land.location}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{land.area} sq ft</td>
                      <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(land.status)}`}>{land.status}</span></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(land.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap"><button onClick={() => navigate(`/land/${encodeURIComponent(land.parcelId)}`)} className="text-green-600 hover:text-green-700">View Details</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredLands.length === 0 && <div className="px-6 py-12 text-center"><p className="text-gray-500">No lands match your search criteria.</p></div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default OfficerDashboard;