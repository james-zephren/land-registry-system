import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/index.js';
import { TitleDeed } from '../components/TitleDeed';

export const LandDetailsPage: React.FC = () => {
  const { parcelId } = useParams<{ parcelId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [land, setLand] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [transferEmail, setTransferEmail] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [showTitleDeed, setShowTitleDeed] = useState(false);

  useEffect(() => {
    if (parcelId) {
      // Decode the parcelId from URL
      const decodedParcelId = decodeURIComponent(parcelId);
      console.log('Loading land with parcelId:', decodedParcelId);
      loadLandDetails(decodedParcelId);
    }
  }, [parcelId]);

  const loadLandDetails = async (decodedParcelId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('accessToken');
      // Encode again for API call
      const encodedParcelId = encodeURIComponent(decodedParcelId);
      
      const response = await fetch(`http://localhost:5000/api/lands/parcel/${encodedParcelId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load land');
      }
      
      setLand(data.data);
    } catch (err: any) {
      console.error('Error loading land:', err);
      setError(err.message || 'Failed to load land details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    try {
      setVerifying(true);
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
      
      if (!response.ok) {
        throw new Error(result.error || 'Verification failed');
      }
      
      const verification = result.data;
      
      if (verification) {
        setVerificationResult({
          isValid: verification.isValid,
          message: verification.isValid 
            ? '✓ Land record matches blockchain records'
            : '⚠️ WARNING: Land record has been tampered with!',
          storedHash: verification.storedHash,
          currentHash: verification.currentHash,
          blockchainAvailable: true
        });
      }
      
      // Refresh land data to update status
      await loadLandDetails(land.parcelId);
      
    } catch (err: any) {
      console.error('Verification error:', err);
      alert(err.message || 'Failed to verify land');
    } finally {
      setVerifying(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferEmail.trim()) {
      alert('Please enter recipient email');
      return;
    }

    try {
      setTransferring(true);
      const token = localStorage.getItem('accessToken');
      
      const userResponse = await fetch(`http://localhost:5000/api/users/by-email/${encodeURIComponent(transferEmail)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const userResult = await userResponse.json();

      if (!userResponse.ok || !userResult.success) {
        alert(`Recipient not found: ${transferEmail}`);
        return;
      }

      const transferResponse = await fetch(`http://localhost:5000/api/transfers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ landId: land.id, toOwnerId: userResult.data.id })
      });
      
      const transferData = await transferResponse.json();
      
      if (!transferResponse.ok) {
        throw new Error(transferData.error || 'Transfer failed');
      }
      
      alert('Transfer request submitted! Waiting for officer approval.');
      setShowTransferForm(false);
      setTransferEmail('');
    } catch (err: any) {
      console.error('Transfer error:', err);
      alert(err.message || 'Failed to initiate transfer');
    } finally {
      setTransferring(false);
    }
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

  const canTransfer = () => {
    return user?.role === 'CITIZEN' && 
           land?.owner?.id === user?.id && 
           (land?.status === 'VERIFIED' || land?.status === 'APPROVED');
  };

  const canVerify = () => {
    return user?.role === 'AUDITOR' || user?.role === 'ADMIN';
  };

  const canApprove = () => {
    return (user?.role === 'OFFICER' || user?.role === 'REGISTRAR' || user?.role === 'ADMIN') && land?.status === 'PENDING';
  };

  const canIssueTitleDeed = () => {
    // Only Registrar can issue title deeds for VERIFIED lands
    return user?.role === 'REGISTRAR' && land?.status === 'VERIFIED';
  };

  const handleApprove = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://localhost:5000/api/approvals/land/${land.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ comments: 'Approved' })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Approval failed');
      }
      
      alert(data.message);
      await loadLandDetails(land.parcelId);
    } catch (err: any) {
      console.error('Approval error:', err);
      alert(err.message || 'Failed to approve land');
    }
  };

  const getDashboardLink = () => {
    switch (user?.role) {
      case 'CITIZEN': return '/citizen';
      case 'OFFICER': return '/officer';
      case 'REGISTRAR': return '/officer';
      case 'SURVEYOR': return '/officer';
      case 'AUDITOR': return '/auditor';
      case 'ADMIN': return '/admin';
      default: return '/';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="mt-4 text-gray-600">Loading land details...</p>
        </div>
      </div>
    );
  }

  if (error || !land) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-xl p-8 text-center max-w-md">
          <svg className="mx-auto h-16 w-16 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Land Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The requested land parcel could not be found.'}</p>
          <button
            onClick={() => navigate(getDashboardLink())}
            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-2 rounded-lg hover:from-green-700 hover:to-emerald-700 transition"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

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
              <span className="text-2xl font-bold bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent">
                Ardhi Sasa
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Link to={getDashboardLink()} className="text-gray-600 hover:text-green-600 transition">
                Dashboard
              </Link>
              <Link to="/" className="text-gray-600 hover:text-green-600 transition">
                Home
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{land.parcelId}</h1>
          <p className="text-gray-600 mt-1">{land.location}</p>
          <p className="text-sm text-gray-500 mt-1">Status: {land.status}</p>
        </div>

        {verificationResult && (
          <div className={`mb-6 p-4 rounded-xl ${verificationResult.isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center">
              {verificationResult.isValid ? (
                <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              <div>
                <p className={`font-medium ${verificationResult.isValid ? 'text-green-700' : 'text-red-700'}`}>
                  {verificationResult.message}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Land Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-gray-500">Parcel ID</p><p className="font-medium">{land.parcelId}</p></div>
                <div><p className="text-sm text-gray-500">Status</p><span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(land.status)}`}>{land.status}</span></div>
                <div><p className="text-sm text-gray-500">Area</p><p className="font-medium">{land.area} sq ft</p></div>
                <div><p className="text-sm text-gray-500">Registered</p><p className="font-medium">{new Date(land.createdAt).toLocaleDateString()}</p></div>
                <div className="col-span-2"><p className="text-sm text-gray-500">Location</p><p className="font-medium">{land.location}</p></div>
              </div>
            </div>

            {land.approvals && land.approvals.length > 0 && (
             <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Approvals</h2>
                 <div className="space-y-3">
                   {land.approvals.map((approval: any) => (
                     <div key={approval.id} className="flex justify-between items-center py-2 border-b">
                        <div>
                         <p className="font-medium">{approval.officer?.name || 'Officer'}</p>
                         <p className="text-xs text-gray-500">{new Date(approval.createdAt).toLocaleString()}</p>
                    {approval.status === 'REJECTED' && approval.comments && (
                                        <p className="text-xs text-red-600 mt-1">Reason: {approval.comments}</p>
                           )}
                 </div>
                      <span className={`px-2 py-1 rounded text-xs ${approval.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                     {approval.status}
                      </span>
                   </div>
                  ))}
                </div>
             </div>
           )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Owner Information</h2>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
                  <span className="text-green-700 font-bold text-lg">{land.owner?.name?.charAt(0) || '?'}</span>
                </div>
                <div><p className="font-medium">{land.owner?.name || 'Unknown'}</p><p className="text-sm text-gray-500">{land.owner?.email}</p></div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Actions</h2>
              <div className="space-y-3">
                {canVerify() && (
                  <button onClick={handleVerify} disabled={verifying} className="w-full py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition disabled:opacity-50">
                    {verifying ? 'Verifying...' : '✓ Verify Blockchain Integrity'}
                  </button>
                )}
                
                {canApprove() && (
                  <button onClick={handleApprove} className="w-full py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition">
                    ✓ Approve Land
                  </button>
                )}
                
                {canTransfer() && (
                  <button onClick={() => setShowTransferForm(!showTransferForm)} className="w-full py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition">
                    {showTransferForm ? 'Cancel Transfer' : '↺ Request Transfer'}
                  </button>
                )}

                {canIssueTitleDeed() && (
                  <button
                    onClick={() => setShowTitleDeed(true)}
                    className="w-full py-2 bg-gradient-to-r from-amber-600 to-yellow-600 text-white rounded-lg hover:from-amber-700 hover:to-yellow-700 transition flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Issue Title Deed
                  </button>
                )}

                <button onClick={() => window.print()} className="w-full py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
                  🖨️ Print Certificate
                </button>
              </div>

              {showTransferForm && (
                <form onSubmit={handleTransfer} className="mt-4 pt-4 border-t">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Email</label>
                  <input type="email" value={transferEmail} onChange={(e) => setTransferEmail(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500" placeholder="newowner@example.com" required />
                  <button type="submit" disabled={transferring} className="w-full mt-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg disabled:opacity-50">
                    {transferring ? 'Submitting...' : 'Submit Transfer Request'}
                  </button>
                </form>
              )}
            </div>

            {land.blockchainHash && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Blockchain Record</h2>
                <p className="text-xs text-gray-500 mb-1">Transaction Hash</p>
                <p className="font-mono text-xs text-gray-600 break-all">{land.blockchainHash}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Title Deed Modal */}
      {showTitleDeed && (
        <TitleDeed
          land={land}
          onClose={() => setShowTitleDeed(false)}
        />
      )}
    </div>
  );
};