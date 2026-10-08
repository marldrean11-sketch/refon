import { SectionHeading } from './SectionHeading.jsx'
import { Container } from '../../features/design/Container.jsx'

/**
 * Page section wrapper.
 *
 * Sections alternate between the warm canvas, a pure white sheet, and the muted
 * panel, separated by a hairline rather than by a change of shadow. The rhythm is
 * deliberately tighter than the previous 16/20/28 step: with eight or more
 * sections on the homepage, generous padding stacked up until every section felt
 * like a separate page, and the page stopped reading as one composition.
 *
 * `index` optionally prints a large monospace section number in the corner. It is
 * the one purely editorial flourish in the system, and it earns its place by
 * making a long page legible as an ordered argument rather than a stack.
 *
 * There is deliberately no `dark` tone. The redesign rule is that the main page
 * is never a dark background, and a section-level opt-in is exactly how that rule
 * gets broken one component at a time — it was, twice, before this was removed.
 * Contrast on a light page comes from the ink and panel tokens instead.
 */
export function Section({
  id,
  children,
  className = '',
  tone = 'canvas',
  contained = true,
  index,
}) {
  const toneClasses = {
    canvas: 'bg-canvas',
    white: 'bg-surface',
    muted: 'bg-surface-2',
  }

  return (
    <section
      id={id}
      className={`${toneClasses[tone] ?? toneClasses.canvas} py-14 sm:py-16 lg:py-20 ${className}`}
    >
      <Container size={contained ? 'default' : 'full'}>
        {index ? (
          <p
            className="mb-8 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle"
            aria-hidden="true"
          >
            {index}
          </p>
        ) : null}
        {children}
      </Container>
    </section>
  )
}

export { SectionHeading }