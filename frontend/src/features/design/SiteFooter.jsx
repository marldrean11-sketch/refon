/**
 * The footer.
 *
 * Link columns, contact details, social links, the team credit, a newsletter
 * field, and a wordmark that arrives when it scrolls into view. Contact, socials
 * and credits come from `content/site-info.js`.
 *
 * The columns are assembled from `navigation-config.js` rather than restated, so
 * the footer cannot drift from the header, the drawer, and the tab bar. `How we
 * test` appears here because the navbar merged it into `How it works`; nothing
 * became unreachable.
 *
 * The newsletter field validates and confirms on the client. There is no
 * newsletter endpoint in this codebase — the previous footer's form submitted
 * nowhere — so this stores nothing and sends nothing, and its confirmation says
 * as much rather than implying a subscription exists. See the Phase 2 report.
 */
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Mail, MapPin, Phone } from "lucide-react";
import { BrandMark } from "../../components/ui/BrandMark.jsx";
import { FloatingLoops } from "../../components/brand/FloatingLoops.jsx";
import { SoundToggle } from "../../components/ui/SoundToggle.jsx";
import { InstallAppButton } from "../../components/ui/InstallAppButton.jsx";
import { SITE_INFO, boothLabel } from "../../content/site-info.js";
import { useAuth } from "../auth/useAuth.js";
import { AUTH_ROUTES, MARKETPLACE_ROUTES } from "../../lib/routes.js";
import { canSeeBuyerDestinations } from "./navigation-config.js";
import { usePrefersReducedMotion } from "../../lib/motion.ts";

/**
 * Footer columns.
 *
 * Every `to` here is a route that exists today; the Phase 2 test walks each one
 * and asserts it does not 404. `qualityCheck` is the reason the navbar could
 * merge its two "how" links without losing a destination.
 */
const COLUMNS = [
  {
    title: "Shop",
    links: [
      { label: "All phones", to: MARKETPLACE_ROUTES.shop },
      { label: "Categories", to: MARKETPLACE_ROUTES.categories },
      { label: "Your cart", to: MARKETPLACE_ROUTES.cart },
      { label: "Compare", to: MARKETPLACE_ROUTES.compare },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About ReFon", to: MARKETPLACE_ROUTES.about },
      { label: "Sustainability", to: MARKETPLACE_ROUTES.sustainability },
      { label: "Sell your phone", to: MARKETPLACE_ROUTES.sellerApply },
      { label: "How it works", to: MARKETPLACE_ROUTES.howItWorks },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "How we test", to: MARKETPLACE_ROUTES.qualityCheck },
      { label: "Phone health check", to: MARKETPLACE_ROUTES.healthCheck },
      { label: "Warranty", to: MARKETPLACE_ROUTES.warranty },
      { label: "Shipping", to: MARKETPLACE_ROUTES.shipping },
      { label: "Returns", to: MARKETPLACE_ROUTES.returns },
      { label: "FAQ", to: MARKETPLACE_ROUTES.faq },
      { label: "Contact us", to: MARKETPLACE_ROUTES.contact },
      { label: "Rate ReFon", to: MARKETPLACE_ROUTES.feedback },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", to: MARKETPLACE_ROUTES.privacy },
      { label: "Terms", to: MARKETPLACE_ROUTES.terms },
    ],
  },
];

/**
 * Social glyphs, drawn inline: Lucide no longer ships brand marks. Simple
 * outline forms in `currentColor`, so they match the other footer icons.
 */
function FacebookIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V10H7v3.5h2V21h3.5v-7.5H15l.5-3.5h-3V7a1 1 0 0 1 1-1H15z" />
    </svg>
  );
}

function InstagramIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

function TikTokIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5" />
      <path d="M14 3c.4 2.6 2.2 4.3 5 4.5" />
    </svg>
  );
}

const SOCIAL_ICONS = { facebook: FacebookIcon, instagram: InstagramIcon, tiktok: TikTokIcon };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * The footer columns with the purchasing links resolved for this visitor.
 *
 * Cart is a buyer surface. A visitor keeps it, pointed at sign-in so the click is not
 * wasted. A seller or admin loses it: there is nothing to sign into and no cart to
 * open, so a link would only bounce them straight back to their own dashboard.
 */
function columnsFor(user) {
  if (canSeeBuyerDestinations(user)) {
    return COLUMNS;
  }

  return COLUMNS.map((column) => ({
    ...column,
    links: column.links.filter((link) => link.to !== MARKETPLACE_ROUTES.cart),
  }));
}

export function SiteFooter() {
  const { user } = useAuth();
  const reducedMotion = usePrefersReducedMotion();

  const accountLinks = user
    ? [
        { label: "Account settings", to: AUTH_ROUTES.account },
        {
          label: user.role === "ADMIN" ? "Admin dashboard" : "Seller dashboard",
          to: user.role === "ADMIN" ? AUTH_ROUTES.admin : AUTH_ROUTES.seller,
        },
      ]
    : [
        { label: "Sign in", to: AUTH_ROUTES.login },
        { label: "Create an account", to: AUTH_ROUTES.register },
      ];

  return (
    <footer
      data-testid="site-footer"
      className="relative mt-auto overflow-hidden border-t border-line bg-panel text-ink"
    >
      {/* The extra bottom clearance clears the mobile tab bar, which is fixed to
          the viewport until the desktop navigation takes over at `lg`. */}
      <FloatingLoops floor={false} density="light" className="opacity-60" />
      <div className="relative mx-auto w-full max-w-7xl px-4 pb-32 pt-14 sm:px-6 lg:px-8 lg:pb-10">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(5,1fr)] lg:gap-8">
          <div className="sm:col-span-2 lg:col-span-1">
            <BrandMark />

            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted">
              {SITE_INFO.tagline} A marketplace for tested pre-loved phones.
              Every listing publishes its grade, measured battery health, and
              warranty term before you decide anything.
            </p>

            <ContactBlock />

            <dl className="mt-7 max-w-sm border-t border-line pt-5 text-sm">
              {[
                ["11", "inspection checks per phone"],
                ["A / B / C", "published condition grade"],
                ["7", "day return window"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="grid grid-cols-[6.5rem_1fr] items-baseline gap-3 py-1.5"
                >
                  <dt className="font-mono font-semibold tabular-nums text-accent">
                    {value}
                  </dt>
                  <dd className="text-muted">{label}</dd>
                </div>
              ))}
            </dl>

            <NewsletterForm reduced={reducedMotion} />
          </div>

          {columnsFor(user).map((column) => (
            <FooterColumn
              key={column.title}
              title={column.title}
              links={column.links}
              user={user}
            />
          ))}

          <FooterColumn title="Account" links={accountLinks} user={user} />
        </div>

        <GiantWordmark reduced={reducedMotion} />

        <div className="mt-8 flex flex-col gap-4 border-t border-line pt-6 text-[13px] text-muted sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <p>© {new Date().getFullYear()} ReFon. Pre-loved, with the measurements published.</p>
            <p data-testid="footer-credits" className="text-subtle">{SITE_INFO.credits}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <InstallAppButton />
            <SoundToggle />
            <SocialLinks />
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links, user }) {
  return (
    <div>
      {/* `text-white` is explicit and not inherited. The global heading rule in
          `index.css` sets `text-ink` on every `h1`–`h6` in the base layer, so a
          heading inside the dark footer picks up near-black text unless it says
          otherwise — which is exactly what happened here. */}
      <h2 className="font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-accent">
        {title}
      </h2>
      <ul className="mt-4 flex flex-col gap-2.5">
        {links.map((link) => {
          // A visitor's Cart link goes to sign-in and remembers the cart, so the
          // click finishes where it started rather than on a generic dashboard.
          const gated = link.to === MARKETPLACE_ROUTES.cart && !user;

          return (
            <li key={link.label}>
              <Link
                to={gated ? AUTH_ROUTES.login : link.to}
                state={gated ? { from: MARKETPLACE_ROUTES.cart } : undefined}
                data-testid="footer-link"
                className="text-[15px] text-muted transition-colors duration-150 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Newsletter signup.
 *
 * Validates and confirms entirely on the client. There is no newsletter endpoint
 * in the backend, so there is nothing to POST to; the confirmation is honest
 * about that rather than claiming an address was stored.
 *
 * The error is inline and tied to the input with `aria-describedby`, and
 * `aria-invalid` marks the field, so a screen reader hears the problem rather
 * than only seeing a red border.
 */
function NewsletterForm({ reduced }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [isDone, setIsDone] = useState(false);
  const inputRef = useRef(null);

  function onSubmit(event) {
    event.preventDefault();

    const trimmed = email.trim();

    if (!trimmed) {
      setError("Enter an email address.");
      setIsDone(false);
      inputRef.current?.focus();
      return;
    }

    if (!EMAIL_PATTERN.test(trimmed)) {
      setError("That does not look like an email address.");
      setIsDone(false);
      inputRef.current?.focus();
      return;
    }

    setError(null);
    setIsDone(true);
  }

  function onChange(event) {
    setEmail(event.target.value);
    if (error) setError(null);
  }

  return (
    <form
      data-testid="newsletter"
      onSubmit={onSubmit}
      noValidate
      className="mt-8 max-w-sm"
    >
      <label
        htmlFor="newsletter-email"
        className="block font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-accent"
      >
        Product drops
      </label>

      <div className="mt-3 flex gap-2">
        <input
          id="newsletter-email"
          ref={inputRef}
          data-testid="newsletter-input"
          type="email"
          name="email"
          value={email}
          onChange={onChange}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "newsletter-error" : "newsletter-hint"}
          placeholder="you@example.com"
          className="min-h-11 min-w-0 flex-1 rounded-control border border-line-2 bg-card px-4 text-[15px] text-ink placeholder:text-subtle transition-colors duration-150 hover:border-subtle focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        <button
          type="submit"
          data-testid="newsletter-submit"
          className="rf-bounce min-h-11 shrink-0 rounded-control bg-accent px-5 text-[15px] font-semibold text-page transition-colors duration-150 hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel"
        >
          Join
        </button>
      </div>

      {error ? (
        <p
          id="newsletter-error"
          data-testid="newsletter-error"
          role="alert"
          className="mt-2 text-[13px] text-danger"
        >
          {error}
        </p>
      ) : isDone ? (
        <motion.p
          data-testid="newsletter-success"
          initial={reduced ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduced ? { duration: 0 } : { duration: 0.25 }}
          className="mt-2 flex items-center gap-2 text-[13px] text-accent"
        >
          <Check
            className="size-4 shrink-0"
            strokeWidth={2}
            aria-hidden="true"
          />
          Thanks — there is no newsletter service wired up yet, so nothing was
          sent.
        </motion.p>
      ) : (
        <p id="newsletter-hint" className="mt-2 text-[13px] text-muted">
          Occasional notes on what we list and what we test.
        </p>
      )}
    </form>
  );
}

/**
 * The wordmark across the bottom of the footer.
 *
 * A closing signature rather than a headline: oversized, one line, the last thing
 * on the page. It rises into place once, on entry, and never again — a signature
 * that animates on every scroll is a signature nobody notices.
 *
 * Two things that are easy to get wrong and were:
 *
 *   - **No clipping.** `leading-[0.78]` with `overflow-hidden` cut the bowls of
 *     the `e` and `o` off flat, so the wordmark read as a slab of broken
 *     letterforms. The line box is now tall enough for the glyphs.
 *   - **Decorative only.** It is `aria-hidden` and repeats the logo above, so
 *     its quiet tone is a deliberate echo rather than text anyone must read.
 */
function GiantWordmark({ reduced }) {
  return (
    <motion.div
      data-testid="footer-wordmark"
      aria-hidden="true"
      initial={reduced ? false : { opacity: 0, y: "18%" }}
      whileInView={{ opacity: 1, y: "0%" }}
      viewport={{ once: true, amount: 0.4 }}
      transition={
        reduced ? { duration: 0 } : { duration: 0.7, ease: [0.22, 1, 0.36, 1] }
      }
      className="pointer-events-none mt-8 select-none"
    >
      <span
        className="block whitespace-nowrap text-center font-display font-extrabold leading-none tracking-[-0.05em] text-primary-500"
        style={{
          // Sized in viewport units so it spans the width at every breakpoint
          // without a media query, capped at 20rem so it cannot outgrow the
          // footer on a very wide display, and stepped *up* from plain `vw` on
          // narrow screens — at 23vw a 390px phone got a 90px wordmark, which
          // reads as a heading rather than the closing signature it is.
          fontSize: "min(22vw, 16rem)",
        }}
      >
        re<span className="text-accent/70">fon</span>
      </span>
    </motion.div>
  );
}

/** Email, phone, and where to find the booth. */
function ContactBlock() {
  const { contact, location } = SITE_INFO;
  const row = "flex items-start gap-2.5 text-sm text-muted";
  return (
    <ul data-testid="footer-contact" className="mt-6 flex max-w-sm flex-col gap-2.5">
      <li className={row}>
        <Mail className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={1.75} aria-hidden="true" />
        <a href={`mailto:${contact.email}`} className="break-all transition-colors hover:text-accent">
          {contact.email}
        </a>
      </li>
      <li className={row}>
        <Phone className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={1.75} aria-hidden="true" />
        <a href={contact.phoneHref} className="transition-colors hover:text-accent">
          {contact.phone}
        </a>
      </li>
      <li className={row}>
        <MapPin className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={1.75} aria-hidden="true" />
        <span>
          {location.venue}, {location.city}
          <br />
          {boothLabel(location)}
        </span>
      </li>
    </ul>
  );
}

/**
 * Social icons. An account without an `href` yet is shown, so the layout is
 * final, but rendered as a disabled placeholder rather than a link to nowhere.
 */
function SocialLinks() {
  return (
    <ul data-testid="footer-socials" className="flex items-center gap-2">
      {SITE_INFO.socials.map((social) => {
        const Icon = SOCIAL_ICONS[social.id] ?? TikTokIcon;
        const base =
          "grid size-11 place-items-center rounded-full border border-line-2 text-ink transition-colors duration-150";
        return (
          <li key={social.id}>
            {social.href ? (
              <a
                href={social.href}
                target="_blank"
                rel="noreferrer"
                aria-label={`ReFon on ${social.label}`}
                className={`rf-bounce ${base} hover:border-accent hover:text-accent`}
              >
                <Icon className="size-[18px]" aria-hidden="true" />
              </a>
            ) : (
              <span
                role="img"
                aria-label={`${social.label} (coming soon)`}
                title={`${social.label}: coming soon`}
                className={`${base} cursor-not-allowed opacity-50`}
              >
                <Icon className="size-[18px]" aria-hidden="true" />
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
