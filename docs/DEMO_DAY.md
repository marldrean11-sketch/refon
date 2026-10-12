# ReFon demo-day checklist (Techno Fair 2026)

A short list for the booth team. Work top to bottom.

## A week before

- [ ] **Deploy from a stable branch.** Render deploys `Ice-Cream-Cake` (or `main` once merged). Do experiments on another branch so a half-finished change never reaches the booth.
- [ ] **Check the public address.** If Render gave you something other than `https://refon.onrender.com`, change `url` in `frontend/src/content/site-info.js` and push. The QR poster, share previews and sitemap all read it.
- [ ] **Booth number.** Set `booth` in `site-info.js` (e.g. `'12'`). It shows in the footer, the Contact page and the poster.
- [ ] **Social links.** Put the real Facebook, Instagram and TikTok URLs in `socials` in `site-info.js`, or leave `href: null` to show "coming soon".
- [ ] **Chat links.** Put your Messenger (`https://m.me/<page>`) and Viber links in `chat` in `site-info.js`. Until then the chat button shows them as "soon" and still offers email and phone.
- [ ] **Treats for the pop challenge.** Visitors who pop 10 floating loops get a "Loop Master" badge with a code. Have stickers or candy ready; the badge says "while booth supplies last".
- [ ] **Photo storage.** On Render's free plan, uploaded photos are wiped on every redeploy. If sellers will upload photos, set `STORAGE_DRIVER=s3` with a bucket (Cloudflare R2's free tier works). See the README "Environment variables" section.
- [ ] **Print the poster.** Open `/booth-poster` on the live site, click **Print poster**, print on A4 in colour at 100% scale ("Actual size"). Glossy paper makes the dark background and lime look best. Test-scan both QR codes (the one in the phone opens the health check, the small "Rate us" one opens feedback) with two different phones. A ready-made PDF preview is in `docs/poster-mockups/booth-poster-final.pdf`.

## The morning of

- [ ] **Wake the site.** The free plan sleeps after ~15 minutes idle and the first visit takes 30–50 seconds. Open the site 5 minutes before doors open, and again after any long break. (A paid plan, or an uptime pinger hitting `/api/health` every 10 minutes, keeps it awake.)
- [ ] **Check health.** `https://<your-address>/api/health` should say `"status":"ok"`.
- [ ] **HTTPS only.** The camera, microphone and motion tests need `https://`. They will not run on a `localhost` or `http://` link opened from a phone.
- [ ] **Laptop set-up.** Put `/kiosk` on the big screen and click the full-screen button: it rotates slides on its own and shows the live "phones checked today" count and three QR codes (health check, trade-in, Rate ReFon). Keep the homepage in a second tab for the shop demo.
- [ ] **Charge everything** and bring a spare phone for visitors who don't want to use their own.
- [ ] **Install the app on the booth phone (optional).** On Android/Chrome tap **Install app** in the footer; on iPhone use Share → Add to Home Screen. It opens full screen with the ReFon icon.

## After the fair

- **Read the feedback.** Sign in as admin: the **Booth feedback** panel at the bottom of the Admin Dashboard shows the response count, average stars, the "would buy" split and the latest comments.

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
6. **Price-drop alert (20s, optional).** As the buyer, tap the heart on a phone. As the seller, click **Lower price** on that phone in the dashboard. Back as the buyer, the bell shows "Price drop! … now ₱X (was ₱Y)".
7. **Ask for a rating.** Point at the "Rate us" QR on the poster. Three questions, about 20 seconds.

## If something goes wrong

- **Page stuck loading:** the server is waking up. Wait 30–50 seconds and refresh.
- **Camera or mic test says "Permission denied":** the visitor tapped Block. In the browser's site settings, allow camera/microphone and reload.
- **"Browser can't test":** that sensor is not available in that browser. The page now says why under the test.
- **Vibration on iPhone:** never works. Apple does not let any website use the vibration motor. Show the vibration test on an Android phone instead.
- **Vibration on Android, but nothing felt:** silent mode, Do Not Disturb, battery saver, or Settings → Sound & vibration → Vibration & haptics switched off. Turn those off and tap Vibrate again.
- **Motion sensors, no readings:** the page must be the https:// address. On Android Chrome, tap the icon left of the address → Site settings → allow Motion sensors. On iPhone, reload and tap Allow when asked. Then tilt the phone until the bar fills.
- **Seller can't see an approval:** a pop-up appears on the seller's screen within 30 seconds (or as soon as they switch back to the tab), and the bell rings.
- **Nothing works:** run it locally on the laptop (`npm run dev`) and use the laptop for the shop demo. The phone health check needs the hosted HTTPS site.
