import { ethers } from 'ethers';

export class BlockchainService {
  private provider: ethers.Provider;
  
  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.ARC_RPC_URL);
  }
  
  async getWalletBalance(address: string): Promise<number> {
    const usdcAbi = ['function balanceOf(address) view returns (uint256)'];
    const usdc = new ethers.Contract(
      process.env.USDC_TOKEN_ADDRESS!,
      usdcAbi,
      this.provider
    );
    
    const balance = await usdc.balanceOf(address);
    return parseFloat(ethers.formatUnits(balance, 6));
  }
}

export const blockchainService = new BlockchainService();