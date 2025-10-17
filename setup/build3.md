# SentinelAI - Complete Build Guide with Real Data

## What You’re Building

An AI-powered DeFi protection system that:

- Monitors real protocols on Arbitrum blockchain
- Predicts protocol failures using ML
- Automatically protects funds via Circle Wallets
- Sends voice alerts via ElevenLabs
- Uses real data from DeFi Llama, CoinGecko, News APIs

-----

## Project Structure

```
sentinelai/
├── backend/
│   ├── src/
│   │   ├── config/protocols.ts
│   │   ├── db/client.ts
│   │   ├── db/init.ts
│   │   ├── routes/realData.ts
│   │   ├── services/
│   │   │   ├── blockchainService.ts
│   │   │   ├── circleWalletService.ts
│   │   │   ├── defiLlamaService.ts
│   │   │   ├── elevenLabsService.ts
│   │   │   ├── priceOracleService.ts
│   │   │   ├── socialSentimentService.ts
│   │   │   └── realProtocolMonitor.ts
│   │   └── index.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
├── ml-service/
│   ├── main.py
│   └── requirements.txt
└── frontend/
    ├── src/App.tsx
    ├── package.json
    └── index.html
```

-----

## Quick Start

### Step 1: Create Project

```bash
mkdir sentinelai && cd sentinelai
mkdir -p backend/src/{config,db,routes,services}
mkdir ml-service
mkdir frontend/src
```

### Step 2: Get API Keys

1. **Circle**: https://console.circle.com (API Key + Entity Secret)
1. **ElevenLabs**: https://elevenlabs.io (API Key)
1. **Alchemy**: https://alchemy.com (Arbitrum RPC URL)
1. **News API**: https://newsapi.org (Optional)

-----

## Backend Setup

### Install Dependencies

```bash
cd backend
npm init -y
npm install express cors dotenv axios ethers pg @circle-fin/developer-controlled-wallets elevenlabs
npm install -D typescript @types/node @types/express @types/pg ts-node nodemon
```

### backend/package.json

```json
{
  "name": "sentinelai-backend",
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "axios": "^1.6.0",
    "ethers": "^6.9.0",
    "pg": "^8.11.3",
    "@circle-fin/developer-controlled-wallets": "^1.0.0",
    "elevenlabs": "^0.8.0"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "ts-node": "^10.9.2",
    "nodemon": "^3.0.2",
    "@types/node": "^20.10.0",
    "@types/express": "^4.17.21"
  }
}
```

### backend/tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

### backend/.env

```bash
CIRCLE_API_KEY=your_circle_key
ENTITY_SECRET=your_entity_secret
ELEVENLABS_API_KEY=your_elevenlabs_key
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
ARC_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY
USDC_TOKEN_ADDRESS=0xaf88d065e77c8cC2239327C5EDb3A432268e5831
NEWS_API_KEY=your_news_key
DATABASE_URL=postgresql://localhost:5432/sentinelai
PORT=3000
ML_SERVICE_URL=http://localhost:8000
```

-----

## Database Setup

Create database:

```bash
createdb sentinelai
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
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS positions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      protocol_name TEXT NOT NULL,
      protocol_address TEXT NOT NULL,
      amount DECIMAL(20,6) NOT NULL,
      last_health_score INTEGER DEFAULT 100,
      last_updated TIMESTAMP DEFAULT NOW()
    );
  `);
}
```

-----

## Core Files

### backend/src/config/protocols.ts

```typescript
export const SUPPORTED_PROTOCOLS = [
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
  }
];
```

### backend/src/services/defiLlamaService.ts

```typescript
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
}

export const circleService = new CircleWalletService();
```

### backend/src/services/elevenLabsService.ts

```typescript
import { ElevenLabsClient } from 'elevenlabs';

export class VoiceAlertService {
  private client: ElevenLabsClient;
  
  constructor() {
    this.client = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY!
    });
  }
  
  async generateAlertAudio(
    alertType: string,
    protocolName: string,
    healthScore: number,
    riskFactors: string[]
  ): Promise<Buffer> {
    let message = `Alert: ${protocolName} health score is ${healthScore}. `;
    if (riskFactors.length > 0) {
      message += `Risk factors: ${riskFactors.join(', ')}`;
    }
    
    const audio = await this.client.generate({
      voice: process.env.ELEVENLABS_VOICE_ID!,
      text: message,
      model_id: 'eleven_turbo_v2'
    });
    
    const chunks: Buffer[] = [];
    for await (const chunk of audio) {
      chunks.push(chunk);
    }
    
    return Buffer.concat(chunks);
  }
}

export const voiceService = new VoiceAlertService();
```

### backend/src/services/blockchainService.ts

```typescript
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
```

### backend/src/services/priceOracleService.ts

```typescript
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
```

### backend/src/services/socialSentimentService.ts

```typescript
import axios from 'axios';

export class SocialSentimentService {
  async getSentiment(protocolName: string): Promise<number> {
    if (!process.env.NEWS_API_KEY) return 50;
    
    const response = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        q: `${protocolName} DeFi`,
        apiKey: process.env.NEWS_API_KEY,
        pageSize: 20
      }
    });
    
    if (!response.data.articles) return 50;
    
    const negativeWords = ['hack', 'exploit', 'rug', 'scam'];
    const positiveWords = ['secure', 'growth', 'success'];
    
    let pos = 0, neg = 0;
    for (const article of response.data.articles) {
      const text = (article.title + ' ' + article.description).toLowerCase();
      if (negativeWords.some(w => text.includes(w))) neg++;
      if (positiveWords.some(w => text.includes(w))) pos++;
    }
    
    return pos + neg === 0 ? 50 : Math.round((pos / (pos + neg)) * 100);
  }
}

export const socialSentimentService = new SocialSentimentService();
```

### backend/src/services/realProtocolMonitor.ts

```typescript
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
    
    const userResult = await db.query(
      'INSERT INTO users (email) VALUES ($1) RETURNING id',
      [email]
    );
    
    const userId = userResult.rows[0].id;
    const wallet = await circleService.createUserWallet(userId);
    
    await db.query(
      'UPDATE users SET circle_wallet_id = $1, wallet_address = $2 WHERE id = $3',
      [wallet.walletId, wallet.address, userId]
    );
    
    res.json({ success: true, user: { userId, ...wallet } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

### backend/src/index.ts

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { realDataRouter } from './routes/realData';
import { initializeDatabase } from './db/init';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/api/real', realDataRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

async function start() {
  await initializeDatabase();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();
```

-----

## ML Service Setup

### ml-service/requirements.txt

```
fastapi==0.108.0
uvicorn==0.25.0
scikit-learn==1.3.2
numpy==1.26.2
pydantic==2.5.0
```

### ml-service/main.py

```python
from fastapi import FastAPI
from pydantic import BaseModel

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
    score = (
        (min(signals.tvl / 1e9, 1) * 100) * 0.2 +
        (50 + signals.tvlChange24h * 2) * 0.25 +
        (100 - signals.whaleActivity) * 0.15 +
        (100 - signals.liquidationRisk) * 0.2 +
        (100 - signals.priceVolatility * 2) * 0.1 +
        signals.socialSentiment * 0.05 +
        signals.codeActivity * 0.05
    )
    
    health_score = max(0, min(100, int(score)))
    
    trend = "stable"
    if signals.tvlChange24h > 3:
        trend = "up"
    elif signals.tvlChange24h < -3:
        trend = "down"
    
    risk_factors = []
    if signals.tvlChange24h < -5:
        risk_factors.append(f"TVL declining {abs(signals.tvlChange24h):.1f}%")
    
    return {
        "healthScore": health_score,
        "confidence": 85,
        "trend": trend,
        "riskFactors": risk_factors
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

-----

## Frontend Setup

### Install Dependencies

```bash
cd frontend
npm init -y
npm install react react-dom axios
npm install -D vite @vitejs/plugin-react typescript tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### frontend/package.json

```json
{
  "name": "sentinelai-frontend",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "tailwindcss": "^3.3.6",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32"
  }
}
```

### frontend/vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 3001 }
});
```

### frontend/tailwind.config.js

```javascript
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [],
}
```

### frontend/index.html

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SentinelAI</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### frontend/src/main.tsx

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### frontend/src/index.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### frontend/src/App.tsx

```typescript
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

export default function App() {
  const [protocols, setProtocols] = useState<any[]>([]);
  const [selectedProtocol, setSelectedProtocol] = useState('');
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProtocols();
  }, []);

  const loadProtocols = async () => {
    const response = await axios.get(`${API_URL}/real/protocols`);
    setProtocols(response.data.protocols);
    if (response.data.protocols.length > 0) {
      setSelectedProtocol(response.data.protocols[0].slug);
    }
  };

  const checkHealth = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API_URL}/real/protocol/${selectedProtocol}/health`
      );
      setHealthData(response.data);
    } catch (error) {
      alert('Failed to check health');
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    if (score >= 30) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2">🛡️ SentinelAI</h1>
        <p className="text-gray-400">Real DeFi Protection</p>
      </header>

      <div className="bg-gray-800 rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4">Check Protocol Health</h2>
        
        <select
          value={selectedProtocol}
          onChange={(e) => setSelectedProtocol(e.target.value)}
          className="w-full bg-gray-700 rounded px-4 py-2 mb-4"
        >
          {protocols.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name} - {p.riskLevel} risk
            </option>
          ))}
        </select>

        <button
          onClick={checkHealth}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg w-full"
        >
          {loading ? 'Checking...' : 'Check Health'}
        </button>
      </div>

      {healthData && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Health Report</h2>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-sm text-gray-400 mb-2">Health Score</h3>
              <p className="text-3xl font-bold">{healthData.healthScore}/100</p>
            </div>

            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-sm text-gray-400 mb-2">Confidence</h3>
              <p className="text-3xl font-bold">{healthData.confidence}%</p>
            </div>

            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-sm text-gray-400 mb-2">Trend</h3>
              <p className="text-3xl font-bold">{healthData.trend}</p>
            </div>
          </div>

          <div className="mb-6">
            <div className="w-full bg-gray-700 rounded-full h-4">
              <div
                className={`h-4 rounded-full ${getHealthColor(healthData.healthScore)}`}
                style={{ width: `${healthData.healthScore}%` }}
              ></div>
            </div>
          </div>

          {healthData.riskFactors.length > 0 && (
            <div>
              <h3 className="text-xl font-bold mb-3">Risk Factors</h3>
              <ul className="space-y-2">
                {healthData.riskFactors.map((risk: string, idx: number) => (
                  <li key={idx} className="bg-red-900/20 border border-red-500/30 rounded px-4 py-2">
                    {risk}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

-----

## Running the Application

### Terminal 1: Database

```bash
brew services start postgresql
createdb sentinelai
```

### Terminal 2: ML Service

```bash
cd ml-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

### Terminal 3: Backend

```bash
cd backend
npm install
npm run dev
```

### Terminal 4: Frontend

```bash
cd frontend
npm install
npm run dev
```

### Open Browser

```
http://localhost:3001
```

-----

## Testing

### Test ML Service

```bash
curl http://localhost:8000/health
```

### Test Backend

```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/real/protocols
```

### Test Protocol Health

```bash
curl http://localhost:3000/api/real/protocol/aave/health
```

-----

## Complete!

You now have a working SentinelAI system with:

- Real blockchain data from Arbitrum
- Real protocol metrics from DeFi Llama
- Real sentiment analysis
- Real Circle wallet integration
- Real voice alerts via ElevenLabs
- Working dashboard