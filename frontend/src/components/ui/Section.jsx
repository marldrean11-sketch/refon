import { SectionHeading } from './SectionHeading.jsx'

/**
 * Page section wrapper. One vertical rhythm for every block on the site keeps
 * the long marketing pages from feeling assembled page by page.
 */
export function Section({ id, children, className = '', tone = 'canvas', contained = true }) {
  const toneClasses = {
    canvas: 'bg-canvas',
    white: 'bg-white',
    navy: 'bg-primary-950 text-white',
    muted: 'bg-primary-50',
  }

  const widthClasses = contained
    ? 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'
    : 'px-4 sm:px-6 lg:px-8'

  return (
    <section
      id={id}
      className={`${toneClasses[tone] ?? toneClasses.canvas} py-16 sm:py-20 lg:py-28 ${className}`}
    >
      <div className={widthClasses}>{children}</div>
    </section>
  )
}

export { SectionHeading }
