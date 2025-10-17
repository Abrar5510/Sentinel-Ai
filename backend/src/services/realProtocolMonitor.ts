import { defiLlamaService } from './defiLlamaService';
import { socialSentimentService } from './socialSentimentService';
import { priceOracleService } from './priceOracleService';
import axios from 'axios';

export class RealProtocolMonitor {
  async getHealthScore(
    protocolAddress: string,
    protocolSlug: string,
    tokenSymbol?: string
  ) {
    const tvlData = await defiLlamaService.getProtocolTVL(protocolSlug);
    const sentiment = await socialSentimentService.getSentiment(protocolSlug);
    
    let tokenPrice = 1;
    if (tokenSymbol) {
      tokenPrice = await priceOracleService.getTokenPrice(tokenSymbol);
    }
    
    // Call ML service
    const response = await axios.post('http://localhost:8000/predict', {
      signals: {
        tvl: tvlData?.tvl || 0,
        tvlChange24h: tvlData?.tvlChange24h || 0,
        whaleActivity: 0,
        liquidationRisk: 0,
        priceVolatility: 0,
        socialSentiment: sentiment,
        codeActivity: 50
      }
    });
    
    return response.data;
  }
}

export const realProtocolMonitor = new RealProtocolMonitor();