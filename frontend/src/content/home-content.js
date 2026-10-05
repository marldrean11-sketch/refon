/**
 * Homepage-only content.
 *
 * Everything here is static copy that does not belong in the API layer.
 */

export const TRUST_STRIP = Object.freeze([
  {
    id: 'tested',
    label: '11-point inspection',
    detail: 'Every phone tested before listing',
  },
  {
    id: 'battery',
    label: 'Battery health published',
    detail: 'The measured percentage, on every card',
  },
  {
    id: 'graded',
    label: 'A/B/C condition grading',
    detail: 'Cosmetics reduced to a readable letter',
  },
  {
    id: 'warranty',
    label: 'Warranty on eligible phones',
    detail: 'Administered by ReFon, not the seller',
  },
])

export const WHY_REFURBISHED = Object.freeze([
  {
    title: 'You keep the performance',
    body: 'A flagship from a few years ago still runs its operating system smoothly. The processor in an iPhone 13 did not become slow when it became refurbished.',
  },
  {
    title: 'The saving is substantial',
    body: 'Refurbished flagships commonly land at a third to a half of their original price. That is real money back for a phone that already proved it can do the job.',
  },
  {
    title: 'You find out first',
    body: 'New-phone marketing is where the uncertainty lives. Here the grade, the battery figure, and the inspection results are published before you commit.',
  },
  {
    title: 'It is the greener choice',
    body: 'Keeping a working phone in service for three more years avoids most of the manufacturing impact of replacing it.',
  },
])

export const WARRANTY_HIGHLIGHTS = Object.freeze([
  {
    title: 'Warranty term stated up front',
    body: 'The coverage period in months appears on the listing itself, not buried in a policy page you have to go looking for.',
  },
  {
    title: 'Administered by ReFon',
    body: 'The seller sets the term, but ReFon handles claims. You are not negotiating a six-month-old fault with a stranger.',
  },
  {
    title: '7-day return guarantee',
    body: 'If the phone is materially different from its listing, you can send it back within seven days of delivery.',
  },
])

/**
 * The objections that stop people buying refurbished.
 *
 * ReFon has no delivered orders yet, so these are written as concerns with the
 * answer ReFon publishes — not as testimonials from named customers. Presenting
 * invented purchase experiences as real reviews would be the exact kind of
 * misleading claim this marketplace exists to remove. Real review records
 * replace them in the reviews phase.
 */
export const BUYER_CONCERNS = Object.freeze([
  {
    id: 't1',
    concern: '“Is the battery actually as good as they say?”',
    answer:
      'Every listing publishes the measured percentage. A phone that reads 92% is photographed and listed at 92%, and the health figure is part of the inspection report.',
    speaker: 'The most common question we are asked',
  },
  {
    id: 't2',
    concern: '“How do I know it was not secretly broken?”',
    answer:
      'Eleven functional checks run before a phone can be listed, and the result is shown on the product page rather than described as “fully working”.',
    speaker: 'Covered by the inspection checklist',
  },
  {
    id: 't3',
    concern: '“What if the condition is not what I expected?”',
    answer:
      'The grade is the grade. If a Grade A phone arrives with the marks of a Grade B, that is a return — seven days from delivery, no argument needed.',
    speaker: 'Backed by the return guarantee',
  },
])

export const HERO_STATS = Object.freeze([
  { value: '11', label: 'Checks per phone' },
  { value: '3', label: 'Condition grades' },
  { value: '7', label: 'Day return window' },
])
