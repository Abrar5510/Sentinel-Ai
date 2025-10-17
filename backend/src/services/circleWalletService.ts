import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

export class CircleWalletService {
  private client: any;
  
  constructor() {
    this.client = initiateDeveloperControlledWalletsClient({
      apiKey: process.env.CIRCLE_API_KEY!,
      entitySecret: process.env.ENTITY_SECRET!
    });
  }
  
  async createUserWallet(userId: string) {
    const walletSet = await this.client.createWalletSet({
      name: `SentinelAI-${userId}`
    });
    
    const wallet = await this.client.createWallet({
      walletSetId: walletSet.data.walletSet.id,
      blockchains: ['ARQ-TESTNET'],
      count: 1
    });
    
    return {
      walletId: wallet.data.wallets[0].id,
      address: wallet.data.wallets[0].address
    };
  }
}

export const circleService = new CircleWalletService();