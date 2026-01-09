// Express API server entry point
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config, logConfig } from './config.js';
import { initDatabase, isIndexerAvailable, closeDatabase } from './db/client.js';
import routes from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    dataSource: isIndexerAvailable() ? 'indexer' : 'rpc',
    indexerAvailable: isIndexerAvailable(),
    config: {
      assetContract: config.assetContract || null,
      marketplaceContract: config.marketplaceContract || null,
      rpcEndpoint: config.rpcEndpoint,
    },
    timestamp: Date.now(),
  });
});

// API routes
app.use('/api', routes);

// In production, serve static Vite build
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));

  // Handle client-side routing
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down...');
  await closeDatabase();
  process.exit(0);
});

// Start server
async function start() {
  logConfig();

  // Initialize database connection
  await initDatabase();

  app.listen(config.port, () => {
    console.log(`\nAPI server running on http://localhost:${config.port}`);
    console.log(`  Data source: ${isIndexerAvailable() ? 'indexer (PostgreSQL)' : 'rpc (fallback)'}`);
    console.log(`  Health check: http://localhost:${config.port}/api/health`);
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
