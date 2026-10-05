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
      className="rounded-card border border-line bg-white p-6 shadow-card sm:p-7"
    >
      <h2
        id="specifications-heading"
        className="font-display text-2xl font-semibold tracking-tight text-ink"
      >
        Full specifications
      </h2>
      <p className="mt-1.5 text-sm text-muted">
        As recorded by the seller for this device. Fields the seller has not entered are
        left out rather than filled in.
      </p>

      <div className="mt-6 space-y-7">
        {groups.map((group) => (
          <div key={group.id}>
            {group.rows.length > 1 && (
              <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-primary-600">
                {group.title}
              </h3>
            )}
            <dl
              className={`grid gap-3 sm:grid-cols-2 ${
                group.rows.length > 1 ? 'mt-3' : ''
              }`}
            >
              {group.rows.map((row) => (
                <div
                  key={row.key}
                  className="rounded-2xl bg-canvas px-4 py-3 sm:flex sm:items-baseline sm:justify-between sm:gap-4"
                >
                  <dt className="text-xs font-semibold text-muted">{row.label}</dt>
                  <dd className="mt-1 text-sm font-semibold text-ink sm:mt-0 sm:text-right">
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