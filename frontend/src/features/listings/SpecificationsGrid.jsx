/**
 * Groups the specification fields a seller recorded.
 *
 * A phone's specifications mean very little as one flat list, so they are grouped
 * the way a buyer reads them: what it is, what it runs on, what you see, what it
 * photographs with, and how it connects.
 *
 * Two rules the data forces:
 *  - a group with no recorded fields is not rendered at all;
 *  - a group with one field is not given a heading, because "Display" repeated
 *    above a single "Display" row is noise.
 *
 * Nothing here invents a value. A phone with no recorded processor simply has no
 * performance row — which is different from having no processor.
 */
const GROUPS = [
  {
    id: 'identity',
    title: 'Device',
    fields: [
      { key: 'brand', label: 'Brand' },
      { key: 'model', label: 'Model' },
      { key: 'year', label: 'Release year', format: (value) => String(value) },
      { key: 'color', label: 'Colour' },
    ],
  },
  {
    id: 'performance',
    title: 'Performance',
    fields: [
      { key: 'processor', label: 'Processor' },
      { key: 'ram', label: 'RAM' },
      { key: 'operatingSystem', label: 'Operating system' },
    ],
  },
  {
    id: 'media',
    title: 'Display and camera',
    fields: [
      { key: 'displaySpec', label: 'Display' },
      { key: 'cameraSpec', label: 'Camera' },
    ],
  },
  {
    id: 'connectivity',
    title: 'Storage and connectivity',
    fields: [
      { key: 'storage', label: 'Storage' },
      { key: 'networkType', label: 'Network' },
    ],
  },
]

export function SpecificationsGrid({ listing }) {
  const groups = GROUPS.map((group) => ({
    ...group,
    rows: group.fields
      .map((field) => {
        const raw = listing[field.key]
        // "As pictured" is the presenter's fallback for a missing colour. Showing
        // it as a specification would imply the seller described the colour.
        const missing =
          raw == null || String(raw).trim() === '' || String(raw).trim() === 'As pictured'

        if (missing) {
          return null
        }

        return { ...field, value: field.format ? field.format(raw) : String(raw) }
      })
      .filter(Boolean),
  })).filter((group) => group.rows.length > 0)

  if (groups.length === 0) {
    return null
  }

  return (
    <section
      aria-labelledby="specifications-heading"
      className="rounded-card border border-line bg-surface"
    >
      <div className="border-b border-line px-5 py-5 sm:px-6">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-subtle">
          Recorded data
        </p>
        <h2
          id="specifications-heading"
          className="mt-1.5 font-display text-xl font-bold tracking-tight text-ink"
        >
          Full specifications
        </h2>
        <p className="mt-2 text-sm leading-body text-muted">
          As recorded by the seller for this device. Fields the seller has not entered are
          left out rather than filled in.
        </p>
      </div>

      <div className="px-5 py-5 sm:px-6">
        {groups.map((group) => (
          <div key={group.id} className="mb-6 last:mb-0">
            {group.rows.length > 1 && (
              <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-subtle">
                {group.title}
              </h3>
            )}
            <dl
              className={`grid gap-x-8 sm:grid-cols-2 ${
                group.rows.length > 1 ? 'mt-3' : ''
              }`}
            >
              {group.rows.map((row) => (
                <div
                  key={row.key}
                  className="grid grid-cols-[minmax(6rem,42%)_1fr] items-baseline gap-4 border-b border-line py-2.5 last:border-b-0"
                >
                  <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-subtle">
                    {row.label}
                  </dt>
                  <dd className="min-w-0 break-words text-[13px] font-semibold text-ink">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  )
}