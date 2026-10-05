/**
 * ReFon policy and process content.
 *
 * Kept as structured data rather than JSX so the same copy can drive the
 * policy pages, the FAQ accordion, and the trust sections on the homepage
 * without duplicating paragraphs.
 */

export const INSPECTION_STAGES = Object.freeze([
  {
    step: 1,
    title: 'Physical inspection',
    summary: 'The outside tells us what happened to the phone.',
    checks: ['Screen and glass', 'Frame and chassis', 'Back panel', 'Camera glass', 'Buttons', 'Ports'],
  },
  {
    step: 2,
    title: 'Hardware testing',
    summary: 'Every function is exercised, not assumed.',
    checks: [
      'Display',
      'Touch response',
      'Cameras',
      'Speakers',
      'Microphone',
      'Charging',
      'Battery health',
      'Connectivity',
    ],
  },
  {
    step: 3,
    title: 'Software & lock check',
    summary: 'We confirm the phone is genuinely free and clear.',
    checks: [
      'Operating system version',
      'Factory reset',
      'Google account lock',
      'iCloud activation lock',
      'IMEI validity',
    ],
  },
  {
    step: 4,
    title: 'Condition grading',
    summary: 'Cosmetic wear becomes a letter a buyer can trust.',
    checks: ['Grade A', 'Grade B', 'Grade C', 'Notes written in plain language'],
  },
  {
    step: 5,
    title: 'Final verification',
    summary: 'A second pass before the listing goes live.',
    checks: [
      'Photographs match the device',
      'Battery figure matches the report',
      'Warranty assigned',
      'Verified status recorded',
    ],
  },
])

export const TRUST_PILLARS = Object.freeze([
  {
    id: 'tested',
    title: 'Quality tested',
    description:
      'Every phone passes an eleven-point functional inspection before it can be listed. Nothing goes live on trust alone.',
  },
  {
    id: 'transparent',
    title: 'Transparent condition',
    description:
      'The grade is published, and so are the marks. You see what the phone actually looks like before you pay.',
  },
  {
    id: 'battery',
    title: 'Battery health, upfront',
    description:
      'Every listing shows the battery percentage we measured. No vague claims about "good battery" left to interpretation.',
  },
  {
    id: 'warranty',
    title: 'Warranty included',
    description:
      'Eligible devices ship with a warranty period stated on the listing, administered by ReFon rather than the seller.',
  },
  {
    id: 'checkout',
    title: 'Secure checkout',
    description:
      'Sessions run on httpOnly cookies, payment details are never stored, and order totals are calculated on our servers.',
  },
  {
    id: 'sellers',
    title: 'Verified sellers',
    description:
      'Sellers are verified before they can list. Unverified accounts cannot publish a phone on ReFon.',
  },
])

export const BUYER_STEPS = Object.freeze([
  { step: 1, title: 'Browse', description: 'Filter by brand, grade, battery health, and budget.' },
  { step: 2, title: 'Compare', description: 'Put phones side by side before you commit.' },
  {
    step: 3,
    title: 'Inspect condition',
    description: 'Read the grade, the photos, the inspection results, and the seller.',
  },
  { step: 4, title: 'Order', description: 'Checkout with cash on delivery, GCash, Maya, or bank transfer.' },
  { step: 5, title: 'Receive', description: 'Tracked delivery, with a 7-day return window.' },
  { step: 6, title: 'Enjoy', description: 'Warranty coverage for as long as the listing stated.' },
])

export const SELLER_STEPS = Object.freeze([
  { step: 1, title: 'Register', description: 'Create a seller account and submit your details.' },
  { step: 2, title: 'Verification', description: 'Our team reviews your identity and contact details.' },
  { step: 3, title: 'Create listing', description: 'Add photos, grade, battery health, and warranty.' },
  { step: 4, title: 'Approval', description: 'A moderator checks the listing before it goes live.' },
  { step: 5, title: 'Sell', description: 'Confirmed orders move through preparing, shipped, and delivered.' },
  { step: 6, title: 'Get paid', description: 'Revenue and completed sales update in your dashboard.' },
])

export const SUSTAINABILITY_POINTS = Object.freeze([
  {
    title: 'Extend device lifespan',
    description:
      'A phone that works well for three more years avoids the cost and waste of a new one.',
  },
  {
    title: 'Reduce electronic waste',
    description:
      'Reuse keeps working hardware out of the waste stream instead of discarding usable devices.',
  },
  {
    title: 'Encourage reuse',
    description:
      'Every listing is another device finding a second owner rather than a new one being manufactured.',
  },
  {
    title: 'Keep tech accessible',
    description:
      'Lower prices mean students and young professionals get capable phones, not broken ones.',
  },
])

export const FAQ_ITEMS = Object.freeze([
  {
    question: 'What does refurbished mean?',
    answer:
      'A refurbished phone is a previously owned device that has been inspected, tested, graded, and — where necessary — repaired. It is not brand new, and we never describe it as new. What you get is a phone whose real condition we have measured and published.',
  },
  {
    question: 'Are refurbished phones safe to buy?',
    answer:
      'The concern with used phones is usually not the hardware, it is the unknown. ReFon removes the unknown. Every phone passes an eleven-point inspection, its IMEI and lock status are checked, and any repair history is disclosed on the listing before you pay.',
  },
  {
    question: 'What does Grade A mean?',
    answer:
      'Grade A means minimal signs of use. Light micro-marks at most, usually only visible under direct light. No dents, no cracks, and clean glass and frame.',
  },
  {
    question: 'How do you test the phones?',
    answer:
      'Each phone goes through physical inspection, hardware testing, a software and account-lock check, grading, and a final verification pass. The full checklist is on our How We Test page.',
  },
  {
    question: 'Is the battery replaced?',
    answer:
      'Sometimes. When a battery falls below our replacement threshold it is replaced before listing, and the listing says so. Otherwise we publish the measured health percentage as-is, so you always know the cell you are getting.',
  },
  {
    question: 'Do refurbished phones come with a warranty?',
    answer:
      'Eligible devices include a ReFon-administered warranty, stated in months on every listing. Coverage is against manufacturing defects and components that fail in normal use — not against cosmetic marks that were disclosed at purchase.',
  },
  {
    question: 'Can I return a phone?',
    answer:
      'Yes. You have seven days from delivery to return a device that is materially different from how it was described. The phone must be in the condition it arrived in, with the accessories included.',
  },
  {
    question: 'Are the phones original?',
    answer:
      'They are genuine devices, not replicas or parts. We verify IMEI validity and check that no activation lock is attached, so you receive a phone that can be used normally and updated.',
  },
  {
    question: 'Are IMEI numbers checked?',
    answer:
      'Yes. IMEI validity and lock status are part of the software check before a listing is approved. The listing shows whether the device passed that verification.',
  },
  {
    question: 'Do the phones come unlocked?',
    answer:
      'Yes, devices ship network-unlocked so you can use any compatible SIM. The supported network bands are listed on each product page.',
  },
  {
    question: 'How long does delivery take?',
    answer:
      'Metro Manila orders typically arrive in two to three business days. Rest of Luzon takes three to five, and provincial delivery five to seven. Express delivery is available at checkout.',
  },
  {
    question: 'How do I sell on ReFon?',
    answer:
      'Register as a seller, submit your details for verification, and once approved you can create a listing with photos, condition grade, battery health, and warranty. A moderator reviews it before it goes live.',
  },
])

export const WARRANTY_TERMS = Object.freeze([
  {
    title: 'What the warranty covers',
    body: 'Manufacturing defects and component failures in normal use, including the display, battery, charging port, cameras, speakers, microphone, and buttons.',
  },
  {
    title: 'How long it lasts',
    body: 'The warranty period is stated in months on each listing, measured from the delivery date. Devices without a warranty term are clearly labelled as sold as-is.',
  },
  {
    title: 'What it does not cover',
    body: 'Physical damage, liquid damage, cosmetic marks that were disclosed at purchase, and modifications made after delivery.',
  },
  {
    title: 'How to make a claim',
    body: 'Open the order in your account, choose Request Warranty Service, and describe the fault. ReFon arranges diagnosis and either repair or replacement.',
  },
])

export const RETURN_TERMS = Object.freeze([
  {
    title: 'Seven days from delivery',
    body: 'You have seven calendar days after the phone arrives to start a return.',
  },
  {
    title: 'Grounds for return',
    body: 'The device differs materially from its listing — wrong grade, undisclosed defect, battery health far below the published figure, or a fault we missed.',
  },
  {
    title: 'Condition required',
    body: 'The phone and its accessories must come back in the condition they arrived in. Original packaging where supplied.',
  },
  {
    title: 'How refunds work',
    body: 'Once the return is verified, the refund goes back to your original payment method within five to seven business days.',
  },
])

export const SHIPPING_TERMS = Object.freeze([
  {
    title: 'Metro Manila',
    body: 'Two to three business days. ₱79 standard, free above ₱15,000.',
  },
  {
    title: 'Rest of Luzon',
    body: 'Three to five business days. ₱129 standard.',
  },
  {
    title: 'Visayas and Mindanao',
    body: 'Five to seven business days. ₱169 standard.',
  },
  {
    title: 'Express delivery',
    body: 'Next business day within Metro Manila. ₱199, available at checkout.',
  },
])
