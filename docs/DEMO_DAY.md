# ReFon demo-day checklist (Techno Fair 2026)

A short list for the booth team. Work top to bottom.

## A week before

- [ ] **Deploy from a stable branch.** Vercel (website) and Render (API) both deploy `main`. Do experiments on another branch so a half-finished change never reaches the booth.
- [ ] **Check the public address.** Visitors use the Vercel site `https://refon-lake.vercel.app`; it forwards `/api` to the Render server (`vercel.json`). The QR poster, kiosk, share previews and sitemap read `url` in `frontend/src/content/site-info.js`. If the Render server's address is not `https://refon.onrender.com`, change the two destinations in both `vercel.json` files and push.
- [ ] **Booth number.** Sign in as admin → Admin Dashboard → **Techno Fair booth** panel → **Edit booth**. Type the number the organisers announced and Save. It shows right away in the footer, the Contact page, the poster, the pop badge and the health check card, and on the kiosk screen within a minute. No redeploy needed. (Reprint the poster if the number changed after printing.) In the same dialog, set an **announcement banner** such as "Visit us at Booth #12: free phone health check!". It shows above the header on every page; leave it empty to hide it.
- [ ] **Social links.** Facebook and Instagram show as "coming soon" until ReFon has its own pages. When they exist, put the URLs in `socials` in `site-info.js`.
- [ ] **Keep the server awake.** Add a free [UptimeRobot](https://uptimerobot.com) HTTP(s) monitor for `https://refon.onrender.com/api/health` every 5 minutes. It stops the 30–50 second "waking up" delay and emails you if the site goes down.
- [ ] **Free database expiry.** Check the creation date of `refon-db` in the Render dashboard; free databases can expire. Upgrade or recreate it before the fair if it is close.
- [ ] **Test a real sign-up.** Register a buyer and a seller with your own email addresses and check that the confirmation emails arrive. Sellers must enter a **store name** when they sign up.
- [ ] **Viber link.** Paste it in the same **Edit booth** dialog (a `https://invite.viber.com/...` group link or a `viber://` chat link). Until then the chat button shows Viber as "soon" and still offers email and phone.
- [ ] **Treats for the pop challenge.** Visitors who pop 10 floating loops get a "Loop Master" badge with a code. Have stickers or candy ready; the badge says "while booth supplies last".
- [ ] **Photo storage.** On Render's free plan, uploaded photos are wiped on every redeploy. If sellers will upload photos, set `STORAGE_DRIVER=s3` with a bucket (Cloudflare R2's free tier works). See the README "Environment variables" section.
- [ ] **Print the poster.** Open `/booth-poster` on the live site, click **Print poster**, print on A4 in colour at 100% scale ("Actual size"). Glossy paper makes the dark background and lime look best. Test-scan both QR codes (the one in the phone opens the health check, the small "Rate us" one opens feedback) with two different phones. A ready-made PDF preview is in `docs/poster-mockups/booth-poster-final.pdf`.

## The morning of

- [ ] **No new code today.** Do not merge anything into `main` on fair day.
- [ ] **Wake the site.** The free plan sleeps after ~15 minutes idle and the first visit takes 30–50 seconds. Open the site 5 minutes before doors open, and again after any long break (or rely on the UptimeRobot monitor above).
- [ ] **Booth number and banner.** As soon as the organisers announce it: Admin Dashboard → **Techno Fair booth** → **Edit booth** → booth number + a banner line → Save.
- [ ] **Reset the counter.** After testing your own phones, click **Reset today's count** in the same panel so the kiosk starts at 0.
- [ ] **Check health.** `https://refon-lake.vercel.app/api/health` should say `"status":"ok"` (this also proves Vercel reaches Render).
- [ ] **HTTPS only.** The camera, microphone and motion tests need `https://`. They will not run on a `localhost` or `http://` link opened from a phone.
- [ ] **Laptop set-up.** Put `/kiosk` on the big screen and click the full-screen button: it rotates slides on its own and shows the live "phones checked today" count and three QR codes (health check, trade-in, Rate ReFon). Keep the homepage in a second tab for the shop demo.
- [ ] **Charge everything** and bring a spare phone for visitors who don't want to use their own. Bring a mobile hotspot in case the venue Wi-Fi is slow.
- [ ] **Sounds.** Interface sounds are on by default (pops, clicks, chimes). Turn the laptop volume to a comfortable level; visitors can mute with the footer switch.
- [ ] **Install the app on the booth phone (optional).** On Android/Chrome tap **Install app** in the footer; on iPhone use Share → Add to Home Screen. It opens full screen with the ReFon icon.

## After the fair

- **Read the feedback.** Sign in as admin: the **Booth feedback** panel at the bottom of the Admin Dashboard shows the response count, average stars, the "would buy" split and the latest comments.

## Demo logins

Only for the hosted demo, which is seeded with your own passwords (see README, "Option C"). Never use the development passwords on a public site.

| Role | Email | What to show |
| --- | --- | --- |
| Buyer | `buyer@refon.test` | Add a phone to the cart, the 15-minute hold, checkout quote |
| Seller | `seller@refon.test` | Seller dashboard, create a listing with a grade and battery reading, rename the store in **Store look** |
| Admin | `admin@refon.test` | Approve the listing the seller just made |

## The 2-minute demo

1. **Homepage (20s).** "Pre-loved phones, tested in the open." Move the mouse over the hero phone card so it tilts; point out the live grade, battery and 11/11 checks.
2. **Health check (40s).** The visitor scans the QR and runs Display and Speaker on their own phone. Show the lime ring filling and the confetti when a test passes.
3. **Trade-in (20s).** "Magkano kaya 'yan?" Tap their model, storage, condition, battery: the price range counts up.
4. **Shop (30s).** Open a phone, show the grade explanation and inspection list, tap **Add to cart**: confetti and the 15-minute hold timer.
5. **Seller and admin (20s, optional).** Open **Sell on ReFon** (`/sell`) to show the steps, then a seller lists a phone and types its IMEI (a wrong digit is caught instantly; only the last 4 digits are kept). The admin ticks **IMEI and lock checked** and approves; it appears in the shop, and the product page shows **IMEI verified by ReFon ···1234** plus the buyer's "Check the IMEI yourself" guide.
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
- **A change doesn't show (old version of a page):** the installed app keeps a copy of the site. Press **Ctrl + Shift + R**, or open the site in an incognito window.
- **Seller renamed their store but the store page didn't change:** they edited **Account → Display name**, which is their personal name. The store name is in **Seller dashboard → Store look → Store name** (near the bottom; use Ctrl + F "Store look").
- **Nothing works:** run it locally on the laptop (`npm run dev`) and use the laptop for the shop demo. The phone health check needs the hosted HTTPS site.
