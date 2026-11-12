import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const CONTRACT_ABI = [
  "function registerLand(string memory parcelId, address owner, string memory location, uint256 area, string memory documentHash, string memory dataHash) external",
  "function approveLand(string memory parcelId) external",
  "function verifyLand(string memory parcelId, string memory currentDataHash) external view returns (bool)",
  "function initiateTransfer(string memory parcelId, address oldOwner, address newOwner) external returns (uint256)",
  "function approveTransfer(string memory parcelId, uint256 transferId) external",
  "function getLand(string memory parcelId) external view returns (tuple(string parcelId, address owner, string location, uint256 area, string documentHash, string dataHash, uint8 status, uint256 registeredAt, uint256 lastUpdatedAt))",
  "function getLandByOwner(address owner) external view returns (tuple(string parcelId, address owner, string location, uint256 area, string documentHash, string dataHash, uint8 status, uint256 registeredAt, uint256 lastUpdatedAt)[])",
  "function getAllLands() external view returns (tuple(string parcelId, address owner, string location, uint256 area, string documentHash, string dataHash, uint8 status, uint256 registeredAt, uint256 lastUpdatedAt)[])",
  "function getTransfers(string memory parcelId) external view",
  "function verifyDataIntegrity(string memory parcelId, string memory currentDataHash) external view returns (bool)",
  "function updateLandDataHash(string memory parcelId, string memory newDataHash) external",
  "event LandRegistered(string indexed parcelId, address indexed owner, string dataHash, uint256 timestamp)",
  "event LandApproved(string indexed parcelId, address indexed approver, uint256 timestamp)",
  "event TransferInitiated(uint256 indexed transferId, string indexed parcelId, address indexed fromOwner, address toOwner, uint256 timestamp)",
  "event TransferApproved(uint256 indexed transferId, string indexed parcelId, address indexed approver, uint256 timestamp)",
  "event TransferCompleted(uint256 indexed transferId, string indexed parcelId, address indexed newOwner, string dataHash, uint256 timestamp)",
];

class BlockchainService {
  private provider: ethers.providers.JsonRpcProvider;
  private signer: ethers.Signer | null = null;
  private contract: ethers.Contract | null = null;

  constructor() {
    const rpcUrl = process.env.GANACHE_RPC_URL || 'http://127.0.0.1:7545';
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  }

  async initialize() {
    try {
      if (process.env.ADMIN_WALLET_PRIVATE_KEY) {
        this.signer = new ethers.Wallet(
          process.env.ADMIN_WALLET_PRIVATE_KEY,
          this.provider
        );
      }

      if (process.env.LAND_REGISTRY_CONTRACT_ADDRESS && this.signer) {
        this.contract = new ethers.Contract(
          process.env.LAND_REGISTRY_CONTRACT_ADDRESS,
          CONTRACT_ABI,
          this.signer
        );
      }

      const blockNumber = await this.provider.getBlockNumber();
      console.log(`Connected to blockchain. Current block: ${blockNumber}`);
    } catch (error) {
      console.error('Failed to initialize blockchain service:', error);
      throw error;
    }
  }

  async registerLand(
    parcelId: string,
    ownerAddress: string,
    location: string,
    area: number,
    documentHash: string,
    dataHash: string
  ): Promise<string> {
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      const tx = await this.contract.registerLand(
        parcelId,
        ownerAddress,
        location,
        ethers.utils.parseEther(area.toString()),
        documentHash,
        dataHash
      );

      const receipt = await tx.wait();
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error registering land:', error);
      throw error;
    }
  }

  async approveLand(parcelId: string): Promise<string> {
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      const tx = await this.contract.approveLand(parcelId);
      const receipt = await tx.wait();
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error approving land:', error);
      throw error;
    }
  }

  async verifyLand(parcelId: string, dataHash: string): Promise<boolean> {
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      return await this.contract.verifyLand(parcelId, dataHash);
    } catch (error) {
      console.error('Error verifying land:', error);
      throw error;
    }
  }

  async verifyDataIntegrity(parcelId: string, dataHash: string): Promise<boolean> {
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      return await this.contract.verifyDataIntegrity(parcelId, dataHash);
    } catch (error) {
      console.error('Error verifying data integrity:', error);
      return false;
    }
  }

  async initiateTransfer(
    parcelId: string,
    fromOwner: string,
    toOwner: string
  ): Promise<string> {
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      const tx = await this.contract.initiateTransfer(parcelId, fromOwner, toOwner);
      const receipt = await tx.wait();
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error initiating transfer:', error);
      throw error;
    }
  }

  async approveTransfer(parcelId: string, transferId: number): Promise<string> {
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      const tx = await this.contract.approveTransfer(parcelId, transferId);
      const receipt = await tx.wait();
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error approving transfer:', error);
      throw error;
    }
  }

  async getLand(parcelId: string): Promise<any> {
    if (!this.contract) throw new Error('Contract not initialized');

    try {
      return await this.contract.getLand(parcelId);
    } catch (error) {
      console.error('Error fetching land:', error);
      throw error;
    }
  }

  async getNetworkInfo(): Promise<{ chainId: number; blockNumber: number }> {
    try {
      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();
      return {
        chainId: network.chainId,
        blockNumber,
      };
    } catch (error) {
      console.error('Error fetching network info:', error);
      throw error;
    }
  }
}

export default new BlockchainService();
