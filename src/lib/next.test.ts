import { describe, expect, it } from 'vitest';
import { safeNext } from './next';

describe('safeNext', () => {
  it('keeps the app’s own pages', () => {
    expect(safeNext('/estudio')).toBe('/estudio');
    expect(safeNext('/estudio?p=p2b69cs22')).toBe('/estudio?p=p2b69cs22');
    expect(safeNext('/unirse/u7rnuyszq9s6')).toBe('/unirse/u7rnuyszq9s6');
  });
  it('drops anything that could leave the site', () => {
    for (const bad of ['//evil.com', '/\\evil.com', '/\\/evil.com', 'https://evil.com', '/unirse/x/../../evil', '/estudio@evil.com', '', null, undefined])
      expect(safeNext(bad)).toBeNull();
  });
});
