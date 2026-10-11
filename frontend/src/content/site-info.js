/**
 * Who runs ReFon and how to reach them, in one place.
 *
 * The footer, the contact page, the About page, and the page metadata all read
 * from here, so changing an email or adding a real social account is a one-line
 * edit. `href: null` on a social link means the account does not exist yet: the
 * icon still shows, but it is rendered as a disabled placeholder rather than a
 * link to nowhere.
 */
export const SITE_INFO = Object.freeze({
  name: 'ReFon',
  /** The public address of the hosted demo (Render). Change when a domain is bought. */
  url: 'https://refon.onrender.com',
  tagline: 'Sulit na, legit pa.',

  contact: Object.freeze({
    email: 'marldrean11@gmail.com',
    phone: '+63 992 643 3435',
    /** `tel:` form of the number above. */
    phoneHref: 'tel:+639926433435',
    hours: 'Reachable during Techno Fair 2026 booth hours.',
  }),

  location: Object.freeze({
    venue: 'Taguig City University',
    city: 'Taguig City',
    country: 'Philippines',
    /** Fill in when the booth is assigned, e.g. '12'. */
    booth: null,
  }),

  /**
   * The "Chat with us" button. Set `messenger` to your page's m.me link (e.g.
   * 'https://m.me/refonph') and `viber` to a viber:// chat link when ready;
   * until then both show as "coming soon" and email and phone still work.
   */
  chat: Object.freeze({
    messenger: null,
    viber: null,
  }),

  /** Placeholders until the accounts exist: set `href` to the real URL. */
  socials: Object.freeze([
    Object.freeze({ id: 'facebook', label: 'Facebook', href: null }),
    Object.freeze({ id: 'instagram', label: 'Instagram', href: null }),
    Object.freeze({ id: 'tiktok', label: 'TikTok', href: null }),
  ]),

  credits: 'Built by BSCS 4B Students, Taguig City University, Techno Fair 2026',
})

/** "Techno Fair Booth #12", or "Techno Fair booth" until a number is assigned. */
export function boothLabel(location = SITE_INFO.location) {
  return location.booth ? `Techno Fair Booth #${location.booth}` : 'Techno Fair booth (number to follow)'
}
