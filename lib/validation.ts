export type OnboardingValidationResult =
  | { ok: true; firstName: string; familySize: number }
  | { ok: false; error: string };

export function validateOnboarding(
  firstName: string,
  familySizeRaw: string,
): OnboardingValidationResult {
  const trimmed = firstName.trim();
  if (!trimmed) {
    return { ok: false, error: "First name is required." };
  }
  if (trimmed.length > 64) {
    return { ok: false, error: "First name is too long." };
  }

  const familySize = Number.parseInt(familySizeRaw, 10);
  if (!Number.isFinite(familySize) || familySize < 1) {
    return {
      ok: false,
      error: "Family size is required and must be at least 1.",
    };
  }

  return { ok: true, firstName: trimmed, familySize };
}
