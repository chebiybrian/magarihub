# MagariHub — Going Live (Render + Neon + Cloudinary)

The website is already live at **https://magarihub.vercel.app**, but it only shows data
from your own computer because the backend still runs locally. These steps put the
backend + database + file storage on the internet so anyone can use the site.

You create the accounts (all have free tiers). I wire everything together. Whenever a
step gives you a value to copy (a "connection string"), paste it back to me in chat.

---

## The 5 pieces

| Piece | Service | Free? | What it stores |
|-------|---------|-------|----------------|
| File storage | Cloudinary | Yes (25 GB) | Photos & videos |
| Database | Neon | Yes | Listings, users, reels, everything |
| Code host | GitHub | Yes | A copy of the code for Render to read |
| Backend server | Render | Yes* | The API that the app talks to |
| Website | Vercel | Yes | Already done ✅ |

\* Render's free server sleeps after 15 min idle and takes ~50s to wake on the next
visit. Upgrading to $7/mo removes the sleep. Fine to start free.

---

## Step 1 — Cloudinary (photo/video storage)

1. Go to **https://cloudinary.com** → **Sign up for free**.
2. After signup, open the **Dashboard**.
3. Find **API Environment variable** — it looks like:
   `CLOUDINARY_URL=cloudinary://123456789:abcdefg@your-cloud-name`
4. Copy that whole line and paste it to me.

## Step 2 — Neon (database)

1. Go to **https://neon.tech** → **Sign up** (use "Continue with Google").
2. Create a project — name it `magarihub`, region closest to you (Europe is fine).
3. On the project dashboard, find the **Connection string** (starts with
   `postgresql://...`). Make sure "Pooled connection" is selected.
4. Copy it and paste it to me.

## Step 3 — GitHub (code host)

1. Go to **https://github.com** → sign up / sign in.
2. I'll walk you through creating an empty repo called `magarihub` and pushing the code.

## Step 4 — Render (backend server)

1. Go to **https://render.com** → **Sign up** (use "GitHub" so it can see your repo).
2. **New +** → **Blueprint** → pick the `magarihub` repo. Render reads `render.yaml`.
3. It'll ask for the secret values — I'll give you exactly what to paste:
   - `DATABASE_URL` = your Neon string (Step 2)
   - `CLOUDINARY_URL` = your Cloudinary line (Step 1)
   - `JWT_SECRET` = (I generated one — see below)
   - `PUBLIC_WEB_URL` = `https://magarihub.vercel.app`
4. Deploy. Render gives you a URL like `https://magarihub-api.onrender.com`.

## Step 5 — Connect the website

I set `VITE_API_URL` on Vercel to the Render URL and redeploy. Done — the live site
now reads and writes the real online database.

---

## Your JWT secret (already generated — keep it private)

```
8wMd7vr84C0pPMGwNKGr7ml3GjKSQO8L9ykHTaqItEeG0YTlNB9L2svYCAMwOXCK
```

This signs login tokens. Paste it as `JWT_SECRET` on Render. Don't share it publicly.

---

## After launch (optional)

- **Custom domain** (e.g. magarihub.co.ke ~KES 1,000/yr via a KENIC registrar) — point
  it at Vercel (website) and add a subdomain like `api.magarihub.co.ke` on Render.
- **Real payments**: add M-Pesa Daraja + Flutterwave keys on Render to leave demo mode.
- **Real AI licence vetting**: add `ANTHROPIC_API_KEY` on Render.
- **Mobile app**: change `API_URL` in `mobile/src/api/client.js` to the Render URL so the
  phone app uses the live backend too.
