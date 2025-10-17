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