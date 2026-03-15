export const DEFECT_FAIL_TRIGGERS = [
  'fail',
  'failed',
  'no',
  'present but not maintained',
  'overdue',
  'remove from service',
  'removed from service',
  'repair required',
  'unsafe to operate',
];

export const DEFECT_PASS_VALUES = [
  'pass',
  'yes',
  'current',
  'compliant',
  'not required',
  'fit for use',
];

function normalizeValue(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase();
}

export function isDefectAnswerValue(value: string | null | undefined): boolean {
  const normalized = normalizeValue(value);
  if (!normalized) return false;

  if (DEFECT_FAIL_TRIGGERS.includes(normalized)) return true;
  if (normalized.startsWith('fail')) return true;
  if (normalized.includes('remove from service')) return true;
  if (normalized.includes('repair required')) return true;
  if (normalized.includes('unsafe to operate')) return true;

  return false;
}

export function isPassAnswerValue(value: string | null | undefined): boolean {
  const normalized = normalizeValue(value);
  return DEFECT_PASS_VALUES.includes(normalized);
}

export function isInspectionResponseDefect(response: {
  defect_flag?: boolean | null;
  pass_fail_status?: string | null;
  answer_value?: string | null;
}): boolean {
  if (isDefectAnswerValue(response.pass_fail_status) || isDefectAnswerValue(response.answer_value)) {
    return true;
  }

  // Explicit pass is treated as non-defect unless a clear fail answer exists.
  if (normalizeValue(response.pass_fail_status) === 'pass') {
    return false;
  }

  if (isPassAnswerValue(response.answer_value)) {
    return false;
  }

  return !!response.defect_flag;
}
