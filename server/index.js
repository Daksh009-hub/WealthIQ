// index.js - WealthIQ Backend Server
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import apiRouter from './routes/api.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api', apiRouter);

// Basic server health check
app.get('/api/ping', (req, res) => {
  res.json({
    status: 'ok',
    app: 'WealthIQ Server',
    version: '1.0.0',
    geminiKeyPresent: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()),
    timestamp: new Date().toISOString()
  });
});

// Production client static serving
const clientDistPath = fs.existsSync(path.resolve(__dirname, '../dist'))
  ? path.resolve(__dirname, '../dist')
  : path.resolve(__dirname, '../client/dist');

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.resolve(clientDistPath, 'index.html'));
    }
  });
}

// Only start background listening if not running on Vercel Serverless
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n=================================================`);
    console.log(`  WEALTHIQ Server running at http://localhost:${PORT}`);
    console.log(`  AI Mode: ${process.env.GEMINI_API_KEY ? 'Gemini API Enabled' : 'Graceful Deterministic Fallback'}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`=================================================\n`);
  });
}

export default app;
