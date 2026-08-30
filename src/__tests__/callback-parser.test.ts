import { describe, it, expect } from 'vitest';
import { parseCallbackData } from '../lib/constants';

describe('Telegram Callback Parser', () => {
  it('should parse valid callback data strings', () => {
    expect(parseCallbackData('menu:home')).toEqual({ action: 'menu', params: ['home'] });
    expect(parseCallbackData('cat:123')).toEqual({ action: 'category', params: ['123'] });
    expect(parseCallbackData('page:cat1:2')).toEqual({ action: 'page', params: ['cat1', '2'] });
    expect(parseCallbackData('qty:inc:ord123')).toEqual({ action: 'qty', params: ['inc', 'ord123'] });
    expect(parseCallbackData('checkout:ord123')).toEqual({ action: 'checkout', params: ['ord123'] });
  });

  it('should return null for empty or invalid callback strings', () => {
    expect(parseCallbackData('')).toBeNull();
    expect(parseCallbackData('unknown_format')).toBeNull();
  });
});
