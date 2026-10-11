/**
 * The trade-in estimator's price table.
 *
 * `shopPrice` is roughly what a Grade A, 128 GB unit of that model sells for on
 * ReFon, taken from the seeded catalogue and evened out so newer models never
 * price below older ones. A trade-in offer is a share of that figure: the
 * reseller still has to inspect, grade, warranty and resell the phone, so the
 * range is 55–65% of the shop price after the adjustments below.
 *
 * This is an estimate for the demo, not an offer. The page says so, and the
 * final figure is agreed after a hands-on check at the booth.
 */
export const TRADE_IN_SHARE = Object.freeze({ low: 0.55, high: 0.65 })

export const TRADE_IN_MODELS = Object.freeze([
  { brand: 'Apple', model: 'iPhone 14', year: 2022, shopPrice: 39000 },
  { brand: 'Apple', model: 'iPhone 13', year: 2021, shopPrice: 33000 },
  { brand: 'Apple', model: 'iPhone 12', year: 2020, shopPrice: 23000 },
  { brand: 'Apple', model: 'iPhone SE 3', year: 2022, shopPrice: 19500 },
  { brand: 'Apple', model: 'iPhone 11', year: 2019, shopPrice: 18500 },
  { brand: 'Apple', model: 'iPhone 8', year: 2017, shopPrice: 8900 },
  { brand: 'Apple', model: 'iPhone 6s', year: 2015, shopPrice: 5500 },
  { brand: 'Samsung', model: 'Galaxy S23', year: 2023, shopPrice: 27000 },
  { brand: 'Samsung', model: 'Galaxy S22', year: 2022, shopPrice: 23000 },
  { brand: 'Samsung', model: 'Galaxy S21', year: 2021, shopPrice: 19500 },
  { brand: 'Samsung', model: 'Galaxy A54', year: 2023, shopPrice: 18000 },
  { brand: 'Samsung', model: 'Galaxy A34', year: 2023, shopPrice: 15000 },
  { brand: 'Samsung', model: 'Galaxy M32', year: 2021, shopPrice: 9600 },
  { brand: 'Samsung', model: 'Galaxy S8', year: 2017, shopPrice: 7500 },
  { brand: 'Google', model: 'Pixel 8', year: 2023, shopPrice: 32000 },
  { brand: 'Google', model: 'Pixel 7', year: 2022, shopPrice: 19000 },
  { brand: 'Google', model: 'Pixel 6a', year: 2022, shopPrice: 15500 },
  { brand: 'Xiaomi', model: '13T', year: 2023, shopPrice: 20000 },
  { brand: 'Xiaomi', model: 'POCO X5 Pro', year: 2023, shopPrice: 11800 },
  { brand: 'Xiaomi', model: 'Redmi Note 12', year: 2022, shopPrice: 8600 },
  { brand: 'Xiaomi', model: 'Redmi Note 11', year: 2022, shopPrice: 8000 },
  { brand: 'Xiaomi', model: 'Redmi Note 9', year: 2020, shopPrice: 7000 },
  { brand: 'OPPO', model: 'Reno 8', year: 2022, shopPrice: 15400 },
  { brand: 'OPPO', model: 'A78', year: 2023, shopPrice: 10000 },
  { brand: 'Vivo', model: 'V29', year: 2023, shopPrice: 16400 },
  { brand: 'Vivo', model: 'Y36', year: 2023, shopPrice: 9000 },
  { brand: 'OnePlus', model: 'OnePlus 11', year: 2023, shopPrice: 26000 },
  { brand: 'OnePlus', model: 'OnePlus Nord', year: 2022, shopPrice: 15000 },
])

export const TRADE_IN_BRANDS = Object.freeze([...new Set(TRADE_IN_MODELS.map((m) => m.brand))])

export const TRADE_IN_STORAGE = Object.freeze([
  { id: '64', label: '64 GB or less', factor: 0.92 },
  { id: '128', label: '128 GB', factor: 1 },
  { id: '256', label: '256 GB', factor: 1.1 },
  { id: '512', label: '512 GB+', factor: 1.18 },
])

/** Same A/B/C scale and wording the catalogue uses (`lib/listing-taxonomy.js`). */
export const TRADE_IN_GRADES = Object.freeze([
  { id: 'A', label: 'A · Excellent', hint: 'Looks close to new. Micro-marks at most.', factor: 1 },
  { id: 'B', label: 'B · Very Good', hint: 'Light scratches on the frame or back. Clean screen.', factor: 0.88 },
  { id: 'C', label: 'C · Good', hint: 'Clear scuffs or marks. Nothing cracked.', factor: 0.72 },
])

export const TRADE_IN_BATTERY = Object.freeze([
  { id: '90', label: '90% or more', factor: 1 },
  { id: '85', label: '85–89%', factor: 0.95 },
  { id: '80', label: '80–84%', factor: 0.88 },
  { id: 'low', label: 'Below 80%', factor: 0.78 },
])

export const TRADE_IN_WORKING = Object.freeze([
  { id: 'yes', label: 'Everything works', factor: 1 },
  { id: 'minor', label: 'A small issue', hint: 'e.g. a weak speaker or a sticky button', factor: 0.8 },
  { id: 'major', label: 'Cracked or faulty screen', factor: 0.55 },
])

const byId = (list, id) => list.find((item) => item.id === id)

/**
 * The estimate for a set of answers, or `null` until every answer is given.
 * Rounded to the nearest ₱100 so it reads as a range, not a quote.
 */
export function estimateTradeIn({ model, storage, grade, battery, working }) {
  const entry = TRADE_IN_MODELS.find((item) => item.model === model)
  const parts = [
    byId(TRADE_IN_STORAGE, storage),
    byId(TRADE_IN_GRADES, grade),
    byId(TRADE_IN_BATTERY, battery),
    byId(TRADE_IN_WORKING, working),
  ]
  if (!entry || parts.some((part) => !part)) return null

  const value = parts.reduce((total, part) => total * part.factor, entry.shopPrice)
  const round = (n) => Math.round(n / 100) * 100

  return {
    low: round(value * TRADE_IN_SHARE.low),
    high: round(value * TRADE_IN_SHARE.high),
    shopPrice: round(entry.shopPrice * parts[0].factor * parts[1].factor),
  }
}
