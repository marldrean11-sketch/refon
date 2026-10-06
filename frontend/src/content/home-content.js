/**
 * Homepage-only content.
 *
 * Everything here is static copy that does not belong in the API layer.
 */

/**
 * The four promises, and where each number comes from.
 *
 * Every figure here is one the site already publishes somewhere else, and the
 * comment on each is the citation. That is deliberate: a trust bar is the single
 * easiest place on a page to print a claim the rest of the site contradicts.
 *
 * Two figures in the Phase 3 brief were **not** used, because they are not true of
 * this codebase:
 *
 *   - "30-day returns" — every policy surface publishes a **7-day** window:
 *     `policy-content.js`, `WarrantySection`, `SiteFooter`, and the cart drawer
 *     all say seven days. Printing 30 here would put the homepage in conflict with
 *     the returns page it links to.
 *   - "40+ point test" — the inspection is **11 points**. `inspectionTotal` is 11
 *     on every seeded listing and `InspectionPanel` says "11-point quality
 *     inspection". A 40-point test would be a test that does not happen.
 *
 * The warranty is likewise not printed as a flat "12 months" promise: only 4 of
 * the 28 approved listings carry a 12-month term (18 are 6-month, 6 are 3-month),
 * so the strip says "on eligible phones" and the exact term is read off the
 * listing itself.
 */
export const TRUST_STRIP = Object.freeze([
  {
    id: 'tested',
    label: '11-point inspection',
    detail: 'Every phone tested before listing',
    // `inspectionTotal` on every approved listing; "11-point quality
    // inspection" in `InspectionPanel`.
  },
  {
    id: 'warranty',
    label: 'Warranty on eligible phones',
    detail: 'Up to 12 months, handled by ReFon',
    // `warrantyMonths` maxes at 12 across the catalog. "Up to", because 24 of 28
    // listings carry a shorter term.
  },
  {
    id: 'returns',
    label: '7-day returns',
    detail: 'If it differs from the listing, send it back',
    // The published return window in `policy-content.js`, `WarrantySection`, and
    // the shipping page.
  },
  {
    id: 'delivery',
    label: 'Free delivery over ₱15,000',
    detail: 'Standard shipping, nationwide',
    // `FREE_STANDARD_DELIVERY_THRESHOLD` in `backend/src/config/checkout.config.js`,
    // published on the shipping page.
  },
])

/**
 * The hero carousel's headline.
 *
 * Structured as lines of *runs* rather than plain strings, because two things
 * need to be expressed per word: each line is masked and revealed on its own, and
 * exactly one word on the whole page is set in the italic serif.
 *
 * "you" is that word. It is the one place a serif earns its keep — it is the
 * promise the rest of the page spends 11 sections keeping — and it is set in the
 * serif *rather than* in green, because on this site green means "verified" and a
 * green adjective would claim a verification the headline has not got.
 */
export const HERO_HEADLINE = Object.freeze([
  Object.freeze([{ text: 'Premium phones.', accent: false }]),
  Object.freeze([{ text: 'Smarter prices.', accent: false }]),
  Object.freeze([
    { text: 'Tested for ', accent: false },
    { text: 'you', accent: true },
    { text: '.', accent: false },
  ]),
])

export const HERO_SUBTEXT =
  'Every phone here has been inspected, graded, and measured before it is listed — the condition, the battery percentage, and the warranty term are on the listing itself, not in the small print.'

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
