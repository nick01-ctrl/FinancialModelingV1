import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { getDB } from '../db/connection.js';
import * as aiService from '../services/ai.js';

const router = Router();

function escapeHtml(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

router.get('/pdf', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const modelId = req.query.modelId as string;
    if (!modelId) {
      res.status(400).json({ error: 'modelId is required' });
      return;
    }

    const db = getDB();
    const model = db
      .prepare(
        `SELECT id, name, model_type, company_name, data, created_at, updated_at
         FROM models WHERE id = ? AND user_id = ?`
      )
      .get(modelId, req.userId) as Record<string, string> | undefined;

    if (!model) {
      res.status(404).json({ error: 'Model not found' });
      return;
    }

    let modelData: Record<string, unknown>;
    try {
      modelData = JSON.parse(model.data);
    } catch {
      res.status(500).json({ error: 'Model data is corrupted' });
      return;
    }
    const userName = (
      db.prepare('SELECT name FROM users WHERE id = ?').get(req.userId) as { name: string }
    )?.name || 'Analyst';

    // Generate AI narrative
    let narrative = '';
    try {
      narrative = await aiService.generateNarrative(modelData);
    } catch {
      narrative = 'Executive summary could not be generated.';
    }

    // Build HTML report
    const html = buildReportHTML({
      companyName: model.company_name || 'Company',
      modelType: model.model_type,
      analystName: userName,
      date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      narrative,
      modelData,
    });

    // For now, return HTML directly (Puppeteer PDF can be added when available)
    res.setHeader('Content-Type', 'text/html');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${model.company_name || 'model'}-dcf-report.html"`
    );
    res.send(html);
  } catch (err) {
    console.error('PDF export error:', err);
    res.status(500).json({ error: 'Export failed' });
  }
});

function buildReportHTML(params: {
  companyName: string;
  modelType: string;
  analystName: string;
  date: string;
  narrative: string;
  modelData: Record<string, unknown>;
}): string {
  const inputs = (params.modelData.dcfInputs || {}) as Record<string, unknown>;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(params.companyName)} — DCF Valuation Report</title>
  <style>
    body { font-family: 'Georgia', serif; color: #1a1a2e; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 2rem; }
    .cover { text-align: center; padding: 4rem 0; border-bottom: 2px solid #1a1a2e; margin-bottom: 2rem; }
    .cover h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    .cover .subtitle { color: #666; font-size: 1.1rem; }
    .cover .meta { margin-top: 2rem; font-size: 0.9rem; color: #888; }
    h2 { color: #1a1a2e; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem; margin-top: 2rem; }
    .narrative { font-size: 1rem; line-height: 1.8; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.85rem; }
    th, td { padding: 0.5rem; text-align: right; border-bottom: 1px solid #e2e8f0; }
    th { text-align: left; font-weight: 600; background: #f8fafc; }
    td:first-child { text-align: left; }
    .disclaimer { margin-top: 3rem; padding: 1rem; background: #f8fafc; border-radius: 4px; font-size: 0.8rem; color: #666; }
    .ai-note { background: #fef3c7; padding: 0.2rem 0.4rem; border-radius: 3px; font-size: 0.7rem; }
  </style>
</head>
<body>
  <div class="cover">
    <h1>${escapeHtml(params.companyName)}</h1>
    <div class="subtitle">DCF Valuation Analysis</div>
    <div class="meta">
      <div>Prepared by: ${escapeHtml(params.analystName)}</div>
      <div>${escapeHtml(params.date)}</div>
    </div>
  </div>

  <h2>Executive Summary</h2>
  <div class="narrative">${escapeHtml(params.narrative).replace(/\n/g, '<br>')}</div>

  <h2>Key Assumptions</h2>
  <table>
    <tr><th>Assumption</th><th>Value</th></tr>
    <tr><td>Sector</td><td>${inputs.sector || 'N/A'}</td></tr>
    <tr><td>Projection Period</td><td>${inputs.projectionYears || 5} years</td></tr>
    <tr><td>Tax Rate</td><td>${inputs.taxRate || 0}%</td></tr>
    <tr><td>Risk-Free Rate</td><td>${inputs.riskFreeRate || 0}%</td></tr>
    <tr><td>Equity Risk Premium</td><td>${inputs.equityRiskPremium || 0}%</td></tr>
    <tr><td>Beta</td><td>${inputs.beta || 0}</td></tr>
    <tr><td>Pre-Tax Cost of Debt</td><td>${inputs.preTaxCostOfDebt || 0}%</td></tr>
    <tr><td>D/E Ratio</td><td>${inputs.debtToEquity || 0}x</td></tr>
    <tr><td>Terminal Growth Rate</td><td>${inputs.terminalGrowthRate || 0}%</td></tr>
    <tr><td>Exit Multiple (EV/EBITDA)</td><td>${inputs.exitMultiple || 0}x</td></tr>
    <tr><td>Net Debt</td><td>$${inputs.netDebt || 0}M</td></tr>
    <tr><td>Diluted Shares</td><td>${inputs.dilutedShares || 0}M</td></tr>
  </table>

  <h2>Methodology</h2>
  <p>This valuation was performed using a Discounted Cash Flow (DCF) analysis. Unlevered free cash flows were projected for ${inputs.projectionYears || 5} years and discounted at the weighted average cost of capital (WACC). Terminal value was calculated using the ${inputs.terminalValueMethod === 'gordon-growth' ? 'Gordon Growth Model with a perpetuity growth rate of ' + (inputs.terminalGrowthRate || 0) + '%' : 'Exit Multiple method with an EV/EBITDA multiple of ' + (inputs.exitMultiple || 0) + 'x'}.</p>

  <div class="disclaimer">
    <strong>Disclaimer:</strong> All projections contained in this report are forward-looking estimates based on assumptions that may not materialize. Past performance is not indicative of future results. This analysis is provided for informational purposes only and does not constitute investment advice. All figures should be verified against current filings and market data before use in any investment decision.
  </div>
</body>
</html>`;
}

export default router;
