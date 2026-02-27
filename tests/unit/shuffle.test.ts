import { describe, expect, it, vi } from 'vitest';
import { shuffleItems } from '../../src/utils/shuffle';

describe('shuffleItems', () => {
  it('returns a shuffled copy without mutating original array', () => {
    const source = [1, 2, 3, 4, 5];
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const shuffled = shuffleItems(source);

    expect(shuffled).toHaveLength(source.length);
    expect(shuffled).not.toBe(source);
    expect(source).toEqual([1, 2, 3, 4, 5]);
    expect([...shuffled].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);

    randomSpy.mockRestore();
  });

  it('uses fisher-yates behavior deterministically when random is mocked', () => {
    const source = ['a', 'b', 'c'];
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);

    const shuffled = shuffleItems(source);

    expect(shuffled).toEqual(['b', 'c', 'a']);
    randomSpy.mockRestore();
  });
});
