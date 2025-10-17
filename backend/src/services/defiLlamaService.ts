import axios from 'axios';

export class DefiLlamaService {
  async getProtocolTVL(protocolSlug: string) {
    const response = await axios.get(
      `https://api.llama.fi/protocol/${protocolSlug}`
    );
    const data = response.data;
    const currentTvl = data.currentChainTvls?.['Arbitrum'] || data.tvl || 0;
    
    return {
      name: data.name,
      tvl: currentTvl,
      tvlChange24h: 0
    };
  }
}

export const defiLlamaService = new DefiLlamaService();