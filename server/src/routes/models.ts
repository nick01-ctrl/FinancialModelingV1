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

function computeSummary(dataStr: string): string {
  try {
    const data = JSON.parse(dataStr);
    const inputs = data.dcfInputs;
    if (!inputs) return '';

    // Check if model has meaningful data (non-zero revenue)
    const lastRev = inputs.historicalRevenue?.[inputs.historicalRevenue?.length - 1];
    if (!lastRev || lastRev === 0) return '';

    // Quick implied share price estimate using Gordon Growth
    const ke = (inputs.riskFreeRate || 0) + (inputs.beta || 1) * (inputs.equityRiskPremium || 0);
    const eWeight = 1 / (1 + (inputs.debtToEquity || 0));
    const dWeight = (inputs.debtToEquity || 0) / (1 + (inputs.debtToEquity || 0));
    const afterTaxDebt = (inputs.preTaxCostOfDebt || 0) * (1 - (inputs.taxRate || 0) / 100);
    const wacc = ke * eWeight + afterTaxDebt * dWeight;
    const waccDec = wacc / 100;

    // Project forward to get last year UFCF
    let rev = lastRev;
    const n = inputs.projectionYears || 5;
    const growths = inputs.revenueGrowthRates || [];
    const margins = inputs.ebitdaMargins || [];
    let lastUFCF = 0;
    let lastEBITDA = 0;
    let sumPV = 0;

    for (let i = 0; i < n; i++) {
      const g = (growths[i] || 0) / 100;
      const prevRev = rev;
      rev = rev * (1 + g);
      const margin = (margins[i] || 0) / 100;
      const ebitda = rev * margin;
      const da = rev * ((inputs.daPercentRevenue || 0) / 100);
      const capex = rev * ((inputs.capexPercentRevenue || 0) / 100);
      const nwcChange = (rev - prevRev) * ((inputs.nwcPercentRevenueChange || 0) / 100);
      const ebit = ebitda - da;
      const ufcf = ebit * (1 - (inputs.taxRate || 0) / 100) + da - capex - nwcChange;
      const df = 1 / Math.pow(1 + waccDec, i + 1);
      sumPV += ufcf * df;
      lastUFCF = ufcf;
      lastEBITDA = ebitda;
    }

    const termDF = 1 / Math.pow(1 + waccDec, n);
    const shares = inputs.dilutedShares || 1;
    const netDebt = inputs.netDebt || 0;

    const method = inputs.terminalValueMethod || 'gordon-growth';
    let price: number | null = null;

    if (method === 'gordon-growth') {
      const gRate = (inputs.terminalGrowthRate || 0) / 100;
      if (waccDec > gRate) {
        const tv = (lastUFCF * (1 + gRate)) / (waccDec - gRate);
        const ev = sumPV + tv * termDF;
        price = (ev - netDebt) / shares;
      }
    }
    if (method === 'exit-multiple' || price === null) {
      const tv = lastEBITDA * (inputs.exitMultiple || 10);
      const ev = sumPV + tv * termDF;
      price = (ev - netDebt) / shares;
    }

    if (price !== null && Number.isFinite(price)) {
      return `$${price.toFixed(2)}/share`;
    }
    return '';
  } catch {
    return '';
  }
}

// List models
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDB();
  const models = db
    .prepare(
      `SELECT id, name, description, model_type as modelType, company_name as companyName,
              summary, created_at as createdAt, updated_at as updatedAt
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

  // Compute valuation summary for dashboard cards
  const summary = computeSummary(dataStr);

  db.prepare(
    `UPDATE models
     SET name = COALESCE(?, name),
         company_name = COALESCE(?, company_name),
         description = COALESCE(?, description),
         data = ?,
         summary = ?,
         updated_at = datetime('now')
     WHERE id = ?`
  ).run(name, companyName, description, dataStr, summary, req.params.id);

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

  // Recompute summary from restored version
  const summary = computeSummary(version.data);

  db.prepare(
    `UPDATE models SET data = ?, summary = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(version.data, summary, req.params.id);

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

// Unshare model (revoke share link)
router.delete('/:id/share', (req: AuthRequest, res: Response) => {
  const db = getDB();

  const model = db
    .prepare('SELECT id FROM models WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.userId);

  if (!model) {
    res.status(404).json({ error: 'Model not found' });
    return;
  }

  db.prepare('DELETE FROM share_tokens WHERE model_id = ?').run(req.params.id);
  res.json({ ok: true });
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
