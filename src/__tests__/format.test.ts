import { describe, it, expect } from 'vitest';
import { formatVND, formatVNDShort, formatTimeLeft } from '../lib/format';

describe('Format Utility', () => {
  it('should format VND correctly without floating point', () => {
    expect(formatVND(0)).toBe('0đ');
    expect(formatVND(125000)).toBe('125.000đ');
    expect(formatVND(1500000)).toBe('1.500.000đ');
    expect(formatVND(-50000)).toBe('-50.000đ');
  });

  it('should format VND short for buttons', () => {
    expect(formatVNDShort(500)).toBe('500đ');
    expect(formatVNDShort(125000)).toBe('125K');
    expect(formatVNDShort(1500000)).toBe('1.500K');
  });

  it('should format time left correctly', () => {
    const now = new Date();
    const future30m = new Date(now.getTime() + 30 * 60 * 1000);
    const past1m = new Date(now.getTime() - 60 * 1000);

    expect(formatTimeLeft(future30m)).toContain('30 phút');
    expect(formatTimeLeft(past1m)).toBe('Hết hạn');
  });
});
