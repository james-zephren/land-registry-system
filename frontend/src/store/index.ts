import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
  role:string; 
  walletAddress?: string;
  isActive?: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;

  setUser: (user: User) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set: any) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: false,
  error: null,

  setUser: (user: User) => set({ user }),
  setTokens: (accessToken: string, refreshToken: string) =>
    set({ accessToken, refreshToken }),
  setLoading: (isLoading: boolean) => set({ isLoading }),
  setError: (error: string | null) => set({ error }),
  
  // FIXED: Clear localStorage on logout to prevent data mixing between users
  logout: () => {
    // Clear localStorage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    
    // Clear store state
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,
    });
  },
  
  loadFromStorage: () => {
    const user = localStorage.getItem('user');
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');

    if (user && accessToken && refreshToken) {
      set({
        user: JSON.parse(user),
        accessToken,
        refreshToken,
      });
    }
  },
}));

interface Land {
  id: string;
  parcelId: string;
  ownerId: string;
  location: string;
  area: number;
  status: string;
  dataHash: string;
  blockchainHash?: string;
  createdAt: string;
}

interface LandState {
  lands: Land[];
  selectedLand: Land | null;
  isLoading: boolean;
  error: string | null;

  setLands: (lands: Land[]) => void;
  setSelectedLand: (land: Land | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addLand: (land: Land) => void;
  updateLand: (land: Land) => void;
}

export const useLandStore = create<LandState>((set: any) => ({
  lands: [],
  selectedLand: null,
  isLoading: false,
  error: null,

  setLands: (lands: Land[]) => set({ lands }),
  setSelectedLand: (selectedLand: Land | null) => set({ selectedLand }),
  setLoading: (isLoading: boolean) => set({ isLoading }),
  setError: (error: string | null) => set({ error }),
  addLand: (land: Land) => set((state: any) => ({ lands: [...state.lands, land] })),
  updateLand: (land: Land) =>
    set((state: any) => ({
      lands: state.lands.map((l: Land) => (l.id === land.id ? land : l)),
    })),
}));

interface Transfer {
  id: string;
  landId: string;
  fromOwnerId: string;
  toOwnerId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  approvals: number;
  requiredApprovals: number;
}

interface TransferState {
  transfers: Transfer[];
  isLoading: boolean;
  error: string | null;

  setTransfers: (transfers: Transfer[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addTransfer: (transfer: Transfer) => void;
}

export const useTransferStore = create<TransferState>((set: any) => ({
  transfers: [],
  isLoading: false,
  error: null,

  setTransfers: (transfers: Transfer[]) => set({ transfers }),
  setLoading: (isLoading: boolean) => set({ isLoading }),
  setError: (error: string | null) => set({ error }),
  addTransfer: (transfer: Transfer) =>
    set((state: any) => ({ transfers: [...state.transfers, transfer] })),
}));