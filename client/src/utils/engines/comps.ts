import type {
  CompsInputs,
  CompsOutputs,
  PeerCompany,
  MultipleName,
  MultipleStats,
  ImpliedValuation,
} from '../../../../shared/types/comps';

// ============================================================
// Comparable Company Analysis Calculation Engine
// ============================================================

/**
 * Helper to extract .value from a FieldValue<number>.
 */
function v(field: { value: number }): number {
  return field.value;
}

/**
 * Main entry point: given CompsInputs, compute peer multiples,
 * statistics, implied valuations, and summary ranges.
 */
export function calculateComps(inputs: CompsInputs): CompsOutputs {
  const { subjectCompany, peerCompanies, selectedMultiples } = inputs;

  // ----------------------------------------------------------
  // 1. Calculate peer multiples for each company
  // ----------------------------------------------------------
  const enrichedPeers = peerCompanies.map((peer) => calculatePeerMultiples(peer));

  // ----------------------------------------------------------
  // 2. Calculate statistics for each selected multiple
  // ----------------------------------------------------------
  const peerMultiples: MultipleStats[] = selectedMultiples
    .map((multiple) => calculateMultipleStats(enrichedPeers, multiple))
    .filter((stats): stats is MultipleStats => stats !== null);

  // ----------------------------------------------------------
  // 3. Compute implied valuations for the subject company
  // ----------------------------------------------------------
  const impliedValuations: ImpliedValuation[] = peerMultiples.map((stats) =>
    calculateImpliedValuation(stats, subjectCompany)
  );

  // ----------------------------------------------------------
  // 4. Summary: aggregate low / mid / high share prices
  // ----------------------------------------------------------
  const summary = calculateSummary(impliedValuations);

  return {
    peerMultiples,
    impliedValuations,
    summary,
  };
}

// ============================================================
// Step 1: Calculate all trading multiples for a peer
// ============================================================
function calculatePeerMultiples(peer: PeerCompany): PeerCompany {
  const ev = v(peer.enterpriseValue);
  const ltmRevenue = v(peer.ltmRevenue);
  const ltmEbitda = v(peer.ltmEbitda);
  const netIncome = v(peer.netIncome);
  const marketCap = v(peer.marketCap);

  const result: PeerCompany = { ...peer };

  // EV / Revenue LTM
  result.evToRevenueLTM = ltmRevenue !== 0 ? ev / ltmRevenue : undefined;

  // EV / EBITDA LTM
  result.evToEbitdaLTM = ltmEbitda !== 0 ? ev / ltmEbitda : undefined;

  // EV / Revenue NTM (if NTM revenue available)
  if (peer.ntmRevenue && v(peer.ntmRevenue) !== 0) {
    result.evToRevenueNTM = ev / v(peer.ntmRevenue);
  }

  // EV / EBITDA NTM (if NTM EBITDA available)
  if (peer.ntmEbitda && v(peer.ntmEbitda) !== 0) {
    result.evToEbitdaNTM = ev / v(peer.ntmEbitda);
  }

  // P/E LTM = Market Cap / Net Income
  result.peRatioLTM = netIncome !== 0 ? marketCap / netIncome : undefined;

  return result;
}

// ============================================================
// Step 2: Compute statistics for a given multiple
// ============================================================
function calculateMultipleStats(
  peers: PeerCompany[],
  multiple: MultipleName
): MultipleStats | null {
  // Collect non-null, finite, positive values for this multiple
  const values: { companyName: string; value: number }[] = [];

  for (const peer of peers) {
    const val = getMultipleValue(peer, multiple);
    if (val !== undefined && isFinite(val) && val > 0) {
      values.push({ companyName: peer.companyName, value: val });
    }
  }

  if (values.length === 0) return null;

  // Sort by value ascending
  const sorted = [...values].sort((a, b) => a.value - b.value);
  const nums = sorted.map((v) => v.value);

  const min = nums[0];
  const max = nums[nums.length - 1];
  const mean = nums.reduce((sum, x) => sum + x, 0) / nums.length;
  const median = percentile(nums, 0.5);
  const percentile25 = percentile(nums, 0.25);
  const percentile75 = percentile(nums, 0.75);

  return {
    multiple,
    values: sorted,
    min,
    max,
    median,
    mean,
    percentile25,
    percentile75,
  };
}

/**
 * Extract the numeric multiple value from a peer for a given multiple name.
 */
function getMultipleValue(peer: PeerCompany, multiple: MultipleName): number | undefined {
  switch (multiple) {
    case 'ev_revenue_ltm':
      return peer.evToRevenueLTM;
    case 'ev_ebitda_ltm':
      return peer.evToEbitdaLTM;
    case 'ev_revenue_ntm':
      return peer.evToRevenueNTM;
    case 'ev_ebitda_ntm':
      return peer.evToEbitdaNTM;
    case 'pe_ltm':
      return peer.peRatioLTM;
    default:
      return undefined;
  }
}

/**
 * Compute a percentile using linear interpolation (inclusive method).
 * Expects a sorted ascending array of numbers with length >= 1.
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 1) return sorted[0];

  // Use the interpolation method: index = p * (n - 1)
  const index = p * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const fraction = index - lower;

  if (lower === upper) return sorted[lower];
  return sorted[lower] + fraction * (sorted[upper] - sorted[lower]);
}

// ============================================================
// Step 3: Implied valuation for the subject company
// ============================================================
function calculateImpliedValuation(
  stats: MultipleStats,
  subject: CompsInputs['subjectCompany']
): ImpliedValuation {
  const multiple = stats.multiple;
  const isEVBased = multiple !== 'pe_ltm';

  const atPercentile25 = computeImpliedAtMultiple(stats.percentile25, multiple, subject, isEVBased);
  const atMedian = computeImpliedAtMultiple(stats.median, multiple, subject, isEVBased);
  const atPercentile75 = computeImpliedAtMultiple(stats.percentile75, multiple, subject, isEVBased);

  return {
    multiple,
    atPercentile25,
    atMedian,
    atPercentile75,
  };
}

/**
 * Given a multiple value, compute implied EV, equity, and share price.
 */
function computeImpliedAtMultiple(
  multipleValue: number,
  multipleName: MultipleName,
  subject: CompsInputs['subjectCompany'],
  isEVBased: boolean
): { enterpriseValue: number; equityValue: number; impliedSharePrice: number } {
  const shares = v(subject.sharesOutstanding);
  const netDebt = v(subject.netDebt);

  if (isEVBased) {
    // EV = multiple x subject metric
    const subjectMetric = getSubjectMetric(subject, multipleName);
    const enterpriseValue = multipleValue * subjectMetric;
    const equityValue = enterpriseValue - netDebt;
    const impliedSharePrice = shares !== 0 ? equityValue / shares : 0;
    return { enterpriseValue, equityValue, impliedSharePrice };
  } else {
    // P/E: Market Cap = multiple x Net Income
    const netIncome = v(subject.netIncome);
    const marketCap = multipleValue * netIncome;
    const impliedSharePrice = shares !== 0 ? marketCap / shares : 0;
    // For P/E, EV = Market Cap + Net Debt
    const enterpriseValue = marketCap + netDebt;
    return { enterpriseValue, equityValue: marketCap, impliedSharePrice };
  }
}

/**
 * Get the subject company's relevant metric for a given EV-based multiple.
 */
function getSubjectMetric(
  subject: CompsInputs['subjectCompany'],
  multipleName: MultipleName
): number {
  switch (multipleName) {
    case 'ev_revenue_ltm':
      return v(subject.ltmRevenue);
    case 'ev_ebitda_ltm':
      return v(subject.ltmEbitda);
    case 'ev_revenue_ntm':
      return subject.ntmRevenue ? v(subject.ntmRevenue) : 0;
    case 'ev_ebitda_ntm':
      return subject.ntmEbitda ? v(subject.ntmEbitda) : 0;
    default:
      return 0;
  }
}

// ============================================================
// Step 4: Summary aggregation across all selected multiples
// ============================================================
function calculateSummary(
  valuations: ImpliedValuation[]
): CompsOutputs['summary'] {
  if (valuations.length === 0) {
    return { lowSharePrice: 0, midSharePrice: 0, highSharePrice: 0 };
  }

  // Collect all 25th percentile prices as "low" candidates,
  // all median prices as "mid" candidates,
  // all 75th percentile prices as "high" candidates.
  const lowPrices = valuations.map((v) => v.atPercentile25.impliedSharePrice);
  const midPrices = valuations.map((v) => v.atMedian.impliedSharePrice);
  const highPrices = valuations.map((v) => v.atPercentile75.impliedSharePrice);

  // Aggregate: take the average across all selected multiples
  const avg = (arr: number[]) => arr.reduce((s, x) => s + x, 0) / arr.length;

  return {
    lowSharePrice: round2(avg(lowPrices)),
    midSharePrice: round2(avg(midPrices)),
    highSharePrice: round2(avg(highPrices)),
  };
}

/**
 * Round to 2 decimal places.
 */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
