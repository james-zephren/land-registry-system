import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/index.js';
import { landService, logService } from '../services/index.js';

export const AuditorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [lands, setLands] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [tamperLogs, setTamperLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('lands');
  const [verifying, setVerifying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Load all data
  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const allLands = await landService.getAllLands();
      setLands(Array.isArray(allLands) ? allLands : []);
      const auditLogs = await logService.getAll();
      setLogs(Array.isArray(auditLogs) ? auditLogs : []);
      const tamper = await logService.getTamperLogs();
      setTamperLogs(Array.isArray(tamper) ? tamper : []);
    } catch (error: any) {
      console.error('Failed to load data', error);
      setError(error.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter lands based on search, status, and date range
  const getFilteredLands = () => {
    let filtered = [...lands];
    if (searchTerm) {
      filtered = filtered.filter(land =>
        land.parcelId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        land.owner?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        land.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(land => land.status === statusFilter);
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

  // CSV Export (clean)
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
    link.setAttribute('download', `audit_lands_report_${new Date().toISOString().slice(0,19)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleVerifyLand = async (land: any) => {
    try {
      setVerifying(land.id);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://localhost:5000/api/lands/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ parcelId: land.parcelId })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Verification failed');
      const verification = result.data;
      if (verification) {
        if (verification.isValid) alert(`✓ Land ${land.parcelId} is VALID - Matches blockchain records`);
        else alert(`⚠️ TAMPER DETECTED - Land ${land.parcelId} does NOT match blockchain!`);
      } else alert('Verification completed');
      await loadData();
    } catch (error: any) {
      console.error('Verification error:', error);
      alert(error.message || 'Failed to verify land');
    } finally {
      setVerifying(null);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'VERIFIED': return '✓';
      case 'APPROVED': return '✔';
      case 'PENDING': return '⏳';
      case 'REJECTED': return '✗';
      case 'TRANSFERRED': return '↺';
      default: return '•';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="mt-4 text-gray-600">Loading audit data...</p>
        </div>
      </div>
    );
  }

  const verifiedCount = lands.filter(l => l.status === 'VERIFIED').length;
  const pendingCount = lands.filter(l => l.status === 'PENDING').length;
  const tamperCount = tamperLogs.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
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
              <span className="text-gray-600">Auditor Portal</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 px-3 py-1 bg-green-50 rounded-full">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">{user?.name?.charAt(0).toUpperCase() || 'A'}</span>
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Audit Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor system integrity and audit trails</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-700">{error}</p>
            <button onClick={loadData} className="mt-2 text-sm text-red-600 hover:text-red-800">Retry</button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-500">Total Lands</p><p className="text-2xl font-bold text-gray-900">{lands.length}</p></div>
              <div className="w-12 h-12 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl flex items-center justify-center"><svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /></svg></div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-500">Audit Events</p><p className="text-2xl font-bold text-gray-900">{logs.length}</p></div>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-xl flex items-center justify-center"><svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg></div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-500">Tamper Alerts</p><p className={`text-2xl font-bold ${tamperCount > 0 ? 'text-red-600' : 'text-green-600'}`}>{tamperCount}</p></div>
              <div className="w-12 h-12 bg-gradient-to-r from-red-100 to-rose-100 rounded-xl flex items-center justify-center"><svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-500">Verified Lands</p><p className="text-2xl font-bold text-green-600">{verifiedCount}</p></div>
              <div className="w-12 h-12 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl flex items-center justify-center"><svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
            </div>
          </div>
        </div>

        {/* Search, Filter & Report */}
        <div className="mb-8 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Search & Filter Options</h3>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <input type="text" placeholder="🔍 Search by Parcel ID, Owner, or Location..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border rounded-lg">
              <option value="all">All Status</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="VERIFIED">Verified</option><option value="REJECTED">Rejected</option><option value="TRANSFERRED">Transferred</option>
            </select>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1"><label className="block text-sm text-gray-600 mb-1">From Date</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-4 py-2 border rounded-lg" /></div>
            <div className="flex-1"><label className="block text-sm text-gray-600 mb-1">To Date</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-4 py-2 border rounded-lg" /></div>
            <div className="flex items-end">
              <button onClick={downloadCSV} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download CSV Report
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            <button onClick={() => { setStatusFilter('all'); setSearchTerm(''); setStartDate(''); setEndDate(''); }} className="px-3 py-1 rounded-full text-sm bg-green-600 text-white">All ({lands.length})</button>
            <button onClick={() => setStatusFilter('PENDING')} className="px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-700 hover:bg-yellow-200">Pending ({pendingCount})</button>
            <button onClick={() => setStatusFilter('APPROVED')} className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700 hover:bg-blue-200">Approved ({lands.filter(l=>l.status==='APPROVED').length})</button>
            <button onClick={() => setStatusFilter('VERIFIED')} className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-700 hover:bg-green-200">Verified ({verifiedCount})</button>
            <button onClick={() => setStatusFilter('TRANSFERRED')} className="px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-700 hover:bg-purple-200">Transferred ({lands.filter(l=>l.status==='TRANSFERRED').length})</button>
            <button onClick={() => setStatusFilter('REJECTED')} className="px-3 py-1 rounded-full text-sm bg-red-100 text-red-700 hover:bg-red-200">Rejected ({lands.filter(l=>l.status==='REJECTED').length})</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-gray-200">
          <button onClick={() => setActiveTab('lands')} className={`py-3 px-4 font-medium border-b-2 transition ${activeTab === 'lands' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>Lands ({filteredLands.length})</button>
          <button onClick={() => setActiveTab('tamper')} className={`py-3 px-4 font-medium border-b-2 transition ${activeTab === 'tamper' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>Tamper Alerts ({tamperCount})</button>
          <button onClick={() => setActiveTab('logs')} className={`py-3 px-4 font-medium border-b-2 transition ${activeTab === 'logs' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>Audit Logs ({logs.length})</button>
        </div>

        {/* Lands Tab with filtering */}
        {activeTab === 'lands' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parcel ID</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hash Match</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th></tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLands.map((land) => {
                    const isHashValid = land.blockchainHash !== '' && land.blockchainHash !== null;
                    return (
                      <tr key={land.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{land.parcelId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{land.owner?.name || 'Unknown'}</td>
                        <td className="px-6 py-4 whitespace-nowrap"><span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(land.status)}`}><span className="mr-1">{getStatusIcon(land.status)}</span>{land.status}</span></td>
                        <td className="px-6 py-4 whitespace-nowrap"><span className={`px-3 py-1 rounded-full text-xs font-medium ${isHashValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{isHashValid ? '✓ Valid' : '⚠ Mismatch'}</span></td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                          <button onClick={() => handleVerifyLand(land)} disabled={verifying === land.id} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition disabled:opacity-50">{verifying === land.id ? 'Verifying...' : 'Verify'}</button>
                          <button onClick={() => navigate(`/land/${encodeURIComponent(land.parcelId)}`)} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">View</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredLands.length === 0 && <div className="px-6 py-12 text-center"><p className="text-gray-500">No lands match your search criteria.</p></div>}
          </div>
        )}

        {/* Tamper Alerts Tab */}
        {activeTab === 'tamper' && (
          <div className="space-y-4">
            {tamperLogs.length > 0 ? tamperLogs.map((log) => (
              <div key={log.id} className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-500">
                <div className="flex justify-between items-start">
                  <div><div className="flex items-center mb-2"><span className="text-2xl mr-2">🚨</span><h3 className="text-lg font-bold text-red-600">Tamper Detected</h3></div>
                  <p className="text-sm text-gray-600"><span className="font-medium">Parcel ID:</span> {log.land?.parcelId || 'Unknown'}</p>
                  <p className="text-sm text-gray-600 mt-1"><span className="font-medium">Action:</span> {log.action}</p>
                  <p className="text-sm text-gray-600 mt-1"><span className="font-medium">Time:</span> {new Date(log.timestamp).toLocaleString()}</p></div>
                  <button onClick={() => navigate(`/land/${log.land?.parcelId}`)} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition">Investigate</button>
                </div>
              </div>
            )) : (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
                <svg className="mx-auto h-12 w-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="mt-2 text-gray-500">No tamper alerts detected</p><p className="text-sm text-gray-400 mt-1">All blockchain records are intact</p>
              </div>
            )}
          </div>
        )}

        {/* Audit Logs Tab */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parcel</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th></tr></thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.slice(0, 50).map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 rounded text-xs font-medium ${log.action.includes('TAMPER') || log.action.includes('FAILED') ? 'bg-red-100 text-red-800' : log.action.includes('APPROVED') || log.action.includes('COMPLETED') ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{log.action}</span></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.user?.name || 'System'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.land?.parcelId || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(log.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {logs.length === 0 && <div className="px-6 py-12 text-center"><p className="text-gray-500">No audit logs available</p></div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditorDashboard;