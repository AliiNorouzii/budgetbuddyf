import { generateRandId, RAND_ID_EPOCH, RAND_ID_PATTERN, randIdDate } from './rand-id';

describe('generateRandId', () => {
  it('is 6 lowercase base36 characters', () => {
    for (let i = 0; i < 1000; i++) expect(generateRandId()).toMatch(RAND_ID_PATTERN);
  });

  it('encodes the creation day in the first 3 characters', () => {
    const day = new Date('2026-09-25T15:30:00Z');
    const id = generateRandId(day);
    expect(id.slice(0, 3)).toBe((267).toString(36).padStart(3, '0')); // 267 days after 2026-01-01
    expect(randIdDate(id).toISOString()).toBe('2026-09-25T00:00:00.000Z');
  });

  it('sorts ids of different days chronologically', () => {
    const days = [0, 1, 35, 36, 1295, 1296, 40000].map((d) => new Date(RAND_ID_EPOCH + d * 86_400_000));
    const ids = days.map((d) => generateRandId(d));
    expect([...ids].sort()).toEqual(ids);
  });

  it('spreads ids made on the same day', () => {
    const ids = new Set(Array.from({ length: 200 }, () => generateRandId()));
    expect(ids.size).toBeGreaterThan(190);
  });
});
