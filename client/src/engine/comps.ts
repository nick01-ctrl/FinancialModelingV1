import type { CompsInputs, CompsOutputs, PeerMultiples, MultipleStats, ImpliedValuation } from './types';

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

function computeStats(label: string, values: number[]): MultipleStats | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return {
    label,
    values: sorted,
    p25: percentile(sorted, 25),
    median: percentile(sorted, 50),
    p75: percentile(sorted, 75),
    mean: values.reduce((s, v) => s + v, 0) / values.length,
  };
}

export function calculateComps(inputs: CompsInputs): CompsOutputs {
  if (inputs.peers.length === 0) {
    return {
      peerMultiples: [],
      evRevenueStats: null,
      evEbitdaStats: null,
      peStats: null,
      impliedValuations: [],
      error: null,
    };
  }

  // Calculate multiples for each peer
  const peerMultiples: PeerMultiples[] = inputs.peers.map((peer) => ({
    id: peer.id,
    name: peer.name,
    evRevenue: peer.revenue > 0 ? peer.enterpriseValue / peer.revenue : null,
    evEbitda: peer.ebitda > 0 ? peer.enterpriseValue / peer.ebitda : null,
    pe: peer.netIncome > 0 ? peer.marketCap / peer.netIncome : null,
  }));

  // Compute stats for each multiple
  const evRevenueStats = inputs.useEVRevenue
    ? computeStats(
        'EV / Revenue',
        peerMultiples.map((p) => p.evRevenue).filter((v): v is number => v !== null && v > 0)
      )
    : null;

  const evEbitdaStats = inputs.useEVEBITDA
    ? computeStats(
        'EV / EBITDA',
        peerMultiples.map((p) => p.evEbitda).filter((v): v is number => v !== null && v > 0)
      )
    : null;

  const peStats = inputs.usePE
    ? computeStats(
        'P / E',
        peerMultiples.map((p) => p.pe).filter((v): v is number => v !== null && v > 0)
      )
    : null;

  // Implied valuations for the subject company
  const shares = inputs.subjectDilutedShares || 1;
  const netDebt = inputs.subjectNetDebt || 0;
  const impliedValuations: ImpliedValuation[] = [];

  function evToSharePrice(ev: number): number {
    return (ev - netDebt) / shares;
  }

  if (evRevenueStats && inputs.subjectRevenue > 0) {
    impliedValuations.push({
      metric: 'EV / Revenue',
      p25SharePrice: evToSharePrice(inputs.subjectRevenue * evRevenueStats.p25),
      medianSharePrice: evToSharePrice(inputs.subjectRevenue * evRevenueStats.median),
      p75SharePrice: evToSharePrice(inputs.subjectRevenue * evRevenueStats.p75),
    });
  }

  if (evEbitdaStats && inputs.subjectEBITDA > 0) {
    impliedValuations.push({
      metric: 'EV / EBITDA',
      p25SharePrice: evToSharePrice(inputs.subjectEBITDA * evEbitdaStats.p25),
      medianSharePrice: evToSharePrice(inputs.subjectEBITDA * evEbitdaStats.median),
      p75SharePrice: evToSharePrice(inputs.subjectEBITDA * evEbitdaStats.p75),
    });
  }

  if (peStats && inputs.subjectNetIncome > 0) {
    const mcap25 = inputs.subjectNetIncome * peStats.p25;
    const mcapMedian = inputs.subjectNetIncome * peStats.median;
    const mcap75 = inputs.subjectNetIncome * peStats.p75;
    impliedValuations.push({
      metric: 'P / E',
      p25SharePrice: mcap25 / shares,
      medianSharePrice: mcapMedian / shares,
      p75SharePrice: mcap75 / shares,
    });
  }

  return {
    peerMultiples,
    evRevenueStats,
    evEbitdaStats,
    peStats,
    impliedValuations,
    error: null,
  };
}
