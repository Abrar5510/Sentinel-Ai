import axios from 'axios';

export class PriceOracleService {
  async getTokenPrice(tokenSymbol: string): Promise<number> {
    const coinMap: { [key: string]: string } = {
      'aave': 'aave',
      'gmx': 'gmx',
      'rdnt': 'radiant-capital'
    };
    
    const coinId = coinMap[tokenSymbol.toLowerCase()];
    if (!coinId) return 0;
    
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price',
      { params: { ids: coinId, vs_currencies: 'usd' } }
    );
    
    return response.data[coinId]?.usd || 0;
  }
}

export const priceOracleService = new PriceOracleService();