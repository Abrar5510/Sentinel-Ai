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