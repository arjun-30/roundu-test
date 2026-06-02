import { describe, it, expect } from 'vitest';
import { getDistance } from '@/lib/utils';

// Coordinates (approx)
// Vellore: 12.9165 N, 79.1325 E
// Katpadi: 12.9913 N, 79.1508 E
// Chennai: 13.0827 N, 80.2707 E
// Bangalore: 12.9716 N, 77.5946 E

describe('getDistance haversine checks', () => {
  it('Vellore <-> Katpadi ~8 km', () => {
    const v = { lat: 12.9165, lng: 79.1325 };
    const k = { lat: 12.9913, lng: 79.1508 };
    const d = getDistance(v, k);
    expect(d).toBeGreaterThan(6);
    expect(d).toBeLessThan(12);
  });

  it('Vellore <-> Chennai ~140 km', () => {
    const v = { lat: 12.9165, lng: 79.1325 };
    const c = { lat: 13.0827, lng: 80.2707 };
    const d = getDistance(v, c);
    expect(d).toBeGreaterThan(120);
    expect(d).toBeLessThan(160);
  });

  it('Vellore <-> Bangalore ~190 km', () => {
    const v = { lat: 12.9165, lng: 79.1325 };
    const b = { lat: 12.9716, lng: 77.5946 };
    const d = getDistance(v, b);
    expect(d).toBeGreaterThan(160);
    expect(d).toBeLessThan(240);
  });
});
