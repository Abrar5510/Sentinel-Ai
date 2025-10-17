# SentinelAI with ElevenLabs Voice - Complete Code & Setup

## 📋 Prerequisites & Account Setup

### 1. Required Accounts

```bash
# Sign up for these services:
1. Circle Developer Account: https://console.circle.com
2. ElevenLabs Account: https://elevenlabs.io
3. GitHub Account (for deployment)
4. Railway/Render Account (for hosting)
```

### 2. Get API Keys

```bash
# Circle Console (console.circle.com)
- Create new project
- Get API Key
- Get Entity Secret
- Enable Arc Testnet

# ElevenLabs (elevenlabs.io)
- Sign up for free tier
- Go to Profile Settings
- Copy API Key
- Choose a voice ID from Voice Library
```

-----

## 🚀 Project Setup

### Step 1: Initialize Project

```bash
# Create project directory
mkdir sentinelai && cd sentinelai

# Initialize monorepo structure
mkdir -p backend ml-service contracts frontend

# Initialize package.json
npm init -y

# Install root dependencies
npm install --save-dev typescript @types/node ts-node nodemon concurrently
```

### Step 2: Backend Setup

```bash
cd backend
npm init -y

# Install dependencies
npm install express cors dotenv
npm install @circle-fin/developer-controlled-wallets
npm install elevenlabs
npm install axios ethers
npm install pg redis bull
npm install --save-dev @types/express @types/node typescript
```

**backend/package.json:**

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
    "elevenlabs": "^0.8.0",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "axios": "^1.6.0",
    "ethers": "^6.9.0",
    "pg": "^8.11.3",
    "bull": "^4.12.0",
    "redis": "^4.6.0"
  }
}
```

**backend/tsconfig.json:**

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

**backend/.env:**

```bash
# Circle API
CIRCLE_API_KEY=your_circle_api_key_here
ENTITY_SECRET=your_entity_secret_here
CIRCLE_BASE_URL=https://api.circle.com/v1

# ElevenLabs
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM  # Rachel voice (or choose your own)

# Database
DATABASE_URL=postgresql://localhost:5432/sentinelai
REDIS_URL=redis://localhost:6379

# Arc Blockchain
ARC_RPC_URL=https://testnet.arc.xyz/rpc
USDC_TOKEN_ADDRESS=0x...  # Arc testnet USDC address

# Server
PORT=3000
NODE_ENV=development

# ML Service
ML_SERVICE_URL=http://localhost:8000
```

-----

## 💻 Core Backend Code

### backend/src/index.ts

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { monitoringRouter } from './routes/monitoring';
import { walletRouter } from './routes/wallets';
import { voiceRouter } from './routes/voice';
import { startAutomationEngine } from './services/automationEngine';
import { initializeDatabase } from './db/init';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/monitoring', monitoringRouter);
app.use('/api/wallets', walletRouter);
app.use('/api/voice', voiceRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Initialize
async function start() {
  try {
    await initializeDatabase();
    console.log('✅ Database initialized');
    
    // Start automation engine
    startAutomationEngine();
    console.log('✅ Automation engine started');
    
    app.listen(PORT, () => {
      console.log(`🚀 SentinelAI backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start:', error);
    process.exit(1);
  }
}

start();
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
    try {
      // Create wallet set
      const walletSet = await this.client.createWalletSet({
        name: `SentinelAI-User-${userId}`
      });
      
      // Create wallet on Arc testnet
      const wallet = await this.client.createWallet({
        walletSetId: walletSet.data.walletSet.id,
        blockchains: ['ARQ-TESTNET'],
        count: 1,
        metadata: [{
          key: 'userId',
          value: userId
        }]
      });
      
      return {
        walletId: wallet.data.wallets[0].id,
        address: wallet.data.wallets[0].address,
        walletSetId: walletSet.data.walletSet.id
      };
    } catch (error) {
      console.error('Error creating wallet:', error);
      throw error;
    }
  }
  
  async executeEmergencyExit(
    walletId: string,
    fromProtocol: string,
    toAddress: string,
    amount: string
  ) {
    try {
      const tx = await this.client.createTransaction({
        walletId,
        blockchain: 'ARQ-TESTNET',
        tokenAddress: process.env.USDC_TOKEN_ADDRESS,
        destinationAddress: toAddress,
        amount,
        feeLevel: 'HIGH', // Priority for emergencies
        metadata: [{
          key: 'type',
          value: 'emergency_exit'
        }, {
          key: 'fromProtocol',
          value: fromProtocol
        }]
      });
      
      return tx.data;
    } catch (error) {
      console.error('Error executing exit:', error);
      throw error;
    }
  }
  
  async getWalletBalance(walletId: string) {
    try {
      const response = await this.client.getWallet({ id: walletId });
      return response.data.wallet.balance;
    } catch (error) {
      console.error('Error getting balance:', error);
      throw error;
    }
  }
}

export const circleService = new CircleWalletService();
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
    const message = this.createAlertMessage(
      alertType,
      protocolName,
      healthScore,
      riskFactors
    );
    
    try {
      const audio = await this.client.generate({
        voice: this.voiceId,
        text: message,
        model_id: 'eleven_turbo_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      });
      
      // Convert audio stream to buffer
      const chunks: Buffer[] = [];
      for await (const chunk of audio) {
        chunks.push(chunk);
      }
      
      return Buffer.concat(chunks);
    } catch (error) {
      console.error('Error generating audio:', error);
      throw error;
    }
  }
  
  private createAlertMessage(
    alertType: string,
    protocolName: string,
    healthScore: number,
    riskFactors: string[]
  ): string {
    const urgencyMap = {
      warning: 'Attention required',
      critical: 'Critical alert',
      emergency: 'Emergency action needed'
    };
    
    let message = `${urgencyMap[alertType]}. `;
    message += `${protocolName} health score has dropped to ${healthScore} out of 100. `;
    
    if (riskFactors.length > 0) {
      message += `Key risk factors detected: ${riskFactors.slice(0, 3).join(', ')}. `;
    }
    
    if (alertType === 'emergency') {
      message += 'Sentinel AI is executing an emergency exit to protect your funds. ';
    } else if (alertType === 'critical') {
      message += 'Sentinel AI is beginning a gradual position exit. ';
    } else {
      message += 'Continue monitoring the situation. ';
    }
    
    message += 'Check your dashboard for full details.';
    
    return message;
  }
  
  async generatePortfolioSummary(
    totalValue: number,
    positions: Array<{ protocol: string; amount: number; health: number }>,
    recentActions: string[]
  ): Promise<Buffer> {
    let message = `Good morning. Here's your portfolio summary. `;
    message += `Total portfolio value: ${totalValue.toLocaleString()} USDC across ${positions.length} protocols. `;
    
    const healthyPositions = positions.filter(p => p.health >= 70);
    const riskyPositions = positions.filter(p => p.health < 70);
    
    message += `${healthyPositions.length} positions are healthy. `;
    
    if (riskyPositions.length > 0) {
      message += `${riskyPositions.length} positions require attention: `;
      riskyPositions.forEach(p => {
        message += `${p.protocol} with health score ${p.health}. `;
      });
    }
    
    if (recentActions.length > 0) {
      message += `Recent protective actions: ${recentActions.join('. ')}. `;
    } else {
      message += `No protective actions were needed recently. `;
    }
    
    message += 'Your funds are being actively monitored.';
    
    return this.generateAudio(message);
  }
  
  async generateConversationalResponse(query: string, data: any): Promise<Buffer> {
    // Simple conversational AI (can enhance with GPT later)
    let response = '';
    
    if (query.toLowerCase().includes('portfolio')) {
      response = `Your portfolio has ${data.positionCount} positions worth ${data.totalValue} USDC. `;
      response += `Average health score is ${data.avgHealth} out of 100.`;
    } else if (query.toLowerCase().includes('health')) {
      response = `The protocol health score is ${data.health}. `;
      response += data.health < 50 ? 'This is concerning and being monitored closely.' : 'This is within safe range.';
    } else {
      response = 'I can provide information about your portfolio health and recent actions. What would you like to know?';
    }
    
    return this.generateAudio(response);
  }
  
  private async generateAudio(text: string): Promise<Buffer> {
    const audio = await this.client.generate({
      voice: this.voiceId,
      text,
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

### backend/src/services/protocolMonitor.ts

```typescript
import axios from 'axios';

interface ProtocolSignals {
  tvl: number;
  tvlChange24h: number;
  whaleActivity: number;
  liquidationRisk: number;
  priceVolatility: number;
  socialSentiment: number;
  codeActivity: number;
}

export class ProtocolMonitor {
  private mlServiceUrl: string;
  
  constructor() {
    this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
  }
  
  async collectSignals(protocolAddress: string): Promise<ProtocolSignals> {
    // In production, integrate with real data sources
    // For demo, generate realistic mock data
    
    const mockData: ProtocolSignals = {
      tvl: Math.random() * 1000000000, // $0-1B
      tvlChange24h: (Math.random() - 0.5) * 20, // -10% to +10%
      whaleActivity: Math.random() * 100,
      liquidationRisk: Math.random() * 100,
      priceVolatility: Math.random() * 50,
      socialSentiment: Math.random() * 100,
      codeActivity: Math.random() * 100
    };
    
    return mockData;
  }
  
  async getHealthScore(protocolAddress: string): Promise<{
    healthScore: number;
    confidence: number;
    trend: 'up' | 'down' | 'stable';
    riskFactors: string[];
  }> {
    try {
      const signals = await this.collectSignals(protocolAddress);
      
      // Call ML service for prediction
      const response = await axios.post(`${this.mlServiceUrl}/predict`, {
        signals
      });
      
      return response.data;
    } catch (error) {
      console.error('Error getting health score:', error);
      // Fallback to simple calculation if ML service unavailable
      return this.fallbackHealthCalculation(await this.collectSignals(protocolAddress));
    }
  }
  
  private fallbackHealthCalculation(signals: ProtocolSignals) {
    // Simple weighted average as fallback
    const weights = {
      tvl: 0.2,
      tvlChange: 0.25,
      whale: 0.15,
      liquidation: 0.2,
      volatility: 0.1,
      sentiment: 0.05,
      code: 0.05
    };
    
    const normalizedTvlChange = Math.max(0, Math.min(100, 50 + signals.tvlChange24h * 5));
    const normalizedVolatility = 100 - signals.priceVolatility * 2;
    
    const score = 
      (signals.tvl > 10000000 ? 100 : (signals.tvl / 10000000) * 100) * weights.tvl +
      normalizedTvlChange * weights.tvlChange +
      (100 - signals.whaleActivity) * weights.whale +
      (100 - signals.liquidationRisk) * weights.liquidation +
      normalizedVolatility * weights.volatility +
      signals.socialSentiment * weights.sentiment +
      signals.codeActivity * weights.code;
    
    const riskFactors = [];
    if (signals.tvlChange24h < -5) riskFactors.push('TVL declining rapidly');
    if (signals.whaleActivity > 70) riskFactors.push('High whale activity detected');
    if (signals.liquidationRisk > 60) riskFactors.push('Elevated liquidation risk');
    
    return {
      healthScore: Math.round(score),
      confidence: 75,
      trend: signals.tvlChange24h > 2 ? 'up' : signals.tvlChange24h < -2 ? 'down' : 'stable',
      riskFactors
    };
  }
}

export const protocolMonitor = new ProtocolMonitor();
```

### backend/src/services/automationEngine.ts

```typescript
import { protocolMonitor } from './protocolMonitor';
import { circleService } from './circleWalletService';
import { voiceService } from './elevenLabsService';
import { db } from '../db/client';

export class AutomationEngine {
  private isRunning = false;
  private checkInterval = 60 * 60 * 1000; // 1 hour
  
  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    console.log('🤖 Automation engine started');
    this.monitoringLoop();
  }
  
  private async monitoringLoop() {
    while (this.isRunning) {
      try {
        await this.checkAllPositions();
      } catch (error) {
        console.error('Error in monitoring loop:', error);
      }
      
      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, this.checkInterval));
    }
  }
  
  private async checkAllPositions() {
    // Get all active positions from database
    const positions = await db.query(`
      SELECT p.*, u.circle_wallet_id, u.phone_number, u.risk_tolerance
      FROM positions p
      JOIN users u ON p.user_id = u.id
      WHERE p.amount > 0
    `);
    
    for (const position of positions.rows) {
      await this.evaluatePosition(position);
    }
  }
  
  private async evaluatePosition(position: any) {
    const health = await protocolMonitor.getHealthScore(position.protocol_address);
    
    // Update health score in database
    await db.query(`
      UPDATE positions 
      SET last_health_score = $1, last_updated = NOW()
      WHERE id = $2
    `, [health.healthScore, position.id]);
    
    // Determine action based on health score
    const action = this.determineAction(health.healthScore, position.risk_tolerance);
    
    if (action.type !== 'none') {
      await this.executeProtectiveAction(position, health, action);
    }
  }
  
  private determineAction(healthScore: number, riskTolerance: string) {
    const thresholds = {
      conservative: { critical: 60, warning: 70, emergency: 40 },
      moderate: { critical: 50, warning: 60, emergency: 30 },
      aggressive: { critical: 40, warning: 50, emergency: 20 }
    };
    
    const t = thresholds[riskTolerance] || thresholds.moderate;
    
    if (healthScore <= t.emergency) {
      return { type: 'emergency', exitPercentage: 100 };
    } else if (healthScore <= t.critical) {
      return { type: 'critical', exitPercentage: 70 };
    } else if (healthScore <= t.warning) {
      return { type: 'warning', exitPercentage: 30 };
    }
    
    return { type: 'none', exitPercentage: 0 };
  }
  
  private async executeProtectiveAction(position: any, health: any, action: any) {
    console.log(`🛡️ Executing ${action.type} action for ${position.protocol_name}`);
    
    try {
      // Calculate exit amount
      const exitAmount = (position.amount * action.exitPercentage / 100).toString();
      
      // Execute blockchain transaction
      const tx = await circleService.executeEmergencyExit(
        position.circle_wallet_id,
        position.protocol_address,
        position.circle_wallet_id, // Send back to user wallet
        exitAmount
      );
      
      // Record action in database
      await db.query(`
        INSERT INTO rebalancing_history 
        (user_id, from_protocol, amount_exited, reason, tx_hash, executed_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `, [
        position.user_id,
        position.protocol_name,
        exitAmount,
        `${action.type} exit: health score ${health.healthScore}`,
        tx.id
      ]);
      
      // Generate and send voice alert
      await this.sendVoiceAlert(position, health, action);
      
      console.log(`✅ Protected ${exitAmount} USDC from ${position.protocol_name}`);
    } catch (error) {
      console.error('Error executing protective action:', error);
    }
  }
  
  private async sendVoiceAlert(position: any, health: any, action: any) {
    try {
      const audioBuffer = await voiceService.generateAlertAudio(
        action.type,
        position.protocol_name,
        health.healthScore,
        health.riskFactors
      );
      
      // Save audio file
      const filename = `alert_${position.user_id}_${Date.now()}.mp3`;
      const filepath = await voiceService.saveAudioFile(audioBuffer, filename);
      
      console.log(`🔊 Voice alert generated: ${filepath}`);
      
      // In production: send via Twilio, email, or push notification
      // For now, just store the file path
      await db.query(`
        UPDATE positions 
        SET last_alert_audio = $1 
        WHERE id = $2
      `, [filepath, position.id]);
      
    } catch (error) {
      console.error('Error sending voice alert:', error);
    }
  }
  
  stop() {
    this.isRunning = false;
    console.log('🛑 Automation engine stopped');
  }
}

export function startAutomationEngine() {
  const engine = new AutomationEngine();
  engine.start();
  return engine;
}
```

### backend/src/routes/voice.ts

```typescript
import express from 'express';
import { voiceService } from '../services/elevenLabsService';
import { protocolMonitor } from '../services/protocolMonitor';
import { db } from '../db/client';

export const voiceRouter = express.Router();

// Generate portfolio summary audio
voiceRouter.post('/summary/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user positions
    const positionsResult = await db.query(`
      SELECT protocol_name, amount, last_health_score 
      FROM positions 
      WHERE user_id = $1 AND amount > 0
    `, [userId]);
    
    const positions = positionsResult.rows.map(p => ({
      protocol: p.protocol_name,
      amount: parseFloat(p.amount),
      health: p.last_health_score
    }));
    
    const totalValue = positions.reduce((sum, p) => sum + p.amount, 0);
    
    // Get recent actions
    const actionsResult = await db.query(`
      SELECT reason 
      FROM rebalancing_history 
      WHERE user_id = $1 
      ORDER BY executed_at DESC 
      LIMIT 3
    `, [userId]);
    
    const recentActions = actionsResult.rows.map(a => a.reason);
    
    // Generate audio
    const audioBuffer = await voiceService.generatePortfolioSummary(
      totalValue,
      positions,
      recentActions
    );
    
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length
    });
    res.send(audioBuffer);
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// Voice query endpoint
voiceRouter.post('/query', async (req, res) => {
  try {
    const { userId, query } = req.body;
    
    // Get relevant data based on query
    let data: any = {};
    
    if (query.toLowerCase().includes('portfolio')) {
      const result = await db.query(`
        SELECT COUNT(*) as count, SUM(amount) as total, AVG(last_health_score) as avg_health
        FROM positions 
        WHERE user_id = $1 AND amount > 0
      `, [userId]);
      
      data = {
        positionCount: result.rows[0].count,
        totalValue: parseFloat(result.rows[0].total || 0),
        avgHealth: Math.round(result.rows[0].avg_health || 0)
      };
    }
    
    // Generate conversational response
    const audioBuffer = await voiceService.generateConversationalResponse(query, data);
    
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length
    });
    res.send(audioBuffer);
  } catch (error) {
    console.error('Error processing query:', error);
    res.status(500).json({ error: 'Failed to process query' });
  }
});

// Get latest alert audio
voiceRouter.get('/alert/:userId/latest', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await db.query(`
      SELECT last_alert_audio 
      FROM positions 
      WHERE user_id = $1 AND last_alert_audio IS NOT NULL
      ORDER BY last_updated DESC 
      LIMIT 1
    `, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No alerts found' });
    }
    
    const audioPath = result.rows[0].last_alert_audio;
    res.sendFile(audioPath);
  } catch (error) {
    console.error('Error fetching alert:', error);
    res.status(500).json({ error: 'Failed to fetch alert' });
  }
});
```

-----

## 📊 Database Setup

### backend/src/db/init.ts

```typescript
import { Pool } from 'pg';

export const db = new Pool({
  connectionString: process.env.DATABASE_URL
});

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
    
    CREATE INDEX IF NOT EXISTS idx_positions_user ON positions(user_id);
    CREATE INDEX IF NOT EXISTS idx_health_protocol ON protocol_health(protocol_address);
  `);
}
```

-----

## 🎨 Frontend Code (React + TypeScript)

### frontend/package.json

```json
{
  "name": "sentinelai-frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.6.0",
    "recharts": "^2.10.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.3.6"
  }
}
```

### frontend/src/App.tsx

```typescript
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

interface Position {
  id: string;
  protocol_name: string;
  amount: number;
  last_health_score: number;
}

export default function App() {
  const [userId] = useState('demo-user-123'); // In production, get from auth
  const [positions, setPositions] = useState<Position[]>([]);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  
  useEffect(() => {
    loadPositions();
    const interval = setInterval(loadPositions, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);
  
  const loadPositions = async () => {
    try {
      const response = await axios.get(`${API_URL}/monitoring/positions/${userId}`);
      setPositions(response.data);
    } catch (error) {
      console.error('Error loading positions:', error);
    }
  };
  
  const playPortfolioSummary = async () => {
    try {
      setIsPlaying(true);
      const response = await axios.post(
        `${API_URL}/voice/summary/${userId}`,
        {},
        { responseType: 'blob' }
      );
      
      const url = URL.createObjectURL(response.data);
      setAudioUrl(url);
      
      const audio = new Audio(url);
      audio.play();
      audio.onended = () => setIsPlaying(false);
    } catch (error) {
      console.error('Error playing summary:', error);
      setIsPlaying(false);
    }
  };
  
  const getHealthColor = (score: number) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    if (score >= 30) return 'bg-orange-500';
    return 'bg-red-500';
  };
  
  const totalValue = positions.reduce((sum, p) => sum + p.amount, 0);
  const avgHealth = positions.length > 0 
    ? Math.round(positions.reduce((sum, p) => sum + p.last_health_score, 0) / positions.length)
    : 0;
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2">🛡️ SentinelAI</h1>
        <p className="text-gray-400">AI-Powered DeFi Protection</p>
      </header>
      
      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-gray-400 text-sm mb-2">Total Portfolio Value</h3>
          <p className="text-3xl font-bold">${totalValue.toLocaleString()} USDC</p>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-gray-400 text-sm mb-2">Average Health</h3>
          <div className="flex items-center gap-3">
            <p className="text-3xl font-bold">{avgHealth}/100</p>
            <div className={`w-3 h-3 rounded-full ${getHealthColor(avgHealth)}`}></div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-gray-400 text-sm mb-2">Active Positions</h3>
          <p className="text-3xl font-bold">{positions.length}</p>
        </div>
      </div>
      
      {/* Voice Summary Button */}
      <div className="mb-8">
        <button
          onClick={playPortfolioSummary}
          disabled={isPlaying}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-3 rounded-lg font-semibold flex items-center gap-2"
        >
          {isPlaying ? (
            <>
              <span className="animate-pulse">🔊</span>
              Playing Voice Summary...
            </>
          ) : (
            <>
              🎤 Play Voice Portfolio Summary
            </>
          )}
        </button>
      </div>
      
      {/* Positions Grid */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Your Positions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {positions.map(position => (
            <div key={position.id} className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold">{position.protocol_name}</h3>
                <div className={`w-4 h-4 rounded-full ${getHealthColor(position.last_health_score)}`}></div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Amount:</span>
                  <span className="font-semibold">${position.amount.toLocaleString()} USDC</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-400">Health Score:</span>
                  <span className="font-semibold">{position.last_health_score}/100</span>
                </div>
              </div>
              
              {/* Health Bar */}
              <div className="mt-4">
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getHealthColor(position.last_health_score)}`}
                    style={{ width: `${position.last_health_score}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Voice Query Interface */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">🎙️ Ask Sentinel</h2>
        <p className="text-gray-400 mb-4">Try voice queries like:</p>
        <div className="space-y-2 text-sm text-gray-500">
          <p>• "How's my portfolio doing?"</p>
          <p>• "What's the health of Arc Lend?"</p>
          <p>• "Why did you exit my position?"</p>
        </div>
        <div className="mt-4">
          <button className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded">
            🎤 Voice Query (Coming Soon)
          </button>
        </div>
      </div>
    </div>
  );
}
```
