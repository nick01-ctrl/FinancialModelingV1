import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db/connection.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticateToken);

function safeJsonParse(data: unknown): unknown {
  if (typeof data !== 'string') return data;
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// List models
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDB();
  const models = db
    .prepare(
      `SELECT id, name, description, model_type as modelType, company_name as companyName,
              created_at as createdAt, updated_at as updatedAt
       FROM models WHERE user_id = ? ORDER BY updated_at DESC`
    )
    .all(req.userId);
  res.json(models);
});

// Get model
router.get('/:id', (req: AuthRequest, res: Response) => {
  const db = getDB();
  const model = db
    .prepare(
      `SELECT id, name, description, model_type as modelType, company_name as companyName,
              data, created_at as createdAt, updated_at as updatedAt
       FROM models WHERE id = ? AND user_id = ?`
    )
    .get(req.params.id, req.userId) as Record<string, unknown> | undefined;

  if (!model) {
    res.status(404).json({ error: 'Model not found' });
    return;
  }

  model.data = safeJsonParse(model.data);
  res.json(model);
});

// Create model
router.post('/', (req: AuthRequest, res: Response) => {
  const { name, modelType, companyName, description } = req.body;
  const id = uuidv4();
  const db = getDB();

  db.prepare(
    `INSERT INTO models (id, user_id, name, model_type, company_name, description, data)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, req.userId, name || 'Untitled Model', modelType || 'dcf', companyName || '', description || '', '{}');

  const model = db
    .prepare(
      `SELECT id, name, description, model_type as modelType, company_name as companyName,
              data, created_at as createdAt, updated_at as updatedAt
       FROM models WHERE id = ?`
    )
    .get(id) as Record<string, unknown>;

  model.data = safeJsonParse(model.data);
  res.status(201).json(model);
});

// Update model (auto-save)
router.put('/:id', (req: AuthRequest, res: Response) => {
  const db = getDB();
  const { name, companyName, description, data } = req.body;
  const dataStr = JSON.stringify(data || {});

  // Check ownership
  const existing = db
    .prepare('SELECT id FROM models WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);

  if (!existing) {
    res.status(404).json({ error: 'Model not found' });
    return;
  }

  db.prepare(
    `UPDATE models
     SET name = COALESCE(?, name),
         company_name = COALESCE(?, company_name),
         description = COALESCE(?, description),
         data = ?,
         updated_at = datetime('now')
     WHERE id = ?`
  ).run(name, companyName, description, dataStr, req.params.id);

  // Create version entry
  const versionId = uuidv4();
  db.prepare(
    'INSERT INTO model_versions (id, model_id, data) VALUES (?, ?, ?)'
  ).run(versionId, req.params.id, dataStr);

  // Keep only last 10 versions
  db.prepare(
    `DELETE FROM model_versions
     WHERE model_id = ? AND id NOT IN (
       SELECT id FROM model_versions WHERE model_id = ? ORDER BY created_at DESC LIMIT 10
     )`
  ).run(req.params.id, req.params.id);

  const model = db
    .prepare(
      `SELECT id, name, description, model_type as modelType, company_name as companyName,
              data, created_at as createdAt, updated_at as updatedAt
       FROM models WHERE id = ?`
    )
    .get(req.params.id) as Record<string, unknown>;

  model.data = safeJsonParse(model.data);
  res.json(model);
});

// Delete model
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const db = getDB();
  const result = db
    .prepare('DELETE FROM models WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.userId);

  if (result.changes === 0) {
    res.status(404).json({ error: 'Model not found' });
    return;
  }

  res.json({ ok: true });
});

// List versions
router.get('/:id/versions', (req: AuthRequest, res: Response) => {
  const db = getDB();

  // Verify ownership
  const model = db
    .prepare('SELECT id FROM models WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);

  if (!model) {
    res.status(404).json({ error: 'Model not found' });
    return;
  }

  const versions = db
    .prepare(
      `SELECT id, data, created_at as createdAt
       FROM model_versions WHERE model_id = ? ORDER BY created_at DESC LIMIT 10`
    )
    .all(req.params.id);

  const parsed = (versions as Record<string, unknown>[]).map((v) => ({
    ...v,
    data: safeJsonParse(v.data),
  }));

  res.json(parsed);
});

// Restore version
router.post('/:id/versions/:vid/restore', (req: AuthRequest, res: Response) => {
  const db = getDB();

  const model = db
    .prepare('SELECT id FROM models WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);

  if (!model) {
    res.status(404).json({ error: 'Model not found' });
    return;
  }

  const version = db
    .prepare('SELECT data FROM model_versions WHERE id = ? AND model_id = ?')
    .get(req.params.vid, req.params.id) as { data: string } | undefined;

  if (!version) {
    res.status(404).json({ error: 'Version not found' });
    return;
  }

  db.prepare(
    `UPDATE models SET data = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(version.data, req.params.id);

  const updated = db
    .prepare(
      `SELECT id, name, description, model_type as modelType, company_name as companyName,
              data, created_at as createdAt, updated_at as updatedAt
       FROM models WHERE id = ?`
    )
    .get(req.params.id) as Record<string, unknown>;

  updated.data = safeJsonParse(updated.data);
  res.json(updated);
});

// Share model
router.post('/:id/share', (req: AuthRequest, res: Response) => {
  const db = getDB();

  const model = db
    .prepare('SELECT id FROM models WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);

  if (!model) {
    res.status(404).json({ error: 'Model not found' });
    return;
  }

  // Check for existing share token
  const existing = db
    .prepare('SELECT token FROM share_tokens WHERE model_id = ?')
    .get(req.params.id) as { token: string } | undefined;

  if (existing) {
    res.json({ token: existing.token, url: `/share/${existing.token}` });
    return;
  }

  const id = uuidv4();
  const token = uuidv4();
  db.prepare('INSERT INTO share_tokens (id, model_id, token) VALUES (?, ?, ?)').run(
    id,
    req.params.id,
    token
  );

  res.json({ token, url: `/share/${token}` });
});

export default router;
