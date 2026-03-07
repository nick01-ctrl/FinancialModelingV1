import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../models/database';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

export const modelsRouter = Router();

// All model routes require authentication
modelsRouter.use(authenticate);

// ---------------------------------------------------------------------------
// Types for database rows
// ---------------------------------------------------------------------------
interface ModelRow {
  id: string;
  user_id: string;
  name: string;
  model_type: string;
  company_name: string;
  description: string | null;
  folder_id: string | null;
  inputs_json: Record<string, unknown>;
  sensitivity_configs_json: unknown[] | null;
  tornado_config_json: Record<string, unknown> | null;
  valuation_summary: string | null;
  created_at: string;
  updated_at: string;
}

interface VersionRow {
  id: string;
  model_id: string;
  version: number;
  data_json: Record<string, unknown>;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function modelRowToMeta(row: ModelRow) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    modelType: row.model_type,
    companyName: row.company_name,
    description: row.description ?? undefined,
    folderId: row.folder_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    valuationSummary: row.valuation_summary ?? undefined,
  };
}

function modelRowToResponse(row: ModelRow) {
  return {
    meta: modelRowToMeta(row),
    inputs: row.inputs_json,
    sensitivityConfigs: row.sensitivity_configs_json ?? undefined,
    tornadoConfig: row.tornado_config_json ?? undefined,
  };
}

const MAX_VERSIONS = 10;

// ---------------------------------------------------------------------------
// GET /api/models  — list user's models with pagination and search/filter
// ---------------------------------------------------------------------------
modelsRouter.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string, 10) || 20));
    const offset = (page - 1) * pageSize;

    const search = (req.query.search as string)?.trim() || null;
    const modelType = (req.query.modelType as string)?.trim() || null;
    const folderId = (req.query.folderId as string)?.trim() || null;
    const sortBy = (req.query.sortBy as string) || 'updated_at';
    const sortDir = (req.query.sortDir as string)?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Validate sortBy to prevent SQL injection
    const allowedSort = ['name', 'created_at', 'updated_at', 'model_type', 'company_name'];
    const safeSortBy = allowedSort.includes(sortBy) ? sortBy : 'updated_at';

    // Build dynamic WHERE clause
    const conditions: string[] = ['user_id = $1'];
    const params: unknown[] = [userId];
    let paramIdx = 2;

    if (search) {
      conditions.push(
        `(LOWER(name) LIKE $${paramIdx} OR LOWER(company_name) LIKE $${paramIdx})`,
      );
      params.push(`%${search.toLowerCase()}%`);
      paramIdx++;
    }

    if (modelType) {
      conditions.push(`model_type = $${paramIdx}`);
      params.push(modelType);
      paramIdx++;
    }

    if (folderId) {
      conditions.push(`folder_id = $${paramIdx}`);
      params.push(folderId);
      paramIdx++;
    }

    const whereClause = conditions.join(' AND ');

    // Count total
    const countResult = await query(
      `SELECT COUNT(*) as total FROM models WHERE ${whereClause}`,
      params,
    );
    const total = parseInt((countResult.rows[0] as { total: string }).total, 10);

    // Fetch page
    const dataResult = await query<ModelRow>(
      `SELECT * FROM models WHERE ${whereClause}
       ORDER BY ${safeSortBy} ${sortDir}
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, pageSize, offset],
    );

    const models = dataResult.rows.map(modelRowToMeta);

    res.json({
      success: true,
      data: {
        models,
        total,
        page,
        pageSize,
      },
    });
  } catch (err) {
    console.error('[models] List error:', err);
    res.status(500).json({ success: false, error: 'Failed to list models' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/models  — create a new model
// ---------------------------------------------------------------------------
modelsRouter.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { meta, inputs, sensitivityConfigs, tornadoConfig } = req.body;

    // Validate required fields
    if (!meta || !meta.name || !meta.modelType) {
      res.status(400).json({
        success: false,
        error: 'Model name and modelType are required',
      });
      return;
    }

    const validModelTypes = ['dcf', 'lbo', 'ma', 'comps'];
    if (!validModelTypes.includes(meta.modelType)) {
      res.status(400).json({
        success: false,
        error: `modelType must be one of: ${validModelTypes.join(', ')}`,
      });
      return;
    }

    const modelId = uuidv4();
    const now = new Date().toISOString();

    await query(
      `INSERT INTO models (
        id, user_id, name, model_type, company_name, description, folder_id,
        inputs_json, sensitivity_configs_json, tornado_config_json,
        valuation_summary, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        modelId,
        userId,
        meta.name,
        meta.modelType,
        meta.companyName || '',
        meta.description || null,
        meta.folderId || null,
        JSON.stringify(inputs || {}),
        sensitivityConfigs ? JSON.stringify(sensitivityConfigs) : null,
        tornadoConfig ? JSON.stringify(tornadoConfig) : null,
        meta.valuationSummary || null,
        now,
        now,
      ],
    );

    // Fetch the created model
    const result = await query<ModelRow>(
      'SELECT * FROM models WHERE id = $1',
      [modelId],
    );

    res.status(201).json({
      success: true,
      data: modelRowToResponse(result.rows[0]),
    });
  } catch (err) {
    console.error('[models] Create error:', err);
    res.status(500).json({ success: false, error: 'Failed to create model' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/models/:id  — get a single model with inputs
// ---------------------------------------------------------------------------
modelsRouter.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const result = await query<ModelRow>(
      'SELECT * FROM models WHERE id = $1 AND user_id = $2',
      [id, userId],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Model not found' });
      return;
    }

    res.json({
      success: true,
      data: modelRowToResponse(result.rows[0]),
    });
  } catch (err) {
    console.error('[models] Get error:', err);
    res.status(500).json({ success: false, error: 'Failed to get model' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/models/:id  — update model (auto-creates version, keeps last 10)
// ---------------------------------------------------------------------------
modelsRouter.put('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { meta, inputs, sensitivityConfigs, tornadoConfig } = req.body;

    await transaction(async (client) => {
      // Verify ownership
      const existing = await client.query<ModelRow>(
        'SELECT * FROM models WHERE id = $1 AND user_id = $2',
        [id, userId],
      );

      if (existing.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Model not found' });
        return;
      }

      const currentModel = existing.rows[0];

      // Create a version snapshot of the current state before updating
      const versionResult = await client.query<{ max_version: number | null }>(
        'SELECT MAX(version) as max_version FROM model_versions WHERE model_id = $1',
        [id],
      );
      const nextVersion = ((versionResult.rows[0]?.max_version) ?? 0) + 1;
      const versionId = uuidv4();

      await client.query(
        `INSERT INTO model_versions (id, model_id, version, data_json, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          versionId,
          id,
          nextVersion,
          JSON.stringify({
            meta: modelRowToMeta(currentModel),
            inputs: currentModel.inputs_json,
            sensitivityConfigs: currentModel.sensitivity_configs_json,
            tornadoConfig: currentModel.tornado_config_json,
          }),
        ],
      );

      // Prune old versions: keep only the last MAX_VERSIONS
      await client.query(
        `DELETE FROM model_versions
         WHERE model_id = $1
           AND id NOT IN (
             SELECT id FROM model_versions
             WHERE model_id = $1
             ORDER BY version DESC
             LIMIT $2
           )`,
        [id, MAX_VERSIONS],
      );

      // Update the model
      const now = new Date().toISOString();
      await client.query(
        `UPDATE models SET
          name = $1,
          model_type = $2,
          company_name = $3,
          description = $4,
          folder_id = $5,
          inputs_json = $6,
          sensitivity_configs_json = $7,
          tornado_config_json = $8,
          valuation_summary = $9,
          updated_at = $10
        WHERE id = $11 AND user_id = $12`,
        [
          meta?.name ?? currentModel.name,
          meta?.modelType ?? currentModel.model_type,
          meta?.companyName ?? currentModel.company_name,
          meta?.description ?? currentModel.description,
          meta?.folderId ?? currentModel.folder_id,
          JSON.stringify(inputs ?? currentModel.inputs_json),
          sensitivityConfigs
            ? JSON.stringify(sensitivityConfigs)
            : (currentModel.sensitivity_configs_json
              ? JSON.stringify(currentModel.sensitivity_configs_json)
              : null),
          tornadoConfig
            ? JSON.stringify(tornadoConfig)
            : (currentModel.tornado_config_json
              ? JSON.stringify(currentModel.tornado_config_json)
              : null),
          meta?.valuationSummary ?? currentModel.valuation_summary,
          now,
          id,
          userId,
        ],
      );

      // Fetch updated model
      const updated = await client.query<ModelRow>(
        'SELECT * FROM models WHERE id = $1',
        [id],
      );

      res.json({
        success: true,
        data: modelRowToResponse(updated.rows[0]),
      });
    });
  } catch (err) {
    // If response was already sent inside transaction (e.g., 404), skip
    if (res.headersSent) return;
    console.error('[models] Update error:', err);
    res.status(500).json({ success: false, error: 'Failed to update model' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/models/:id  — delete a model (cascades to versions)
// ---------------------------------------------------------------------------
modelsRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const result = await query(
      'DELETE FROM models WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId],
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'Model not found' });
      return;
    }

    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    console.error('[models] Delete error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete model' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/models/:id/versions  — list all versions for a model
// ---------------------------------------------------------------------------
modelsRouter.get(
  '/:id/versions',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      // Verify ownership
      const modelResult = await query(
        'SELECT id FROM models WHERE id = $1 AND user_id = $2',
        [id, userId],
      );

      if (modelResult.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Model not found' });
        return;
      }

      const versionsResult = await query<VersionRow>(
        `SELECT id, model_id, version, created_at
         FROM model_versions
         WHERE model_id = $1
         ORDER BY version DESC`,
        [id],
      );

      const versions = versionsResult.rows.map((v) => ({
        id: v.id,
        modelId: v.model_id,
        version: v.version,
        createdAt: v.created_at,
      }));

      res.json({ success: true, data: { versions } });
    } catch (err) {
      console.error('[models] List versions error:', err);
      res.status(500).json({ success: false, error: 'Failed to list versions' });
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/models/:id/versions/:versionId/restore  — restore a version
// ---------------------------------------------------------------------------
modelsRouter.post(
  '/:id/versions/:versionId/restore',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId!;
      const { id, versionId } = req.params;

      await transaction(async (client) => {
        // Verify ownership
        const modelResult = await client.query<ModelRow>(
          'SELECT * FROM models WHERE id = $1 AND user_id = $2',
          [id, userId],
        );

        if (modelResult.rows.length === 0) {
          res.status(404).json({ success: false, error: 'Model not found' });
          return;
        }

        // Fetch the version to restore
        const versionResult = await client.query<VersionRow>(
          'SELECT * FROM model_versions WHERE id = $1 AND model_id = $2',
          [versionId, id],
        );

        if (versionResult.rows.length === 0) {
          res.status(404).json({ success: false, error: 'Version not found' });
          return;
        }

        const versionData = versionResult.rows[0].data_json as {
          meta?: Record<string, unknown>;
          inputs?: Record<string, unknown>;
          sensitivityConfigs?: unknown[];
          tornadoConfig?: Record<string, unknown>;
        };

        // Save current state as a new version before restoring
        const currentModel = modelResult.rows[0];
        const maxVersionResult = await client.query<{ max_version: number | null }>(
          'SELECT MAX(version) as max_version FROM model_versions WHERE model_id = $1',
          [id],
        );
        const nextVersion = ((maxVersionResult.rows[0]?.max_version) ?? 0) + 1;

        await client.query(
          `INSERT INTO model_versions (id, model_id, version, data_json, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [
            uuidv4(),
            id,
            nextVersion,
            JSON.stringify({
              meta: modelRowToMeta(currentModel),
              inputs: currentModel.inputs_json,
              sensitivityConfigs: currentModel.sensitivity_configs_json,
              tornadoConfig: currentModel.tornado_config_json,
            }),
          ],
        );

        // Prune old versions
        await client.query(
          `DELETE FROM model_versions
           WHERE model_id = $1
             AND id NOT IN (
               SELECT id FROM model_versions
               WHERE model_id = $1
               ORDER BY version DESC
               LIMIT $2
             )`,
          [id, MAX_VERSIONS],
        );

        // Restore the model to the version's state
        const restoredMeta = versionData.meta || {};
        const now = new Date().toISOString();

        await client.query(
          `UPDATE models SET
            name = COALESCE($1, name),
            company_name = COALESCE($2, company_name),
            description = $3,
            inputs_json = $4,
            sensitivity_configs_json = $5,
            tornado_config_json = $6,
            valuation_summary = $7,
            updated_at = $8
          WHERE id = $9 AND user_id = $10`,
          [
            restoredMeta.name || currentModel.name,
            restoredMeta.companyName || currentModel.company_name,
            restoredMeta.description || currentModel.description,
            JSON.stringify(versionData.inputs || currentModel.inputs_json),
            versionData.sensitivityConfigs
              ? JSON.stringify(versionData.sensitivityConfigs)
              : null,
            versionData.tornadoConfig
              ? JSON.stringify(versionData.tornadoConfig)
              : null,
            restoredMeta.valuationSummary || currentModel.valuation_summary,
            now,
            id,
            userId,
          ],
        );

        // Fetch and return updated model
        const updated = await client.query<ModelRow>(
          'SELECT * FROM models WHERE id = $1',
          [id],
        );

        res.json({
          success: true,
          data: modelRowToResponse(updated.rows[0]),
        });
      });
    } catch (err) {
      if (res.headersSent) return;
      console.error('[models] Restore version error:', err);
      res.status(500).json({ success: false, error: 'Failed to restore version' });
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/models/:id/share  — generate a share link
// ---------------------------------------------------------------------------
modelsRouter.post(
  '/:id/share',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      // Verify ownership
      const modelResult = await query(
        'SELECT id, name FROM models WHERE id = $1 AND user_id = $2',
        [id, userId],
      );

      if (modelResult.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Model not found' });
        return;
      }

      // Generate a share token (signed JWT with model id, read-only, 30-day expiry)
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        res.status(500).json({ success: false, error: 'Server configuration error' });
        return;
      }

      const shareToken = jwt.sign(
        {
          modelId: id,
          sharedBy: userId,
          readOnly: true,
        },
        secret,
        { expiresIn: '30d' },
      );

      const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      const shareUrl = `${baseUrl}/shared/${shareToken}`;

      res.json({
        success: true,
        data: {
          shareUrl,
          shareToken,
          expiresIn: '30 days',
        },
      });
    } catch (err) {
      console.error('[models] Share error:', err);
      res.status(500).json({ success: false, error: 'Failed to generate share link' });
    }
  },
);
