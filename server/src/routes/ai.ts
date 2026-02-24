import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import * as aiService from '../services/ai.js';

const router = Router();
router.use(authenticateToken);

router.post('/suggest', async (req: AuthRequest, res: Response) => {
  try {
    const { field, context } = req.body;
    if (!field) {
      res.status(400).json({ error: 'field is required' });
      return;
    }
    const result = await aiService.suggestFieldValue(field, context || {});
    res.json(result);
  } catch (err) {
    console.error('AI suggest error:', err);
    res.status(500).json({ error: 'AI suggestion failed' });
  }
});

router.post('/auto-populate', async (req: AuthRequest, res: Response) => {
  try {
    const { companyName, description, sector } = req.body;
    if (!companyName) {
      res.status(400).json({ error: 'companyName is required' });
      return;
    }
    const result = await aiService.autoPopulate(companyName, description || '', sector || '');
    res.json(result);
  } catch (err) {
    console.error('AI auto-populate error:', err);
    res.status(500).json({ error: 'AI auto-populate failed' });
  }
});

router.post('/parse', async (req: AuthRequest, res: Response) => {
  try {
    const { rawText, targetFields } = req.body;
    if (!rawText) {
      res.status(400).json({ error: 'rawText is required' });
      return;
    }
    const result = await aiService.parseFinancialData(rawText, targetFields || []);
    res.json(result);
  } catch (err) {
    console.error('AI parse error:', err);
    res.status(500).json({ error: 'AI parse failed' });
  }
});

router.post('/validate', async (req: AuthRequest, res: Response) => {
  try {
    const { field, value, context } = req.body;
    if (!field || value === undefined) {
      res.status(400).json({ error: 'field and value are required' });
      return;
    }
    const result = await aiService.validateInput(field, value, context || {});
    res.json(result);
  } catch (err) {
    console.error('AI validate error:', err);
    res.status(500).json({ error: 'AI validation failed' });
  }
});

router.post('/forecast', async (req: AuthRequest, res: Response) => {
  try {
    const { companyName, sector, historicals, projectionYears } = req.body;
    if (!companyName) {
      res.status(400).json({ error: 'companyName is required' });
      return;
    }
    const result = await aiService.generateForecast(
      companyName,
      sector || '',
      historicals || {},
      projectionYears || 5
    );
    res.json(result);
  } catch (err) {
    console.error('AI forecast error:', err);
    res.status(500).json({ error: 'AI forecast failed' });
  }
});

router.post('/narrative', async (req: AuthRequest, res: Response) => {
  try {
    const { modelData, steerPrompt } = req.body;
    if (!modelData) {
      res.status(400).json({ error: 'modelData is required' });
      return;
    }
    const narrative = await aiService.generateNarrative(modelData, steerPrompt);
    res.json({ narrative });
  } catch (err) {
    console.error('AI narrative error:', err);
    res.status(500).json({ error: 'AI narrative generation failed' });
  }
});

export default router;
