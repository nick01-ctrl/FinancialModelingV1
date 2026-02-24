import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const MODEL = 'claude-sonnet-4-20250514';

export async function suggestFieldValue(
  field: string,
  context: Record<string, unknown>
): Promise<{ value: number; confidence: { low: number; high: number }; reasoning: string }> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 500,
    messages: [
      {
        role: 'user',
        content: `You are a financial modeling assistant. Suggest a value for the field "${field}" in a DCF model.

Context:
- Company: ${context.companyName || 'Unknown'}
- Description: ${context.companyDescription || 'Not provided'}
- Sector: ${context.sector || 'Not specified'}
${context.additionalContext ? `- Additional: ${JSON.stringify(context.additionalContext)}` : ''}

Respond in JSON format only:
{
  "value": <number>,
  "confidence": { "low": <number>, "high": <number> },
  "reasoning": "<1-2 sentences explaining the rationale>"
}`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse AI suggestion');
  return JSON.parse(jsonMatch[0]);
}

export async function autoPopulate(
  companyName: string,
  description: string,
  sector: string
): Promise<{ inputs: Record<string, unknown>; aiFields: string[] }> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: `You are a financial modeling assistant. Auto-populate DCF model assumptions for:

Company: ${companyName}
Description: ${description}
Sector: ${sector}

Provide estimates for all the following fields. Use your knowledge to provide reasonable assumptions. All percentage values should be plain numbers (e.g., 15 for 15%, not 0.15).

Respond in JSON format only:
{
  "historicalRevenue": [<year-3>, <year-2>, <year-1>],
  "historicalEBITDA": [<year-3>, <year-2>, <year-1>],
  "historicalDA": [<year-3>, <year-2>, <year-1>],
  "historicalCapex": [<year-3>, <year-2>, <year-1>],
  "historicalNWC": [<year-3>, <year-2>, <year-1>],
  "revenueGrowthRates": [<y1>, <y2>, <y3>, <y4>, <y5>],
  "ebitdaMargins": [<y1>, <y2>, <y3>, <y4>, <y5>],
  "daPercentRevenue": <number>,
  "capexPercentRevenue": <number>,
  "nwcPercentRevenueChange": <number>,
  "taxRate": <number>,
  "riskFreeRate": <number>,
  "equityRiskPremium": <number>,
  "beta": <number>,
  "preTaxCostOfDebt": <number>,
  "debtToEquity": <number>,
  "terminalGrowthRate": <number>,
  "exitMultiple": <number>,
  "netDebt": <number>,
  "dilutedShares": <number>
}`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse AI auto-populate response');
  const inputs = JSON.parse(jsonMatch[0]);

  const aiFields = Object.keys(inputs);
  return { inputs, aiFields };
}

export async function parseFinancialData(
  rawText: string,
  targetFields: string[]
): Promise<{
  fields: Record<string, { value: unknown; confident: boolean; explanation?: string }>;
  unmappedText: string[];
}> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: `You are a financial data parser. Parse the following raw financial data and map it to these DCF model fields: ${targetFields.join(', ')}.

Raw data:
"""
${rawText}
"""

For each field you can identify, provide the value and whether you're confident in the mapping.
Respond in JSON format only:
{
  "fields": {
    "<fieldName>": { "value": <value>, "confident": true/false, "explanation": "<optional explanation if not confident>" }
  },
  "unmappedText": ["<lines that couldn't be mapped>"]
}`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse AI response');
  return JSON.parse(jsonMatch[0]);
}

export async function validateInput(
  field: string,
  value: number,
  context: Record<string, unknown>
): Promise<{ isUnusual: boolean; explanation: string; severity: 'info' | 'warning' | 'error' }> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: `You are a financial modeling assistant. Evaluate whether this input value is unusual:

Field: ${field}
Value: ${value}
Company: ${context.companyName || 'Unknown'}
Sector: ${context.sector || 'Not specified'}

Is this value unusual for this type of input? Respond in JSON:
{
  "isUnusual": true/false,
  "explanation": "<contextual explanation of why or why not>",
  "severity": "info" | "warning" | "error"
}`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse AI validation');
  return JSON.parse(jsonMatch[0]);
}

export async function generateForecast(
  companyName: string,
  sector: string,
  historicals: Record<string, number[]>,
  projectionYears: number
): Promise<{ revenueGrowthRates: number[]; ebitdaMargins: number[]; reasoning: string }> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1000,
    messages: [
      {
        role: 'user',
        content: `You are a financial modeling assistant. Generate a ${projectionYears}-year revenue growth and EBITDA margin forecast.

Company: ${companyName}
Sector: ${sector}
Historical data: ${JSON.stringify(historicals)}

Respond in JSON:
{
  "revenueGrowthRates": [<array of ${projectionYears} growth rates as percentages>],
  "ebitdaMargins": [<array of ${projectionYears} margins as percentages>],
  "reasoning": "<2-3 sentences explaining forecast methodology>"
}`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse AI forecast');
  return JSON.parse(jsonMatch[0]);
}

export async function generateNarrative(
  modelData: Record<string, unknown>,
  steerPrompt?: string
): Promise<string> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: `You are a senior financial analyst writing an executive summary for a DCF valuation report.

Model data:
${JSON.stringify(modelData, null, 2)}

${steerPrompt ? `Additional instructions: ${steerPrompt}` : ''}

Write a 2-3 paragraph executive summary that:
1. Describes the valuation range in plain English
2. Highlights the 2-3 biggest drivers of value
3. Notes any assumptions flagged as unusual
4. Does NOT make investment recommendations — only describes what the model shows

Write in a professional, concise tone suitable for a senior banker or client presentation.`,
      },
    ],
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
}
