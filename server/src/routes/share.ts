import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db/connection.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

function safeJsonParse(data: unknown): unknown {
  if (typeof data !== 'string') return data;
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// Get shared model (no auth required)
router.get('/:token', (req: Request, res: Response) => {
  const db = getDB();

  const shareToken = db
    .prepare('SELECT model_id FROM share_tokens WHERE token = ?')
    .get(req.params.token) as { model_id: string } | undefined;

  if (!shareToken) {
    res.status(404).json({ error: 'Share link not found' });
    return;
  }

  const model = db
    .prepare(
      `SELECT id, name, description, model_type as modelType, company_name as companyName,
              data, created_at as createdAt, updated_at as updatedAt
       FROM models WHERE id = ?`
    )
    .get(shareToken.model_id) as Record<string, unknown> | undefined;

  if (!model) {
    res.status(404).json({ error: 'Model not found' });
    return;
  }

  model.data = safeJsonParse(model.data);
  res.json(model);
});

// Duplicate shared model to user's workspace (auth required)
router.post('/:token/duplicate', authenticateToken, (req: AuthRequest, res: Response) => {
  const db = getDB();

  const shareToken = db
    .prepare('SELECT model_id FROM share_tokens WHERE token = ?')
    .get(req.params.token) as { model_id: string } | undefined;

  if (!shareToken) {
    res.status(404).json({ error: 'Share link not found' });
    return;
  }

  const original = db
    .prepare('SELECT name, description, model_type, company_name, data FROM models WHERE id = ?')
    .get(shareToken.model_id) as Record<string, string> | undefined;

  if (!original) {
    res.status(404).json({ error: 'Original model not found' });
    return;
  }

  const newId = uuidv4();
  db.prepare(
    `INSERT INTO models (id, user_id, name, description, model_type, company_name, data)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    newId,
    req.userId,
    `${original.name} (Copy)`,
    original.description,
    original.model_type,
    original.company_name,
    original.data
  );

  const model = db
    .prepare(
      `SELECT id, name, description, model_type as modelType, company_name as companyName,
              data, created_at as createdAt, updated_at as updatedAt
       FROM models WHERE id = ?`
    )
    .get(newId) as Record<string, unknown>;

  model.data = safeJsonParse(model.data);
  res.status(201).json(model);
});

export default router;
