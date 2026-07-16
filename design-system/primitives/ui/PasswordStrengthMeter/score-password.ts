/**
 * scorePassword — deterministic 0..4 strength score.
 *
 * Lives next to PasswordStrengthMeter but is exported as a separate module so
 * signup/reset routes can read the score directly without re-rendering the
 * meter, and so the meter file is a "components only" module (Fast Refresh
 * happy).
 *
 * Scoring tiers:
 *   - empty                                                → 0
 *   - length < 6                                           → 1  (too weak)
 *   - length ≥ 8  AND ≥ 2 character classes                → 2
 *   - length ≥ 10 AND ≥ 3 character classes                → 3
 *   - length ≥ 12 AND all 4 character classes              → 4
 *
 * Character classes: lowercase, uppercase, digit, symbol.
 * A run of 4+ identical chars in a row drops one tier (never below 1).
 */

export type PasswordStrengthScore = 0 | 1 | 2 | 3 | 4;

export function scorePassword(s: string): PasswordStrengthScore {
  if (!s) return 0;

  const length = s.length;
  const hasLower = /[a-z]/.test(s);
  const hasUpper = /[A-Z]/.test(s);
  const hasDigit = /\d/.test(s);
  const hasSymbol = /[^A-Za-z0-9]/.test(s);
  const classes =
    (hasLower ? 1 : 0) + (hasUpper ? 1 : 0) + (hasDigit ? 1 : 0) + (hasSymbol ? 1 : 0);
  const longRepeat = /(.)\1{3,}/.test(s);

  let score: PasswordStrengthScore = 1;
  if (length >= 8 && classes >= 2) score = 2;
  if (length >= 10 && classes >= 3) score = 3;
  if (length >= 12 && classes >= 4) score = 4;
  if (length < 6) score = 1;

  if (longRepeat && score > 1) {
    score = (score - 1) as PasswordStrengthScore;
  }

  return score;
}
