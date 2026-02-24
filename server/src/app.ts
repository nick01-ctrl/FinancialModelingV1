import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import modelRoutes from './routes/models.js';
import aiRoutes from './routes/ai.js';
import shareRoutes from './routes/share.js';
import exportRoutes from './routes/export.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/models', modelRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/export', exportRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default app;
