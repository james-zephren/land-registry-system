import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const contractABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "parcelId", "type": "string" },
      { "internalType": "string", "name": "dataHash", "type": "string" }
    ],
    "name": "storeHash",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "parcelId", "type": "string" }
    ],
    "name": "getHash",
    "outputs": [
      { "internalType": "string", "name": "", "type": "string" }  // Change from bytes32 to string
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

export class BlockchainService {
  private provider: ethers.providers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract | null;
  private contractAddress: string;

  constructor() {
    const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://localhost:7545';
    this.contractAddress = process.env.BLOCKCHAIN_CONTRACT_ADDRESS || '';
    
    console.log(`🔗 Connecting to blockchain at: ${rpcUrl}`);
    
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    
    const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY || 
      '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d';
    
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    
    if (this.contractAddress) {
      this.contract = new ethers.Contract(this.contractAddress, contractABI, this.wallet);
      console.log(`📄 Contract address: ${this.contractAddress}`);
      console.log(`👛 Wallet address: ${this.wallet.address}`);
    } else {
      this.contract = null;
      console.log(`⚠️ No contract address configured. Blockchain features disabled.`);
    }
  }

  async storeLandHash(parcelId: string, dataHash: string): Promise<{ txHash: string; blockNumber: number }> {
    if (!this.contract) {
      throw new Error('Contract not configured. Set BLOCKCHAIN_CONTRACT_ADDRESS in .env');
    }
    
    try {
      console.log(`📝 Storing hash for land ${parcelId}: ${dataHash.substring(0, 30)}...`);
      
      const tx = await this.contract.storeHash(parcelId, dataHash, {
        gasLimit: 500000,
        gasPrice: ethers.utils.parseUnits('20', 'gwei')
      });
      
      console.log(`⏳ Transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();
      
      console.log(`✅ Hash stored successfully. Block: ${receipt.blockNumber}`);
      
      return {
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber
      };
    } catch (error: any) {
      console.error('❌ Blockchain storage error:', error.message);
      throw new Error(`Blockchain transaction failed: ${error.message}`);
    }
  }

  async getLandHash(parcelId: string): Promise<string> {
  if (!this.contract) {
    return '0x0000000000000000000000000000000000000000000000000000000000000000';
  }
  
  try {
    // This now returns a string, not bytes32
    const hash = await this.contract.getHash(parcelId);
    console.log(`📦 Retrieved hash for ${parcelId}: ${hash}`);
    return hash;
  } catch (error: any) {
    console.error('Error getting hash:', error.message);
    return '0x0000000000000000000000000000000000000000000000000000000000000000';
  }
}

  async isConnected(): Promise<boolean> {
    try {
      const blockNumber = await this.provider.getBlockNumber();
      if (this.contractAddress && this.contract) {
        const code = await this.provider.getCode(this.contractAddress);
        return code !== '0x' && code !== '0x0' && blockNumber > 0;
      }
      return blockNumber > 0;
    } catch {
      return false;
    }
  }

  getProvider(): ethers.providers.JsonRpcProvider {
    return this.provider;
  }
}

export default new BlockchainService();