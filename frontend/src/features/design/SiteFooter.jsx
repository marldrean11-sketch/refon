/**
 * The footer.
 *
 * Four link columns, a newsletter field, and a wordmark that arrives when it
 * scrolls into view.
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
import { Check } from "lucide-react";
import { BrandMark } from "../../components/ui/BrandMark.jsx";
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
 * Contrast on the dark panel.
 *
 * White on Night `#0D1633` is 17.8:1. The muted step used for supporting text
 * is `#A3ACC8`, a navy-tinted grey at 7.9:1 — comfortably past the 4.5:1 AA
 * threshold for body text. The green is `#34D399`, safe for text as well as icons.
 */
const MUTED_ON_DARK = "#a3acc8";
const ACCENT_ON_DARK = "#34d399";

/** The wordmark's tone: 3.3:1 on Night, which clears the 3:1 large-text floor. */
const WORDMARK_ON_DARK = "#5d6890";

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
      className="mt-auto overflow-hidden bg-dark text-white"
    >
      {/* The extra bottom clearance clears the mobile tab bar, which is fixed to
          the viewport until the desktop navigation takes over at `lg`. */}
      <div className="mx-auto w-full max-w-7xl px-4 pb-32 pt-14 sm:px-6 lg:px-8 lg:pb-10">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(5,1fr)] lg:gap-8">
          <div className="sm:col-span-2 lg:col-span-1">
            <BrandMark inverse className="focus-visible:ring-offset-dark" />

            <p
              className="mt-5 max-w-sm text-sm leading-relaxed"
              style={{ color: MUTED_ON_DARK }}
            >
              A marketplace for tested refurbished phones. Every listing
              publishes its condition grade, measured battery health, and
              warranty term before you decide anything.
            </p>

            <dl className="mt-7 max-w-sm border-t border-white/15 pt-5 text-sm">
              {[
                ["11", "inspection checks per phone"],
                ["A / B / C", "published condition grade"],
                ["7", "day return window"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="grid grid-cols-[6.5rem_1fr] items-baseline gap-3 py-1.5"
                >
                  <dt
                    className="font-semibold tabular-nums"
                    style={{ color: ACCENT_ON_DARK }}
                  >
                    {value}
                  </dt>
                  <dd style={{ color: MUTED_ON_DARK }}>{label}</dd>
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

        <div className="mt-8 flex flex-col gap-3 border-t border-white/15 pt-6 text-[13px] sm:flex-row sm:items-center sm:justify-between">
          <p style={{ color: MUTED_ON_DARK }}>
            © {new Date().getFullYear()} ReFon. Refurbished, with the
            measurements published.
          </p>
          <p style={{ color: MUTED_ON_DARK }}>
            Free standard delivery over ₱15,000 · 7-day returns
          </p>
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
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white">
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
                className="text-[15px] transition-colors duration-150 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-dark"
                style={{ color: MUTED_ON_DARK }}
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
        className="block text-[13px] font-semibold uppercase tracking-[0.12em] text-white"
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
          className="min-h-11 min-w-0 flex-1 rounded-control border border-white/25 bg-transparent px-3 text-[15px] text-white placeholder:text-white/40 transition-colors duration-150 hover:border-white/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          type="submit"
          data-testid="newsletter-submit"
          className="min-h-11 shrink-0 rounded-control bg-accent px-4 text-[15px] font-semibold text-dark transition-colors duration-150 hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-dark"
        >
          Join
        </button>
      </div>

      {error ? (
        <p
          id="newsletter-error"
          data-testid="newsletter-error"
          role="alert"
          className="mt-2 text-[13px] text-red-300"
        >
          {error}
        </p>
      ) : isDone ? (
        <motion.p
          data-testid="newsletter-success"
          initial={reduced ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduced ? { duration: 0 } : { duration: 0.25 }}
          className="mt-2 flex items-center gap-2 text-[13px] text-white"
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
        <p
          id="newsletter-hint"
          className="mt-2 text-[13px]"
          style={{ color: MUTED_ON_DARK }}
        >
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
 *   - **A real tone.** At 23vw this is large text, so AA asks for 3:1. The
 *     original 7%-white fill measured 1.17:1 and axe flagged it. `#5D6890` is
 *     3.26:1 on Night — quiet against the navy panel, and readable,
 *     which a wordmark should be.
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
        className="block whitespace-nowrap text-center font-display font-black leading-none tracking-[-0.04em]"
        style={{
          // Sized in viewport units so it spans the width at every breakpoint
          // without a media query, capped at 20rem so it cannot outgrow the
          // footer on a very wide display, and stepped *up* from plain `vw` on
          // narrow screens — at 23vw a 390px phone got a 90px wordmark, which
          // reads as a heading rather than the closing signature it is.
          fontSize: "min(24vw, 17rem)",
          color: WORDMARK_ON_DARK,
        }}
      >
        refon
      </span>
    </motion.div>
  );
}
