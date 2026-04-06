import { describe, expect, it } from 'vitest';
import { buildAllowedOrigins } from './allowed-origins';

describe('buildAllowedOrigins', () => {
  it('keeps default app and admin origins when explicit origins are provided', () => {
    expect(
      buildAllowedOrigins(
        'http://a.newcn.cc',
        'http://a.newcn.cc:3002',
        'https://a.newcn.cc',
      ),
    ).toEqual([
      'http://a.newcn.cc',
      'http://a.newcn.cc:3002',
      'https://a.newcn.cc',
    ]);
  });
});
