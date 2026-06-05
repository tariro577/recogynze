import { containsAppearanceComment } from './moderation';

describe('containsAppearanceComment', () => {
  it('flags appearance-based language', () => {
    expect(containsAppearanceComment('Love your new outfit today!')).toBe(true);
    expect(containsAppearanceComment('You always look so pretty')).toBe(true);
    expect(containsAppearanceComment('Nice hair')).toBe(true);
  });

  it('allows professional recognition', () => {
    expect(containsAppearanceComment('Thank you for leading the migration so calmly.')).toBe(false);
    expect(containsAppearanceComment('Your analysis unblocked the whole team.')).toBe(false);
    expect(containsAppearanceComment('')).toBe(false);
  });

  it('matches on word boundaries, not substrings', () => {
    // "dresses" contains "dress" but should not false-positive on "address"
    expect(containsAppearanceComment('You addressed the incident quickly')).toBe(false);
  });
});
