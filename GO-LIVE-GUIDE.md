# MagariHub — Going Live 🚀

A practical, Kenya-specific plan to take MagariHub from your laptop to the public internet.

---

## ⚠️ Step 0: Five things you MUST fix before hosting

These will break in production if skipped. Do them first.

### 1. Switch the database from SQLite → PostgreSQL  **(critical)**
SQLite is a file on disk. Cloud hosts wipe the disk on every redeploy, so **your entire database would vanish** each time you push an update.

In `backend/prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"   // was "sqlite"
  url      = env("DATABASE_URL")
}
```
Your host gives you a `DATABASE_URL` — paste it into the environment variables. Then run `npx prisma migrate deploy`.

### 2. Move uploads off local disk → cloud storage  **(critical)**
Same problem: photos, videos and licence scans currently save to `backend/uploads/`. On Railway/Render that folder is erased on redeploy — **every image on the site would disappear.**

Fix: use **Cloudinary** (free tier: 25GB storage + 25GB bandwidth/month, plenty to launch). Sign up, then swap the storage engine in `backend/src/routes/upload.js` from `multer.diskStorage` to Cloudinary's uploader. Roughly a 20-line change — ask me and I'll do it.

### 3. Set a strong JWT secret
`JWT_SECRET` currently says "change-me". Anyone who guesses it can forge logins. Generate a long random string and set it in your host's environment variables.

### 4. Lock down CORS
`backend/src/index.js` has `app.use(cors())` — currently any website can call your API. Change to:
```js
app.use(cors({ origin: ['https://yourdomain.co.ke'] }));
```

### 5. Add ADMIN checks on two endpoints
I flagged these during the build — right now **any logged-in user** can call them:
- `POST /api/users/:id/approve-verification` — could hand themselves a Verified Dealer badge
- `POST /api/ads` — could post ads on your homepage

Add an `isAdmin` flag to the User model and gate both routes.

---

## 🌐 Step 1: Your domain name

### Choosing
- **`.co.ke`** — best signal for a Kenyan car marketplace; buyers trust it.
- **`.com`** — get it too if affordable, and redirect it to your `.co.ke`.
- Keep it short and easy to say over the phone. If `magarihub.co.ke` is taken, consider variants, but avoid hyphens and numbers.
- Check availability at any registrar below before committing to branding.

### Cost (2026)
A `.co.ke` runs roughly **KES 999–1,500 per year** from KENIC-accredited registrars.

### Where to register (all KENIC-accredited, Kenyan)
| Registrar | Notes |
|---|---|
| **Truehost** | Popular, frequent promos |
| **HostGuru** | From ~KES 1,499/yr |
| **Novahost** | Local support |
| **Quest** | Renewal price = registration price (no hike) |
| **Sinosoft / Webregister** | Long-standing local options |

⚠️ **Watch the renewal price, not the first-year price.** Some advertise a cheap year one then renew much higher. Ask before buying.

### After buying
You'll get a DNS control panel. You'll point records at your host in Step 3 — keep the login safe.

---

## 🖥️ Step 2: Where to host each piece

You have three separate things to deploy:

| Piece | What it is | Where to host |
|---|---|---|
| **backend/** | Node API + database | Railway or Render |
| **web/** | React website | Vercel or Netlify (free) |
| **mobile/** | Expo app | Google Play / App Store |

### Backend hosting: Railway vs Render

**Railway** — pay only for what you use, billed by the second. Small apps often land at **$2–5/month**; plans start at **$5/month which includes $5 of usage**. Best for starting out; scales to zero when idle. Great developer experience.

**Render** — fixed pricing: **$7/month per web service + ~$7/month for Postgres** (≈$14/month total). Has a genuine free tier, but free services **sleep after ~15 minutes idle** and take 30+ seconds to wake — bad for real customers, fine for testing. Better when you want predictable bills.

**My recommendation:** start on **Railway** (cheapest while traffic is low), move to Render or a bigger plan when you have steady users.

### Website hosting
**Vercel** or **Netlify** — both free for a site like yours, with automatic HTTPS and a global CDN. Vercel is the smoothest for Vite/React.

---

## 🚀 Step 3: Deploy, step by step

### A. Put the code on GitHub
Both hosts deploy straight from GitHub, and it protects your work.
```bash
cd C:\Users\LENOVO\Claude\Projects\magari-hub
git init
git add .
git commit -m "MagariHub v1"
```
Create a repo on github.com and follow its push instructions.
✅ Your `.gitignore` already excludes `.env` and `node_modules` — your secrets won't be uploaded.

### B. Deploy the backend (Railway)
1. Sign up at railway.app → **New Project → Deploy from GitHub**
2. Pick your repo, set **Root Directory** to `backend`
3. Add a **PostgreSQL** database (one click) — Railway sets `DATABASE_URL` automatically
4. Add environment variables (Variables tab):
   - `JWT_SECRET` (long random string)
   - `MPESA_*` keys (from Safaricom Daraja)
   - `FLUTTERWAVE_SECRET_KEY`
   - `ANTHROPIC_API_KEY` (driver licence vetting)
   - `PUBLIC_WEB_URL` = your website address
   - Cloudinary keys
5. Set the start command: `npx prisma migrate deploy && npm start`
6. Railway gives you a URL like `magarihub-api.up.railway.app` — **copy it**

### C. Deploy the website (Vercel)
1. Sign up at vercel.com → **Add New → Project** → pick your repo
2. Set **Root Directory** to `web`
3. Add environment variable: `VITE_API_URL` = your Railway backend URL
4. Deploy

### D. Connect your domain
In Vercel → Settings → Domains → add `yourdomain.co.ke`. Vercel shows you DNS records; paste those into your registrar's DNS panel. HTTPS is automatic and free.

Point the API at a subdomain too: `api.yourdomain.co.ke` → your Railway service.

### E. Go live on M-Pesa
Your Daraja app starts in **sandbox** (fake money). To take real payments:
1. Apply for **Go Live** in the Daraja portal
2. Safaricom requires a registered business + Paybill/Till number
3. Set `MPESA_ENV="production"` and `MPESA_CALLBACK_URL` = `https://api.yourdomain.co.ke/api/payments/mpesa/callback`

### F. Publish the mobile app
```bash
cd mobile
npx expo install expo-dev-client
npx eas build --platform android
```
- Update `API_URL` in `mobile/src/api/client.js` to your live API first
- **Google Play**: one-time $25 developer fee, review takes a few days
- **Apple App Store**: $99/year, stricter review
- Start with Android — that's where most Kenyan users are

---

## 💰 What it costs to run

| Item | Cost |
|---|---|
| `.co.ke` domain | KES ~1,000–1,500 / year |
| Backend (Railway) | ~$5/month to start (≈KES 650) |
| Website (Vercel) | Free |
| Cloudinary (media) | Free to start |
| Google Play | $25 once |
| **Total to launch** | **≈ KES 2,500 up front, then ~KES 700/month** |

Costs rise with traffic — but so does revenue from verification badges and ads.

---

## ✅ Post-launch checklist

- [ ] **Back up the database** — Railway/Render offer automated backups; turn them on
- [ ] **Test a real M-Pesa payment** with a small amount (KES 10) before announcing
- [ ] **Seed real content** — don't launch with demo cars. Get 10–20 genuine listings first
- [ ] **Add Google Analytics** or Plausible to see what people actually use
- [ ] **Privacy policy + terms** — required by Google Play, and you're handling ID documents so Kenya's **Data Protection Act (2019)** applies. You may need to register with the ODPC as a data controller
- [ ] **Test on a cheap Android phone** on mobile data, not just WiFi — that's your real audience

---

## 🔒 One legal note worth taking seriously

You're storing **driving licence scans and national ID information**. Under Kenya's Data Protection Act you must: store them securely, only keep them as long as needed, tell users what you collect, and possibly register as a data controller with the Office of the Data Protection Commissioner. Worth an hour with a lawyer before launch — it's cheaper than a fine.

---

*Ask me to do any of these steps — especially the Cloudinary migration and the Postgres switch, which are the two that will bite you hardest if skipped.*
