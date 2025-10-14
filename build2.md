# 🛡️ SentinelAI - Complete Build Guide (Real Data)

## 📋 Complete File Structure

```
sentinelai/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── protocols.ts
│   │   ├── db/
│   │   │   ├── init.ts
│   │   │   └── client.ts
│   │   ├── routes/
│   │   │   ├── monitoring.ts
│   │   │   ├── wallets.ts
│   │   │   ├── voice.ts
│   │   │   └── realData.ts
│   │   ├── services/
│   │   │   ├── blockchainService.ts
│   │   │   ├── circleWalletService.ts
│   │   │   ├── defiLlamaService.ts
│   │   │   ├── elevenLabsService.ts
│   │   │   ├── priceOracleService.ts
│   │   │   ├── socialSentimentService.ts
│   │   │   └── realProtocolMonitor.ts
│   │   ├── scripts/
│   │   │   └── testRealData.ts
│   │   └── index.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
├── ml-service/
│   ├── main.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

-----

## 🚀 Step 1: Backend Setup

### backend/package.json

```json
{
  "name": "sentinelai-backend",
  "version": "1.0.0",
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@circle-fin/developer-controlled-wallets": "^1.0.0",
    "axios": "^1.6.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "elevenlabs": "^0.8.0",
    "ethers": "^6.9.0",
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "redis": "^4.6.0",
    "ws": "^8.16.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "@types/pg": "^8.10.9",
    "@types/ws": "^8.5.10",
    "nodemon": "^3.0.2",
    "ts-node": "^10.9.2",
    "typescript": "^5.3.3"
  }
}
```

### backend/tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### backend/.env

```bash
# Circle API
CIRCLE_API_KEY=your_circle_api_key_here
ENTITY_SECRET=your_entity_secret_here

# ElevenLabs
ELEVENLABS_API_KEY=your_elevenlabs_key_here
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

# Blockchain (Arbitrum)
ARC_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
USDC_TOKEN_ADDRESS=0xaf88d065e77c8cC2239327C5EDb3A432268e5831

# External APIs (Optional)
NEWS_API_KEY=your_news_api_key_here
COINGECKO_API_KEY=

# Database
DATABASE_URL=postgresql://localhost:5432/sentinelai
REDIS_URL=redis://localhost:6379

# Server
PORT=3000
NODE_ENV=development
ML_SERVICE_URL=http://localhost:8000
```

-----

## 📁 Step 2: Core Files

### backend/src/config/protocols.ts

```typescript
export interface ProtocolConfig {
  name: string;
  slug: string;
  address: string;
  tokenSymbol?: string;
  category: 'lending' | 'dex' | 'yield' | 'derivatives';
  riskLevel: 'low' | 'medium' | 'high';
}

export const SUPPORTED_PROTOCOLS: ProtocolConfig[] = [
  {
    name: 'Aave V3',
    slug: 'aave',
    address: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    tokenSymbol: 'aave',
    category: 'lending',
    riskLevel: 'low'
  },
  {
    name: 'GMX',
    slug: 'gmx',
    address: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a',
    tokenSymbol: 'gmx',
    category: 'derivatives',
    riskLevel: 'medium'
  },
  {
    name: 'Radiant',
    slug: 'radiant',
    address: '0xF4B1486DD74D07706052A33d31d7c0AAFD0659E1',
    tokenSymbol: 'rdnt',
    category: 'lending',
    riskLevel: 'medium'
  }
];

export function getProtocolBySlug(slug: string): ProtocolConfig | undefined {
  return SUPPORTED_PROTOCOLS.find(p => p.slug === slug);
}
```

### backend/src/db/client.ts

```typescript
import { Pool } from 'pg';

export const db = new Pool({
  connectionString: process.env.DATABASE_URL
});
```

### backend/src/db/init.ts

```typescript
import { db } from './client';

export async function initializeDatabase() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      circle_wallet_id TEXT,
      wallet_address TEXT,
      phone_number TEXT,
      risk_tolerance TEXT DEFAULT 'moderate',
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS positions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      protocol_address TEXT NOT NULL,
      protocol_name TEXT NOT NULL,
      amount DECIMAL(20,6) NOT NULL,
      last_health_score INTEGER DEFAULT 100,
      last_alert_audio TEXT,
      last_updated TIMESTAMP DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS protocol_health (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      protocol_address TEXT NOT NULL,
      health_score INTEGER NOT NULL,
      confidence INTEGER NOT NULL,
      trend TEXT NOT NULL,
      risk_factors JSONB,
      timestamp TIMESTAMP DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS rebalancing_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      from_protocol TEXT NOT NULL,
      amount_exited DECIMAL(20,6) NOT NULL,
      reason TEXT,
      tx_hash TEXT,
      executed_at TIMESTAMP DEFAULT NOW()
    );
  `);
}
```

-----

## 🔧 Step 3: Services

### backend/src/services/blockchainService.ts

```typescript
import { ethers } from 'ethers';

export class BlockchainService {
  private provider: ethers.Provider;
  private usdcContract: ethers.Contract;
  
  constructor() {
    this.provider = new ethers.JsonRpcProvider(
      process.env.ARC_RPC_URL || 'https://arb1.arbitrum.io/rpc'
    );
    
    const usdcAbi = [
      'function balanceOf(address owner) view returns (uint256)',
      'function decimals() view returns (uint8)'
    ];
    
    this.usdcContract = new ethers.Contract(
      process.env.USDC_TOKEN_ADDRESS!,
      usdcAbi,
      this.provider
    );
  }
  
  async getWalletBalance(address: string): Promise<number> {
    try {
      const balance = await this.usdcContract.balanceOf(address);
      return parseFloat(ethers.formatUnits(balance, 6));
    } catch (error) {
      console.error('Error getting balance:', error);
      return 0;
    }
  }
  
  async detectWhaleMovements(
    protocolAddress: string,
    threshold: number = 100000
  ): Promise<{ count: number; totalAmount: number }> {
    try {
      const latestBlock = await this.provider.getBlockNumber();
      const fromBlock = latestBlock - 1000;
      
      const logs = await this.provider.getLogs({
        fromBlock,
        toBlock: 'latest',
        address: this.usdcContract.target as string,
        topics: [ethers.id('Transfer(address,address,uint256)')]
      });
      
      let whaleCount = 0;
      let totalAmount = 0;
      
      for (const log of logs) {
        const decoded = this.usdcContract.interface.parseLog({
          topics: log.topics as string[],
          data: log.data
        });
        
        if (!decoded) continue;
        
        const amount = parseFloat(ethers.formatUnits(decoded.args[2], 6));
        
        if (decoded.args[0].toLowerCase() === protocolAddress.toLowerCase() && 
            amount >= threshold) {
          whaleCount++;
          totalAmount += amount;
        }
      }
      
      return { count: whaleCount, totalAmount };
    } catch (error) {
      console.error('Error detecting whales:', error);
      return { count: 0, totalAmount: 0 };
    }
  }
}

export const blockchainService = new BlockchainService();
```

### backend/src/services/circleWalletService.ts

```typescript
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
  
  async executeEmergencyExit(
    walletId: string,
    fromProtocol: string,
    toAddress: string,
    amount: string
  ) {
    const tx = await this.client.createTransaction({
      walletId,
      blockchain: 'ARQ-TESTNET',
      tokenAddress: process.env.USDC_TOKEN_ADDRESS,
      destinationAddress: toAddress,
      amount,
      feeLevel: 'HIGH'
    });
    
    return tx.data;
  }
}

export const circleService = new CircleWalletService();
```

### backend/src/services/defiLlamaService.ts

```typescript
import axios from 'axios';

export class DefiLlamaService {
  private baseUrl = 'https://api.llama.fi';
  
  async getProtocolTVL(protocolSlug: string) {
    try {
      const response = await axios.get(`${this.baseUrl}/protocol/${protocolSlug}`);
      const data = response.data;
      
      const currentTvl = data.currentChainTvls?.['Arbitrum'] || data.tvl || 0;
      const chainTvls = data.chainTvls?.['Arbitrum'] || [];
      const yesterday = chainTvls[chainTvls.length - 1]?.totalLiquidityUSD || currentTvl;
      const weekAgo = chainTvls[chainTvls.length - 7]?.totalLiquidityUSD || currentTvl;
      
      return {
        name: data.name,
        tvl: currentTvl,
        tvlChange24h: ((currentTvl - yesterday) / yesterday) * 100,
        tvlChange7d: ((currentTvl - weekAgo) / weekAgo) * 100
      };
    } catch (error) {
      console.error('Error fetching TVL:', error);
      return null;
    }
  }
}

export const defiLlamaService = new DefiLlamaService();
```

### backend/src/services/elevenLabsService.ts

```typescript
import { ElevenLabsClient } from 'elevenlabs';
import * as fs from 'fs';
import * as path from 'path';

export class VoiceAlertService {
  private client: ElevenLabsClient;
  private voiceId: string;
  
  constructor() {
    this.client = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY!
    });
    this.voiceId = process.env.ELEVENLABS_VOICE_ID!;
  }
  
  async generateAlertAudio(
    alertType: 'warning' | 'critical' | 'emergency',
    protocolName: string,
    healthScore: number,
    riskFactors: string[]
  ): Promise<Buffer> {
    const urgencyMap = {
      warning: 'Attention required',
      critical: 'Critical alert',
      emergency: 'Emergency action needed'
    };
    
    let message = `${urgencyMap[alertType]}. `;
    message += `${protocolName} health score has dropped to ${healthScore} out of 100. `;
    
    if (riskFactors.length > 0) {
      message += `Key risk factors: ${riskFactors.slice(0, 3).join(', ')}. `;
    }
    
    if (alertType === 'emergency') {
      message += 'Sentinel AI is executing emergency exit to protect your funds.';
    }
    
    const audio = await this.client.generate({
      voice: this.voiceId,
      text: message,
      model_id: 'eleven_turbo_v2'
    });
    
    const chunks: Buffer[] = [];
    for await (const chunk of audio) {
      chunks.push(chunk);
    }
    
    return Buffer.concat(chunks);
  }
  
  async saveAudioFile(audioBuffer: Buffer, filename: string): Promise<string> {
    const audioDir = path.join(__dirname, '../../audio');
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }
    
    const filepath = path.join(audioDir, filename);
    fs.writeFileSync(filepath, audioBuffer);
    return filepath;
  }
}

export const voiceService = new VoiceAlertService();
```

### backend/src/services/priceOracleService.ts

```typescript
import axios from 'axios';

export class PriceOracleService {
  async getTokenPrice(tokenSymbol: string): Promise<number> {
    try {
      const coinMap: { [key: string]: string } = {
        'aave': 'aave',
        'gmx': 'gmx',
        'rdnt': 'radiant-capital'
      };
      
      const coinId = coinMap[tokenSymbol.toLowerCase()];
      if (!coinId) return 0;
      
      const response = await axios.get(
        'https://api.coingecko.com/api/v3/simple/price',
        {
          params: {
            ids: coinId,
            vs_currencies: 'usd'
          }
        }
      );
      
      return response.data[coinId]?.usd || 0;
    } catch (error) {
      console.error('Error fetching price:', error);
      return 0;
    }
  }
  
  async getPriceVolatility(tokenSymbol: string): Promise<number> {
    try {
      const coinMap: { [key: string]: string } = {
        'aave': 'aave',
        'gmx': 'gmx',
        'rdnt': 'radiant-capital'
      };
      
      const coinId = coinMap[tokenSymbol.toLowerCase()];
      if (!coinId) return 0;
      
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart`,
        {
          params: {
            vs_currency: 'usd',
            days: 7
          }
        }
      );
      
      const prices = response.data.prices.map((p: any) => p[1]);
      const mean = prices.reduce((a: number, b: number) => a + b) / prices.length;
      const variance = prices.reduce((sum: number, price: number) => 
        sum + Math.pow(price - mean, 2), 0) / prices.length;
      
      return (Math.sqrt(variance) / mean) * 100;
    } catch (error) {
      console.error('Error calculating volatility:', error);
      return 0;
    }
  }
}

export const priceOracleService = new PriceOracleService();
```

### backend/src/services/socialSentimentService.ts

```typescript
import axios from 'axios';

export class SocialSentimentService {
  async getSentiment(protocolName: string): Promise<number> {
    try {
      if (!process.env.NEWS_API_KEY) {
        return 50; // Neutral default
      }
      
      const response = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q: `${protocolName} DeFi`,
          apiKey: process.env.NEWS_API_KEY,
          language: 'en',
          pageSize: 20
        }
      });
      
      if (!response.data.articles || response.data.articles.length === 0) {
        return 50;
      }
      
      const negativeWords = ['hack', 'exploit', 'rug', 'scam', 'risk'];
      const positiveWords = ['secure', 'growth', 'success', 'upgrade'];
      
      let positiveCount = 0;
      let negativeCount = 0;
      
      for (const article of response.data.articles) {
        const text = (article.title + ' ' + article.description).toLowerCase();
        
        if (negativeWords.some(w => text.includes(w))) negativeCount++;
        if (positiveWords.some(w => text.includes(w))) positiveCount++;
      }
      
      if (positiveCount + negativeCount === 0) return 50;
      
      return Math.round((positiveCount / (positiveCount + negativeCount)) * 100);
    } catch (error) {
      return 50;
    }
  }
}

export const socialSentimentService = new SocialSentimentService();
```

### backend/src/services/realProtocolMonitor.ts

```typescript
import { blockchainService } from './blockchainService';
import { defiLlamaService } from './defiLlamaService';
import { socialSentimentService } from './socialSentimentService';
import { priceOracleService } from './priceOracleService';
import axios from 'axios';

export class RealProtocolMonitor {
  private mlServiceUrl: string;
  
  constructor() {
    this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
  }
  
  async getHealthScore(
    protocolAddress: string,
    protocolSlug: string,
    tokenSymbol?: string
  ) {
    console.log(`📊 Analyzing ${protocolSlug}...`);
    
    // Collect real data
    const tvlData = await defiLlamaService.getProtocolTVL(protocolSlug);
    const whaleData = await blockchainService.detectWhaleMovements(protocolAddress);
    const sentiment = await socialSentimentService.getSentiment(protocolSlug);
    
    let tokenPrice = 1;
    let priceVolatility = 0;
    
    if (tokenSymbol && tokenSymbol !== 'USDC') {
      tokenPrice = await priceOracleService.getTokenPrice(tokenSymbol);
      priceVolatility = await priceOracleService.getPriceVolatility(tokenSymbol);
    }
    
    // Call ML service
    const response = await axios.post(`${this.mlServiceUrl}/predict`, {
      signals: {
        tvl: tvlData?.tvl || 0,
        tvlChange24h: tvlData?.tvlChange24h || 0,
        whaleActivity: Math.min(100, (whaleData.count / 10) * 100),
        liquidationRisk: 0,
        priceVolatility,
        socialSentiment: sentiment,
        codeActivity: 50
      }
    });
    
    // Build risk factors
    const riskFactors: string[] = [];
    if (tvlData && tvlData.tvlChange24h < -5) {
      riskFactors.push(`TVL down ${Math.abs(tvlData.tvlChange24h).toFixed(1)}%`);
    }
    if (whaleData.count > 5) {
      riskFactors.push(`${whaleData.count} whale exits`);
    }
    if (sentiment < 40) {
      riskFactors.push('Negative sentiment');
    }
    
    return {
      ...response.data,
      riskFactors
    };
  }
}

export const realProtocolMonitor = new RealProtocolMonitor();
```

-----

## 🌐 Step 4: Routes

### backend/src/routes/monitoring.ts

```typescript
import express from 'express';
import { db } from '../db/client';

export const monitoringRouter = express.Router();

monitoringRouter.get('/positions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await db.query(`
      SELECT * FROM positions 
      WHERE user_id = $1 AND amount > 0
    `, [userId]);
    
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

### backend/src/routes/wallets.ts

```typescript
import express from 'express';
import { circleService } from '../services/circleWalletService';
import { db } from '../db/client';

export const walletRouter = express.Router();

walletRouter.post('/create', async (req, res) => {
  try {
    const { userId, email } = req.body;
    
    const wallet = await circleService.createUserWallet(userId);
    
    await db.query(`
      INSERT INTO users (id, email, circle_wallet_id, wallet_address)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE 
      SET circle_wallet_id = $3, wallet_address = $4
    `, [userId, email, wallet.walletId, wallet.address]);
    
    res.json({ wallet });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

### backend/src/routes/voice.ts

```typescript
import express from 'express';
import { voiceService } from '../services/elevenLabsService';

export const voiceRouter = express.Router();

voiceRouter.post('/summary/:userId', async (req, res) => {
  try {
    const audioBuffer = await voiceService.generateAlertAudio(
      'warning',
      'Demo Protocol',
      75,
      ['Sample risk factor']
    );
    
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length
    });
    res.send(audioBuffer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

### backend/src/routes/realData.ts

```typescript
import express from 'express';
import { realProtocolMonitor } from '../services/realProtocolMonitor';
import { SUPPORTED_PROTOCOLS } from '../config/protocols';
import { circleService } from '../services/circleWalletService';
import { db } from '../db/client';

export const realDataRouter = express.Router();

realDataRouter.get('/protocols', (req, res) => {
  res.json({ protocols: SUPPORTED_PROTOCOLS });
});

realDataRouter.get('/protocol/:slug/health', async (req, res) => {
  try {
    const protocol = SUPPORTED_PROTOCOLS.find(p => p.slug === req.params.slug);
    if (!protocol) {
      return res.status(404).json({ error: 'Protocol not found' });
    }
    
    const health = await realProtocolMonitor.getHealthScore(
      protocol.address,
      protocol.slug,
      protocol.tokenSymbol
    );
    
    res.json({ protocol: protocol.name, ...health });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

realDataRouter.post('/onboard', async (req, res) => {
  try {
    const { email } = req.body;
    
    const userResult = await db.query(`
      INSERT INTO users (email, risk_tolerance)
      VALUES ($1, 'moderate')
      RETURNING id
    `, [email]);
    
    const userId = userResult.rows[0].id;
    const wallet = await circleService.createUserWallet(userId);
    
    await db.query(`
      UPDATE users 
      SET circle_wallet_id = $1, wallet_address = $2
      WHERE id = $3
    `, [wallet.walletId, wallet.address, userId]);
    
    res.json({
      success: true,
      user: { userId, ...wallet }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default realDataRouter;
```

-----

## 🎯 Step 5: Main Server

### backend/src/index.ts

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { monitoringRouter } from './routes/monitoring';
import { walletRouter } from './routes/wallets';
import { voiceRouter } from './routes/voice';
import realDataRouter from './routes/realData';
import { initializeDatabase } from './db/init';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/monitoring', monitoringRouter);
app.use('/api/wallets', walletRouter);
app.use('/api/voice', voiceRouter);
app.use('/api/real', realDataRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', mode: 'real-data' });
});

async function start() {
  try {
    await initializeDatabase();
    console.log('✅ Database ready');
    
    app.listen(PORT, () => {
      console.log(`🚀 SentinelAI on port ${PORT}`);
      console.log(`📊 Monitoring ${SUPPORTED_PROTOCOLS.length} protocols`);
    });
  } catch (error) {
    console.error('❌ Failed:', error);
    process.exit(1);
  }
}

start();
```

-----

## 🧪 Step 6: Test Script

### backend/src/scripts/testRealData.ts

```typescript
import { realProtocolMonitor } from '../services/realProtocolMonitor';
import { SUPPORTED_PROTOCOLS } from '../config/protocols';

async function test() {
  console.log('🧪 Testing Real Data\n');
  
  for (const protocol of SUPPORTED_PROTOCOLS) {
    console.log(`📊 ${protocol.name}...`);
    
    try {
      const health = await realProtocolMonitor.getHealthScore(
        protocol.address,
        protocol.slug,
        protocol.tokenSymbol
      );
      
      console.log(`   Health: ${health.healthScore}/100`);
      console.log(`   Risks: ${health.riskFactors.join(', ') || 'None'}\n`);
    } catch (error: any) {
      console.log(`   Error: ${error.message}\n`);
    }
  }
}

test().then(() => process.exit(0));
```

-----

## 🐍 Step 7: ML Service

### ml-service/requirements.txt

```
fastapi==0.108.0
uvicorn==0.25.0
scikit-learn==1.3.2
pandas==2.1.4
numpy==1.26.2
pydantic==2.5.0
```

### ml-service/main.py

```python
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import numpy as np

app = FastAPI()

class Signals(BaseModel):
    tvl: float
    tvlChange24h: float
    whaleActivity: float
    liquidationRisk: float
    priceVolatility: float
    socialSentiment: float
    codeActivity: float

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.post("/predict")
def predict(signals: Signals):
    # Simple weighted calculation
    score = (
        (min(signals.tvl / 1e9, 1) * 100) * 0.2 +
        (50 + signals.tvlChange24h * 2) * 0.25 +
        (100 - signals.whaleActivity
```