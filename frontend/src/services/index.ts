import apiClient from './api.js';

export const authService = {
  register: async (data: {
    email: string;
    password: string;
    name: string;
    walletAddress?: string;
  }) => {
    const response = await apiClient.post('/auth/register', data);
    // Your backend returns data directly, not wrapped in a data property
    return {
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
      user: response.data.user,
    };
  },

  login: async (data: { email: string; password: string }) => {
    const response = await apiClient.post('/auth/login', data);
    // Your backend returns data directly, not wrapped in a data property
    return {
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
      user: response.data.user,
    };
  },

  getProfile: async () => {
    const response = await apiClient.get('/auth/profile');
    // Your backend returns user data directly
    return response.data.user || response.data;
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },
};
export const landService = {
  register: async (data: {
    parcelId: string;
    location: string;
    area: number;
    documentHash?: string;
  }) => {
    const response = await apiClient.post('/lands/register', data);
    // Handle both response formats
    return response.data.data || response.data;
  },

  getLand: async (parcelId: string) => {
    const response = await apiClient.get(`/lands/parcel/${parcelId}`);
    return response.data.data || response.data;
  },

  getUserLands: async () => {
    const response = await apiClient.get('/lands/user/my-lands');
    const data = response.data.data || response.data;
    return Array.isArray(data) ? data : [];
  },

  getAllLands: async (skip = 0, take = 50) => {
    const response = await apiClient.get('/lands', { params: { skip, take } });
    const data = response.data.data || response.data;
    return Array.isArray(data) ? data : [];
  },

  verify: async (parcelId: string, currentDataHash: string) => {
    const response = await apiClient.post('/lands/verify', {
      parcelId,
      currentDataHash,
    });
    return response.data.data || response.data;
  },

  getStats: async () => {
    const response = await apiClient.get('/lands/stats/overview');
    return response.data.data || response.data;
  },
};

export const approvalService = {
  getPending: async () => {
    const response = await apiClient.get('/approvals/pending');
    return response.data.data || response.data;
  },

  approveLand: async (landId: string, comments?: string) => {
    const response = await apiClient.post(`/approvals/land/${landId}/approve`, { comments });
    return response.data.data || response.data;
  },

  rejectLand: async (landId: string, comments: string) => {
    const response = await apiClient.post(`/approvals/land/${landId}/reject`, { comments });
    return response.data.data || response.data;
  },

  
};

export const transferService = {
  initiate: async (data: { landId: string; toOwnerId: string }) => {
    const response = await apiClient.post('/transfers', data);
    return response.data.data || response.data;
  },

  approve: async (transferId: string) => {
    const response = await apiClient.post(`/transfers/${transferId}/approve`);
    return response.data.data || response.data;
  },

  reject: async (transferId: string, reason: string) => {
    const response = await apiClient.post(`/transfers/${transferId}/reject`, { reason });
    return response.data.data || response.data;
  },

  getUserTransfers: async () => {
    const response = await apiClient.get('/transfers/my-transfers');
    const data = response.data.data || response.data;
    return Array.isArray(data) ? data : [];
  },

  getPendingApprovals: async () => {
    const response = await apiClient.get('/transfers/pending');
    const data = response.data.data || response.data;
    return Array.isArray(data) ? data : [];
  },

  getById: async (transferId: string) => {
    const response = await apiClient.get(`/transfers/${transferId}`);
    return response.data.data || response.data;
  }
};

export const logService = {
  // Get all logs with pagination
  getAll: async (skip = 0, take = 50) => {
    const response = await apiClient.get('/logs', { params: { skip, take } });
    const data = response.data.data || response.data;
    return Array.isArray(data) ? data : [];
  },

  // Get tamper detection logs
  getTamperLogs: async () => {
    const response = await apiClient.get('/logs/tamper/detected');
    const data = response.data.data || response.data;
    return Array.isArray(data) ? data : [];
  },

  // Get audit trail for a specific land
  getLandTrail: async (landId: string) => {
    const response = await apiClient.get(`/logs/land/${landId}`);
    const data = response.data.data || response.data;
    return Array.isArray(data) ? data : [];
  },

  // Get report for date range
  getReport: async (startDate?: string, endDate?: string) => {
    const response = await apiClient.get('/logs/report', {
      params: { startDate, endDate },
    });
    return response.data.data || response.data;
  },

  // Get logs by user
  getUserLogs: async (userId: string) => {
    const response = await apiClient.get(`/logs/user/${userId}`);
    const data = response.data.data || response.data;
    return Array.isArray(data) ? data : [];
  },
};

export const userService = {
  // Get all users (Admin only)
  getAll: async () => {
    const response = await apiClient.get('/users');
    const data = response.data.data || response.data;
    return Array.isArray(data) ? data : [];
  },

  // Get all officers
  getOfficers: async () => {
    const response = await apiClient.get('/users/officers/all');
    const data = response.data.data || response.data;
    return Array.isArray(data) ? data : [];
  },

  // Toggle user active status
  toggleStatus: async (userId: string, isActive: boolean) => {
    const response = await apiClient.patch(`/users/${userId}/status`, { isActive });
    return response.data.data || response.data;
  },

  // Update user role (Admin only)
  updateRole: async (userId: string, role: string) => {
    const response = await apiClient.put(`/users/${userId}/role`, { role });
    return response.data.data || response.data;
  },

  // Get user by ID
  getById: async (userId: string) => {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data.data || response.data;
  },

  // Get current user profile
  getProfile: async () => {
    const response = await apiClient.get('/users/profile');
    return response.data.data || response.data;
  },

  // Update user profile
  updateProfile: async (data: { name?: string; walletAddress?: string }) => {
    const response = await apiClient.put('/users/profile', data);
    return response.data.data || response.data;
  },
};


// Export all services as a single object for convenience
export const services = {
  auth: authService,
  land: landService,
  approval: approvalService,
  transfer: transferService,
  log: logService,
  user: userService,
};