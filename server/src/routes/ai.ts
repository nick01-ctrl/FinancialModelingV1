import { Router, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

export const aiRouter = Router();

// All AI routes require authentication
aiRouter.use(authenticate);

// ---------------------------------------------------------------------------
// Anthropic client (lazy initialization)
// ---------------------------------------------------------------------------
let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

const AI_MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 4096;

// ---------------------------------------------------------------------------
// Helper: call Anthropic with a system prompt and user message
// ---------------------------------------------------------------------------
async function callAnthropic(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = MAX_TOKENS,
): Promise<string> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  // Extract text content from the response
  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text content in AI response');
  }
  return textBlock.text;
}

// ---------------------------------------------------------------------------
// Helper: safely parse JSON from AI response (which may include markdown)
// ---------------------------------------------------------------------------
function parseJsonFromResponse<T>(raw: string): T {
  // Try direct parse first
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim()) as T;
    }
    // Try to find a JSON object/array in the response
    const objectMatch = raw.match(/(\{[\s\S]*\})/);
    if (objectMatch) {
      return JSON.parse(objectMatch[1]) as T;
    }
    const arrayMatch = raw.match(/(\[[\s\S]*\])/);
    if (arrayMatch) {
      return JSON.parse(arrayMatch[1]) as T;
    }
    throw new Error('Failed to parse JSON from AI response');
  }
}

// ---------------------------------------------------------------------------
// POST /api/ai/suggest  — per-field AI suggestion
// ---------------------------------------------------------------------------
aiRouter.post('/suggest', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { fieldPath, companyName, sector, context, modelType } = req.body;

    if (!fieldPath || !companyName || !sector || !modelType) {
      res.status(400).json({
        success: false,
        error: 'fieldPath, companyName, sector, and modelType are required',
      });
      return;
    }

    const systemPrompt = `You are a senior financial analyst AI assistant specialized in ${modelType.toUpperCase()} modeling.
Your task is to suggest a reasonable value for a specific financial input field.
Always respond with valid JSON only, no markdown or extra text.

Response format:
{
  "value": <number>,
  "confidence": <number between 0 and 1>,
  "reasoning": "<brief explanation>",
  "range": { "low": <number>, "high": <number> }
}`;

    const userMessage = `Company: ${companyName}
Sector: ${sector}
Model Type: ${modelType}
Field: ${fieldPath}
Context: ${JSON.stringify(context || {})}

Suggest an appropriate value for the field "${fieldPath}" for this ${modelType.toUpperCase()} model of ${companyName} in the ${sector} sector.
Consider industry benchmarks, typical ranges, and the provided context.`;

    const raw = await callAnthropic(systemPrompt, userMessage, 1024);
    const parsed = parseJsonFromResponse<{
      value: number;
      confidence: number;
      reasoning: string;
      range?: { low: number; high: number };
    }>(raw);

    res.json({ success: true, data: parsed });
  } catch (err) {
    console.error('[ai] Suggest error:', err);
    const message = err instanceof Error ? err.message : 'AI suggestion failed';
    res.status(500).json({ success: false, error: message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/parse  — paste & parse raw financial text
// ---------------------------------------------------------------------------
aiRouter.post('/parse', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { rawText, modelType, targetSection } = req.body;

    if (!rawText || !modelType) {
      res.status(400).json({
        success: false,
        error: 'rawText and modelType are required',
      });
      return;
    }

    const systemPrompt = `You are a financial data extraction AI. Your task is to parse raw financial text (e.g., copied from financial statements, reports, or spreadsheets) and extract structured numeric values for a ${modelType.toUpperCase()} financial model.

Always respond with valid JSON only, no markdown or extra text.

Response format:
{
  "parsedFields": [
    {
      "fieldPath": "<dot-separated path like historicalFinancials.0.revenue>",
      "value": <number>,
      "confidence": <number between 0 and 1>,
      "sourceText": "<the original text snippet this was extracted from>"
    }
  ],
  "unparsedFields": ["<field names that could not be found>"],
  "warnings": ["<any warnings about data quality or ambiguity>"]
}`;

    const userMessage = `Model Type: ${modelType}
Target Section: ${targetSection || 'all'}

Raw Text:
${rawText}

Parse this text and extract all financial data fields relevant to a ${modelType.toUpperCase()} model${targetSection ? `, specifically for the "${targetSection}" section` : ''}. Convert all values to plain numbers (e.g., "$1.5B" -> 1500000000, "15%" -> 0.15).`;

    const raw = await callAnthropic(systemPrompt, userMessage);
    const parsed = parseJsonFromResponse<{
      parsedFields: Array<{
        fieldPath: string;
        value: number;
        confidence: number;
        sourceText: string;
      }>;
      unparsedFields: string[];
      warnings: string[];
    }>(raw);

    res.json({ success: true, data: parsed });
  } catch (err) {
    console.error('[ai] Parse error:', err);
    const message = err instanceof Error ? err.message : 'AI parsing failed';
    res.status(500).json({ success: false, error: message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/auto-populate  — AI auto-populate all fields for a company
// ---------------------------------------------------------------------------
aiRouter.post(
  '/auto-populate',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { companyName, companyDescription, sector, modelType } = req.body;

      if (!companyName || !sector || !modelType) {
        res.status(400).json({
          success: false,
          error: 'companyName, sector, and modelType are required',
        });
        return;
      }

      const fieldListByModel: Record<string, string> = {
        dcf: `revenueGrowthRates (array of 5 yearly rates), ebitdaMargins (array of 5 yearly rates), daAsPercentOfRevenue, capexAsPercentOfRevenue, nwcAsPercentOfRevenueChange, taxRate, riskFreeRate, equityRiskPremium, beta, preTaxCostOfDebt, debtToEquityRatio, terminalGrowthRate, exitMultiple, netDebt, dilutedSharesOutstanding, and 3 years of historicalFinancials (each with year, revenue, ebitda, depreciationAmortization, capex, netWorkingCapital)`,
        lbo: `entryMultiple, ltmEbitda, seniorDebt amount, mezzanineDebt amount, revenueGrowthRates (array of 5 yearly rates), ebitdaMargins (array of 5 yearly rates), capexAsPercentOfRevenue, daAsPercentOfRevenue, nwcAsPercentOfRevenueChange, taxRate, exitMultiple, and 3 years of historicalFinancials`,
        ma: `acquirer and target financials (revenue, ebitda, ebit, netIncome, eps, dilutedShares, totalDebt, cashAndEquivalents, totalAssets, totalEquity, ppAndE, intangibles, taxRate, revenueGrowth, ebitdaMargin), dealTerms, and synergies estimates`,
        comps: `subjectCompany metrics (ltmRevenue, ltmEbitda, netIncome, sharesOutstanding, netDebt) and suggested peer companies with their metrics`,
      };

      const systemPrompt = `You are a senior financial analyst AI assistant. Your task is to auto-populate financial model inputs for a company based on publicly available information and reasonable industry assumptions.

IMPORTANT: Use realistic, well-reasoned estimates. Express percentages as decimals (e.g., 5% = 0.05). Express monetary values in millions unless otherwise noted.

Always respond with valid JSON only, no markdown or extra text.

Response format:
{
  "fields": [
    {
      "fieldPath": "<dot-separated field path>",
      "value": <number>,
      "confidence": <number between 0 and 1>,
      "reasoning": "<brief explanation>"
    }
  ],
  "disclaimer": "<standard disclaimer about AI-generated estimates>"
}`;

      const userMessage = `Company: ${companyName}
${companyDescription ? `Description: ${companyDescription}` : ''}
Sector: ${sector}
Model Type: ${modelType}

Auto-populate the following fields for a ${modelType.toUpperCase()} model:
${fieldListByModel[modelType] || 'All relevant fields for this model type.'}

Use your knowledge of ${companyName} in the ${sector} sector to provide the most accurate estimates possible. If the company is not known, use reasonable industry averages.`;

      const raw = await callAnthropic(systemPrompt, userMessage);
      const parsed = parseJsonFromResponse<{
        fields: Array<{
          fieldPath: string;
          value: number;
          confidence: number;
          reasoning: string;
        }>;
        disclaimer: string;
      }>(raw);

      res.json({ success: true, data: parsed });
    } catch (err) {
      console.error('[ai] Auto-populate error:', err);
      const message = err instanceof Error ? err.message : 'AI auto-populate failed';
      res.status(500).json({ success: false, error: message });
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/ai/validate  — field validation
// ---------------------------------------------------------------------------
aiRouter.post('/validate', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { fieldPath, value, companyName, sector, modelType } = req.body;

    if (fieldPath === undefined || value === undefined || !companyName || !sector || !modelType) {
      res.status(400).json({
        success: false,
        error: 'fieldPath, value, companyName, sector, and modelType are required',
      });
      return;
    }

    const systemPrompt = `You are a financial model validation AI. Your task is to check if a user-entered value for a specific field is reasonable for the given company and industry.

Always respond with valid JSON only, no markdown or extra text.

Response format:
{
  "isUnusual": <boolean>,
  "severity": "<'info' | 'warning' | 'critical'>",
  "explanation": "<brief explanation of why the value is or isn't unusual>",
  "typicalRange": { "low": <number>, "high": <number> }
}`;

    const userMessage = `Company: ${companyName}
Sector: ${sector}
Model Type: ${modelType}
Field: ${fieldPath}
User Value: ${value}

Is the value ${value} for "${fieldPath}" reasonable for ${companyName} in the ${sector} sector?
Consider industry benchmarks, historical norms, and common modeling pitfalls.`;

    const raw = await callAnthropic(systemPrompt, userMessage, 1024);
    const parsed = parseJsonFromResponse<{
      isUnusual: boolean;
      severity: 'info' | 'warning' | 'critical';
      explanation: string;
      typicalRange?: { low: number; high: number };
    }>(raw);

    res.json({ success: true, data: parsed });
  } catch (err) {
    console.error('[ai] Validate error:', err);
    const message = err instanceof Error ? err.message : 'AI validation failed';
    res.status(500).json({ success: false, error: message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/forecast  — AI forecast generation
// ---------------------------------------------------------------------------
aiRouter.post('/forecast', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      companyName,
      companyDescription,
      sector,
      historicalFinancials,
      projectionPeriod,
      modelType,
    } = req.body;

    if (!companyName || !sector || !modelType || !projectionPeriod) {
      res.status(400).json({
        success: false,
        error: 'companyName, sector, modelType, and projectionPeriod are required',
      });
      return;
    }

    const systemPrompt = `You are a senior financial forecasting AI. Your task is to generate financial projections based on historical data, company profile, and industry trends.

Express percentages as decimals (e.g., 5% = 0.05). Express monetary values in the same units as the provided historical data.

Always respond with valid JSON only, no markdown or extra text.

Response format:
{
  "projections": [
    {
      "year": <number>,
      "fields": [
        {
          "fieldPath": "<field path such as revenueGrowthRates, ebitdaMargins>",
          "value": <number>,
          "reasoning": "<brief explanation of the forecast logic>"
        }
      ]
    }
  ]
}`;

    const currentYear = new Date().getFullYear();
    const projectionYears = Array.from(
      { length: projectionPeriod },
      (_, i) => currentYear + i + 1,
    );

    const userMessage = `Company: ${companyName}
${companyDescription ? `Description: ${companyDescription}` : ''}
Sector: ${sector}
Model Type: ${modelType}
Projection Period: ${projectionPeriod} years (${projectionYears.join(', ')})

Historical Financials:
${JSON.stringify(historicalFinancials || [], null, 2)}

Generate ${projectionPeriod}-year financial projections for ${companyName}. For each projection year, forecast:
- Revenue growth rate
- EBITDA margin
- Key operating metrics relevant to a ${modelType.toUpperCase()} model

Base your forecast on historical trends, industry outlook for ${sector}, and macroeconomic conditions. Explain your reasoning for each projection.`;

    const raw = await callAnthropic(systemPrompt, userMessage);
    const parsed = parseJsonFromResponse<{
      projections: Array<{
        year: number;
        fields: Array<{
          fieldPath: string;
          value: number;
          reasoning: string;
        }>;
      }>;
    }>(raw);

    res.json({ success: true, data: parsed });
  } catch (err) {
    console.error('[ai] Forecast error:', err);
    const message = err instanceof Error ? err.message : 'AI forecast generation failed';
    res.status(500).json({ success: false, error: message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/narrative  — PDF narrative generation
// ---------------------------------------------------------------------------
aiRouter.post('/narrative', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { companyName, modelType, inputs, outputs, prompt } = req.body;

    if (!companyName || !modelType) {
      res.status(400).json({
        success: false,
        error: 'companyName and modelType are required',
      });
      return;
    }

    const modelTypeLabels: Record<string, string> = {
      dcf: 'Discounted Cash Flow (DCF)',
      lbo: 'Leveraged Buyout (LBO)',
      ma: 'Merger & Acquisition (M&A)',
      comps: 'Comparable Company Analysis',
    };

    const systemPrompt = `You are a senior investment banking analyst writing professional narrative sections for financial model reports. Your writing should be:
- Professional and suitable for institutional investors
- Data-driven, referencing specific numbers from the model
- Structured with clear sections (Executive Summary, Key Assumptions, Valuation Analysis, Risk Factors, Conclusion)
- Concise but thorough (800-1500 words)

Respond with the narrative text directly (not JSON). Use markdown formatting for headers and structure.`;

    const userMessage = `Company: ${companyName}
Model Type: ${modelTypeLabels[modelType] || modelType}
${prompt ? `Additional Instructions: ${prompt}` : ''}

Model Inputs:
${JSON.stringify(inputs || {}, null, 2)}

Model Outputs:
${JSON.stringify(outputs || {}, null, 2)}

Write a professional investment memo / narrative section for a ${modelTypeLabels[modelType] || modelType} analysis of ${companyName}. Reference specific values from the model inputs and outputs to support your analysis.`;

    const narrative = await callAnthropic(systemPrompt, userMessage);

    res.json({
      success: true,
      data: { narrative },
    });
  } catch (err) {
    console.error('[ai] Narrative error:', err);
    const message = err instanceof Error ? err.message : 'AI narrative generation failed';
    res.status(500).json({ success: false, error: message });
  }
});
