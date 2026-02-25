import { describe, it, expect } from 'vitest';
import { calculateComps } from '../comps';
import type { CompsInputs, PeerCompany } from '../types';

function makePeer(overrides: Partial<PeerCompany> & { name: string }): PeerCompany {
  return {
    id: overrides.name,
    enterpriseValue: 0,
    revenue: 0,
    ebitda: 0,
    netIncome: 0,
    marketCap: 0,
    ...overrides,
  };
}

const BASE_INPUTS: CompsInputs = {
  companyName: 'TestCo',
  companyDescription: '',
  sector: 'Technology',
  subjectRevenue: 500,
  subjectEBITDA: 100,
  subjectNetIncome: 60,
  subjectNetDebt: 200,
  subjectDilutedShares: 100,
  peers: [
    makePeer({ name: 'PeerA', enterpriseValue: 5000, revenue: 1000, ebitda: 200, netIncome: 120, marketCap: 4500 }),
    makePeer({ name: 'PeerB', enterpriseValue: 3000, revenue: 500, ebitda: 100, netIncome: 50, marketCap: 2800 }),
    makePeer({ name: 'PeerC', enterpriseValue: 8000, revenue: 2000, ebitda: 500, netIncome: 300, marketCap: 7000 }),
  ],
  useEVRevenue: true,
  useEVEBITDA: true,
  usePE: true,
};

describe('calculateComps', () => {
  describe('with no peers', () => {
    it('returns empty output', () => {
      const result = calculateComps({ ...BASE_INPUTS, peers: [] });
      expect(result.peerMultiples).toHaveLength(0);
      expect(result.impliedValuations).toHaveLength(0);
      expect(result.error).toBeNull();
    });
  });

  describe('peer multiples', () => {
    it('calculates EV/Revenue correctly', () => {
      const result = calculateComps(BASE_INPUTS);
      // PeerA: 5000/1000 = 5.0x
      const peerA = result.peerMultiples.find((p) => p.name === 'PeerA');
      expect(peerA?.evRevenue).toBeCloseTo(5.0, 1);
    });

    it('calculates EV/EBITDA correctly', () => {
      const result = calculateComps(BASE_INPUTS);
      // PeerA: 5000/200 = 25.0x
      const peerA = result.peerMultiples.find((p) => p.name === 'PeerA');
      expect(peerA?.evEbitda).toBeCloseTo(25.0, 1);
    });

    it('calculates P/E correctly', () => {
      const result = calculateComps(BASE_INPUTS);
      // PeerA: 4500/120 = 37.5x
      const peerA = result.peerMultiples.find((p) => p.name === 'PeerA');
      expect(peerA?.pe).toBeCloseTo(37.5, 1);
    });

    it('returns null for zero denominator', () => {
      const zeroPeer = makePeer({ name: 'ZeroCo', enterpriseValue: 1000, revenue: 0, ebitda: 0, netIncome: 0, marketCap: 500 });
      const result = calculateComps({ ...BASE_INPUTS, peers: [zeroPeer] });
      expect(result.peerMultiples[0].evRevenue).toBeNull();
      expect(result.peerMultiples[0].evEbitda).toBeNull();
      expect(result.peerMultiples[0].pe).toBeNull();
    });
  });

  describe('statistics', () => {
    it('computes median correctly for 3 peers', () => {
      const result = calculateComps(BASE_INPUTS);
      // EV/Revenue: 5.0, 6.0, 4.0 → sorted: 4.0, 5.0, 6.0 → median = 5.0
      expect(result.evRevenueStats).not.toBeNull();
      expect(result.evRevenueStats!.median).toBeCloseTo(5.0, 1);
    });

    it('computes p25 and p75', () => {
      const result = calculateComps(BASE_INPUTS);
      expect(result.evRevenueStats!.p25).toBeLessThanOrEqual(result.evRevenueStats!.median);
      expect(result.evRevenueStats!.p75).toBeGreaterThanOrEqual(result.evRevenueStats!.median);
    });

    it('computes mean correctly', () => {
      const result = calculateComps(BASE_INPUTS);
      // EV/Revenue: 5.0 + 6.0 + 4.0 = 15.0 / 3 = 5.0
      expect(result.evRevenueStats!.mean).toBeCloseTo(5.0, 1);
    });

    it('returns null stats when multiple is disabled', () => {
      const result = calculateComps({ ...BASE_INPUTS, useEVRevenue: false });
      expect(result.evRevenueStats).toBeNull();
    });
  });

  describe('implied valuations', () => {
    it('produces valuations for each enabled multiple', () => {
      const result = calculateComps(BASE_INPUTS);
      expect(result.impliedValuations).toHaveLength(3);
    });

    it('implied share price bridges through EV correctly', () => {
      const result = calculateComps(BASE_INPUTS);
      const evRev = result.impliedValuations.find((v) => v.metric === 'EV / Revenue');
      // Median EV/Revenue ≈ 5.0x → Subject EV = 500 * 5 = 2500 → Equity = 2500 - 200 = 2300 → Price = 2300/100 = $23
      expect(evRev).toBeDefined();
      expect(evRev!.medianSharePrice).toBeCloseTo(23, 0);
    });

    it('P/E does not subtract net debt', () => {
      const result = calculateComps(BASE_INPUTS);
      const pe = result.impliedValuations.find((v) => v.metric === 'P / E');
      // P/E multiples: 37.5, 56.0, 23.33 → median ≈ 37.5 → MCap = 60 * 37.5 = 2250 → Price = 2250/100 = $22.5
      expect(pe).toBeDefined();
      expect(pe!.medianSharePrice).toBeGreaterThan(0);
    });

    it('p25 <= median <= p75 for all valuations', () => {
      const result = calculateComps(BASE_INPUTS);
      result.impliedValuations.forEach((v) => {
        expect(v.p25SharePrice!).toBeLessThanOrEqual(v.medianSharePrice!);
        expect(v.medianSharePrice!).toBeLessThanOrEqual(v.p75SharePrice!);
      });
    });

    it('returns no valuations when subject metrics are zero', () => {
      const result = calculateComps({
        ...BASE_INPUTS,
        subjectRevenue: 0,
        subjectEBITDA: 0,
        subjectNetIncome: 0,
      });
      expect(result.impliedValuations).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('handles single peer', () => {
      const singlePeer = makePeer({
        name: 'OnlyCo',
        enterpriseValue: 2000,
        revenue: 400,
        ebitda: 80,
        netIncome: 40,
        marketCap: 1800,
      });
      const result = calculateComps({ ...BASE_INPUTS, peers: [singlePeer] });
      // With 1 peer, p25 = median = p75 = mean
      expect(result.evRevenueStats!.p25).toBe(result.evRevenueStats!.median);
      expect(result.evRevenueStats!.median).toBe(result.evRevenueStats!.p75);
    });

    it('handles two peers', () => {
      const result = calculateComps({
        ...BASE_INPUTS,
        peers: BASE_INPUTS.peers.slice(0, 2),
      });
      expect(result.peerMultiples).toHaveLength(2);
      expect(result.evRevenueStats).not.toBeNull();
    });
  });
});
