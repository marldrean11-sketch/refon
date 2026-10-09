/**
 * The ReFon A/B/C grading scale.
 *
 * `legacyLabels` maps the free-text `cosmeticCondition` values that predate the
 * graded schema onto the graded scale, so old rows and the existing seller form
 * keep rendering a grade without a data migration blocking the UI.
 */
export const CONDITION_GRADES = Object.freeze({
  A: {
    id: 'A',
    label: 'Excellent',
    headline: 'Grade A — Excellent',
    summary: 'Minimal signs of use.',
    description:
      'Looks close to new. Light micro-marks at most, usually only visible under direct light. No dents, no cracks, clean glass and frame.',
    accent: 'text-accent-700',
    chip: 'bg-accent-50 text-accent-800 ring-accent-200',
    bar: 'bg-accent-500',
    legacyLabels: ['Like New', 'Excellent', 'Mint'],
  },
  B: {
    id: 'B',
    label: 'Very Good',
    headline: 'Grade B — Very Good',
    summary: 'Minor cosmetic marks.',
    description:
      'Visible light wear from normal use. Small scratches on the frame or rear panel, clean display and camera glass, everything fully functional.',
    accent: 'text-flare-700',
    chip: 'bg-flare-50 text-flare-900 ring-flare-200',
    bar: 'bg-grade-b',
    legacyLabels: ['Good', 'Very Good'],
  },
  C: {
    id: 'C',
    label: 'Good',
    headline: 'Grade C — Good',
    summary: 'Visible signs of use, fully functional.',
    description:
      'Clear cosmetic wear such as scuffs or small marks on the back or frame. Nothing structural, no cracked glass, and every function passes testing.',
    accent: 'text-orange-700',
    chip: 'bg-orange-50 text-orange-900 ring-orange-200',
    bar: 'bg-grade-c',
    legacyLabels: ['Fair', 'Good Condition', 'Used'],
  },
})

export const CONDITION_GRADE_ORDER = Object.freeze(['A', 'B', 'C'])

/** Resolves a grade record, falling back to Grade C so nothing ever renders blank. */
export function getConditionGrade(grade) {
  return CONDITION_GRADES[grade] ?? CONDITION_GRADES.C
}

/**
 * Best-effort grade for a listing that has not been graded yet.
 * Only used until the graded column is backfilled everywhere.
 */
export function gradeFromLegacyCondition(condition) {
  const label = String(condition ?? '').trim().toLowerCase()

  for (const grade of CONDITION_GRADE_ORDER) {
    if (CONDITION_GRADES[grade].legacyLabels.some((entry) => entry.toLowerCase() === label)) {
      return grade
    }
  }

  return 'C'
}

/** The 11 checks every ReFon phone passes before it can be listed. */
export const INSPECTION_CHECKS = Object.freeze([
  { id: 'display', label: 'Display tested', detail: 'No dead pixels, cracks, or burn-in' },
  { id: 'touchscreen', label: 'Touchscreen tested', detail: 'Full-surface touch response' },
  { id: 'camera', label: 'Camera tested', detail: 'Front, rear, and video capture' },
  { id: 'speaker', label: 'Speaker tested', detail: 'Earpiece and loudspeaker clarity' },
  { id: 'microphone', label: 'Microphone tested', detail: 'Calls and voice notes record' },
  { id: 'charging', label: 'Charging port tested', detail: 'Charge and data cable connection' },
  { id: 'battery', label: 'Battery tested', detail: 'Health percentage verified' },
  { id: 'wifi', label: 'Wi-Fi tested', detail: 'Connects to known networks' },
  { id: 'bluetooth', label: 'Bluetooth tested', detail: 'Pairs and stays connected' },
  { id: 'buttons', label: 'Buttons tested', detail: 'Power and volume controls' },
  {
    id: 'biometrics',
    label: 'Face ID / Fingerprint tested',
    detail: 'Biometric unlock registers reliably',
  },
])

/** Battery health bands used by the battery indicator and the filter sidebar. */
export const BATTERY_BANDS = Object.freeze([
  {
    id: 'excellent',
    label: '90% and above',
    min: 90,
    tone: 'text-accent-700',
    bar: 'bg-accent-500',
    note: 'Near-new battery life.',
  },
  {
    id: 'good',
    label: '80% – 89%',
    min: 80,
    tone: 'text-ink',
    bar: 'bg-primary-700',
    note: 'Healthy for daily use.',
  },
  {
    id: 'fair',
    label: '70% – 79%',
    min: 70,
    tone: 'text-warning',
    bar: 'bg-warning',
    note: 'Serviceable, budget for a swap.',
  },
  {
    id: 'low',
    label: 'Below 70%',
    min: 0,
    tone: 'text-danger',
    bar: 'bg-danger',
    note: 'Aged battery. Priced accordingly.',
  },
])

export function getBatteryBand(percentage) {
  const value = Number(percentage)

  if (!Number.isFinite(value)) {
    return BATTERY_BANDS[3]
  }

  return BATTERY_BANDS.find((band) => value >= band.min) ?? BATTERY_BANDS[3]
}

/**
 * Human battery explanation. Buyers need to know what the number means before
 * they trust it, so the copy stays on the card.
 */
export function explainBatteryHealth(percentage) {
  const band = getBatteryBand(percentage)
  return `Battery health is how much charge this cell still holds versus a new one. ${band.note}`
}
