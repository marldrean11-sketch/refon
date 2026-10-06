import { TextField } from '../../../components/ui/TextField.jsx'
import { SelectField } from '../../../components/ui/SelectField.jsx'

/**
 * Customer contact and Philippine delivery address.
 *
 * The region list is the seventeen Philippine regions, grouped by island group so a
 * buyer can find theirs without knowing an administrative code. Grouping is a plain
 * `<optgroup>`, which is what a native select gives us for free and which screen
 * readers announce correctly.
 *
 * Province, city, and barangay stay free text rather than cascading dropdowns. A
 * real cascading list is thousands of entries and needs a maintained data source;
 * inventing one would be worse than asking a buyer to type their own town, and the
 * courier needs their own words anyway.
 *
 * Labels name what belongs in the field rather than relying on a placeholder, which
 * disappears the moment someone starts typing.
 */

/**
 * The seventeen Philippine regions.
 *
 * Only the region is a controlled list. It is also what decides delivery pricing, so
 * getting it right matters more here than anywhere else on the page.
 *
 * Ordered by island group — Luzon, then Visayas, then Mindanao — because that is how
 * the regions are taught and how people look for theirs. The ordering is the only
 * grouping: `SelectField` renders a flat `<select>`, so these are individual options
 * rather than optgroups, and a buyer scrolls past a handful of familiar neighbours
 * instead of opening a menu twice.
 */
const REGION_GROUPS = [
  {
    label: 'Luzon',
    regions: [
      { value: 'NCR', label: 'National Capital Region (NCR)' },
      { value: 'CAR', label: 'Cordillera Administrative Region' },
      { value: 'Region I', label: 'Region I — Ilocos' },
      { value: 'Region II', label: 'Region II — Cagayan Valley' },
      { value: 'Region III', label: 'Region III — Central Luzon' },
      { value: 'Region IV-A', label: 'Region IV-A — CALABARZON' },
      { value: 'Region IV-B', label: 'Region IV-B — MIMAROPA' },
      { value: 'Region V', label: 'Region V — Bicol' },
    ],
  },
  {
    label: 'Visayas',
    regions: [
      { value: 'Region VI', label: 'Region VI — Western Visayas' },
      { value: 'Region VII', label: 'Region VII — Central Visayas' },
      { value: 'Region VIII', label: 'Region VIII — Eastern Visayas' },
    ],
  },
  {
    label: 'Mindanao',
    regions: [
      { value: 'Region IX', label: 'Region IX — Zamboanga Peninsula' },
      { value: 'Region X', label: 'Region X — Northern Mindanao' },
      { value: 'Region XI', label: 'Region XI — Davao' },
      { value: 'Region XII', label: 'Region XII — SOCCSKSARGEN' },
      { value: 'Region XIII', label: 'Region XIII — Caraga' },
    ],
  },
]

/** Flat option list for `SelectField`, which renders a plain `options` array. */
const REGION_OPTIONS = [
  { value: '', label: 'Select your region' },
  ...REGION_GROUPS.flatMap((group) => group.regions),
]

export function CustomerDetailsForm({ details, errors, onChange, isPrefilled }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <TextField
        id="checkout-full-name"
        name="fullName"
        label="Full Name"
        autoComplete="name"
        value={details.fullName}
        onChange={(event) => onChange('fullName', event.target.value)}
        error={errors.fullName}
        hint={isPrefilled ? 'Prefilled from your ReFon account.' : undefined}
        required
      />

      <TextField
        id="checkout-email"
        name="email"
        type="email"
        label="Email Address"
        autoComplete="email"
        inputMode="email"
        value={details.email}
        onChange={(event) => onChange('email', event.target.value)}
        error={errors.email}
        hint={isPrefilled ? 'Prefilled from your ReFon account.' : undefined}
        required
      />

      <TextField
        id="checkout-mobile"
        name="mobile"
        type="tel"
        label="Mobile Number"
        autoComplete="tel"
        inputMode="tel"
        placeholder="0917 123 4567"
        value={details.mobile}
        onChange={(event) => onChange('mobile', event.target.value)}
        error={errors.mobile}
        hint="The courier will contact this number about delivery."
        required
        className="sm:col-span-2"
      />
    </div>
  )
}

export function AddressForm({ details, errors, onChange }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <SelectField
        label="Region"
        value={details.region}
        onChange={(event) => onChange('region', event.target.value)}
        error={errors.region}
        options={REGION_OPTIONS}
        name="region"
        required
        className="sm:col-span-2"
      />

      <TextField
        id="checkout-province"
        name="province"
        label="Province"
        autoComplete="address-level1"
        placeholder="Quezon City"
        value={details.province}
        onChange={(event) => onChange('province', event.target.value)}
        error={errors.province}
        required
      />

      <TextField
        id="checkout-city"
        name="city"
        label="City / Municipality"
        autoComplete="address-level2"
        placeholder="Quezon City"
        value={details.city}
        onChange={(event) => onChange('city', event.target.value)}
        error={errors.city}
        required
      />

      <TextField
        id="checkout-barangay"
        name="barangay"
        label="Barangay"
        autoComplete="address-level3"
        placeholder="Bagumbayan"
        value={details.barangay}
        onChange={(event) => onChange('barangay', event.target.value)}
        error={errors.barangay}
        required
      />

      <TextField
        id="checkout-postal-code"
        name="postalCode"
        label="Postal Code"
        autoComplete="postal-code"
        inputMode="numeric"
        maxLength={4}
        placeholder="1100"
        value={details.postalCode}
        onChange={(event) => onChange('postalCode', event.target.value)}
        error={errors.postalCode}
        required
      />

      <TextField
        id="checkout-street"
        name="street"
        label="House No., Street, Building, Unit"
        autoComplete="street-address"
        placeholder="12 Katipunan Avenue, Tower B, Unit 4B"
        value={details.street}
        onChange={(event) => onChange('street', event.target.value)}
        error={errors.street}
        hint="Include your building and unit so the courier can find you."
        required
        className="sm:col-span-2"
      />

      <TextField
        id="checkout-delivery-notes"
        name="deliveryNotes"
        label="Delivery Notes"
        hint="Optional. Anything the courier should know, like a landmark or the best time to deliver."
        placeholder="Green gate, please call on arrival."
        maxLength={240}
        value={details.deliveryNotes}
        onChange={(event) => onChange('deliveryNotes', event.target.value)}
        error={errors.deliveryNotes}
        className="sm:col-span-2"
      />
    </div>
  )
}

export { REGION_GROUPS }