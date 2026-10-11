# ReFon demo-day checklist (Techno Fair 2026)

A short list for the booth team. Work top to bottom.

## A week before

- [ ] **Deploy from a stable branch.** Render deploys `Ice-Cream-Cake` (or `main` once merged). Do experiments on another branch so a half-finished change never reaches the booth.
- [ ] **Check the public address.** If Render gave you something other than `https://refon.onrender.com`, change `url` in `frontend/src/content/site-info.js` and push. The QR poster, share previews and sitemap all read it.
- [ ] **Booth number.** Set `booth` in `site-info.js` (e.g. `'12'`). It shows in the footer, the Contact page and the poster.
- [ ] **Social links.** Put the real Facebook, Instagram and TikTok URLs in `socials` in `site-info.js`, or leave `href: null` to show "coming soon".
- [ ] **Photo storage.** On Render's free plan, uploaded photos are wiped on every redeploy. If sellers will upload photos, set `STORAGE_DRIVER=s3` with a bucket (Cloudflare R2's free tier works). See the README "Environment variables" section.
- [ ] **Print the poster.** Open `/booth-poster` on the live site, click **Print poster**, print on A4. Test-scan it with two different phones.

## The morning of

- [ ] **Wake the site.** The free plan sleeps after ~15 minutes idle and the first visit takes 30–50 seconds. Open the site 5 minutes before doors open, and again after any long break. (A paid plan, or an uptime pinger hitting `/api/health` every 10 minutes, keeps it awake.)
- [ ] **Check health.** `https://<your-address>/api/health` should say `"status":"ok"`.
- [ ] **HTTPS only.** The camera, microphone and motion tests need `https://`. They will not run on a `localhost` or `http://` link opened from a phone.
- [ ] **Laptop set-up.** Open the homepage on the big screen. Open `/health-check` in a second tab; on a laptop it shows the QR code for visitors.
- [ ] **Charge everything** and bring a spare phone for visitors who don't want to use their own.

## Demo logins

Only for the hosted demo, which is seeded with your own passwords (see README, "Option C"). Never use the development passwords on a public site.

| Role | Email | What to show |
| --- | --- | --- |
| Buyer | `buyer@refon.test` | Add a phone to the cart, the 15-minute hold, checkout quote |
| Seller | `seller@refon.test` | Seller dashboard, create a listing with a grade and battery reading |
| Admin | `admin@refon.test` | Approve the listing the seller just made |

## The 2-minute demo

1. **Homepage (20s).** "Pre-loved phones, tested in the open." Move the mouse over the hero phone card so it tilts; point out the live grade, battery and 11/11 checks.
2. **Health check (40s).** The visitor scans the QR and runs Display and Speaker on their own phone. Show the lime ring filling and the confetti when a test passes.
3. **Trade-in (20s).** "Magkano kaya 'yan?" Tap their model, storage, condition, battery: the price range counts up.
4. **Shop (30s).** Open a phone, show the grade explanation and inspection list, tap **Add to cart**: confetti and the 15-minute hold timer.
5. **Seller and admin (10s, optional).** A seller lists a phone; the admin approves it; it appears in the shop.

## If something goes wrong

- **Page stuck loading:** the server is waking up. Wait 30–50 seconds and refresh.
- **Camera or mic test says "Permission denied":** the visitor tapped Block. In the browser's site settings, allow camera/microphone and reload.
- **"Browser can't test":** that sensor is not available in that browser (e.g. vibration on iPhone). That's expected and the page says so.
- **Nothing works:** run it locally on the laptop (`npm run dev`) and use the laptop for the shop demo. The phone health check needs the hosted HTTPS site.
