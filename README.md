# MagariHub 🚗🇰🇪

A car marketplace for Kenya: **one shared backend** powering a **website** and a **mobile app**.

| Feature | Where |
|---|---|
| 1. Car listings (browse, filter, sell) | `web: /` · `mobile: Cars tab` |
| 2. Reels — TikTok-style car videos | `web: /reels` · `mobile: Reels tab` |
| 3. Drivers for hire | `web: /drivers` · `mobile: Drivers tab` |
| 4. Insurance comparison + premium estimator | `web: /insurance` · `mobile: More → Insurance` |
| 5. Guides, news & statistics | `web: /guides` · `mobile: More → Guides` |
| 6. Car parts with reference numbers | `web: /parts` · `mobile: More → Parts` |
| Verification badges (ID Verified / Verified Dealer) | shown everywhere a user appears |

```
magari-hub/
├── backend/   Node.js + Express + Prisma (SQLite) — the shared API
├── web/       React (Vite) website
└── mobile/    React Native (Expo) app
```

---

## Prerequisites (install once)

1. **Node.js LTS** — https://nodejs.org (v20+). Check with `node -v`
2. **Expo Go** app on your phone (Play Store / App Store) — for running the mobile app

---

## 1) Start the backend (do this first)

```bash
cd backend
copy .env.example .env     # Mac/Linux: cp .env.example .env
npm install
npm run db:setup           # creates the SQLite database
npm run db:seed            # loads Kenya-market sample data
npm run dev
```

API now runs at **http://localhost:4000** (open it in a browser — you should see `{"ok":true}`).

**Demo logins** (password for all: `password123`)
- `dealer@example.com` — verified dealer with listings + reels
- `seller@example.com` — ID-verified individual seller
- `driver@example.com` — driver for hire
- `buyer@example.com` — regular buyer

## 2) Start the website

```bash
cd web
npm install
npm run dev
```

Open **http://localhost:5173**.

## 3) Start the mobile app

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go (phone and computer must be on the same WiFi).

> ⚠️ **One required edit:** open `mobile/src/api/client.js` and set `API_URL` to your
> computer's IP, e.g. `http://192.168.1.23:4000`. Find your IP with `ipconfig`
> (Windows) — "localhost" on a phone points to the phone itself, not your PC.

---

## How the pieces talk

```
 mobile app ─┐
             ├──► backend API (http://…:4000/api/…) ──► SQLite database
 website ────┘
```

Both apps are "thin": all data lives in the backend, so a car listed on the website
instantly appears in the app. The API endpoints:

| Endpoint | What it does |
|---|---|
| `POST /api/auth/register` `login` · `GET /api/auth/me` | accounts + JWT login |
| `GET/POST /api/listings` · `GET/PUT/DELETE /api/listings/:id` | car listings + filters |
| `GET/POST /api/reels` · `POST /api/reels/:id/like` `/view` | video feed |
| `GET/POST /api/drivers` | drivers for hire |
| `GET /api/insurance` · `POST /api/insurance/quote` | policies + premium estimate |
| `GET /api/guides` · `GET /api/guides/:id` | guides, news, stats |
| `GET/POST /api/parts` | parts, searchable by reference no. |
| `POST /api/users/request-verification` · `/:id/approve-verification` | badges |

## Where to change things (learning map)

- **Add a field to cars** → `backend/prisma/schema.prisma` (then `npm run db:setup`), then the pages that show it
- **Change colors** → `web/src/styles.css` (`:root` variables) and `mobile/src/theme.js`
- **Add insurance companies / guides / parts** → `backend/prisma/seed.js`, then `npm run db:reset`
- **Change the premium formula** → `backend/src/routes/insurance.js`

## Important notes

- Insurance rates in the seed data are **typical market figures for demo purposes** — get real quotes/partnerships before launch.
- The verification approve endpoint is open to any logged-in user for now — **add an ADMIN role check before going live** (`backend/src/routes/users.js`).
- Images/videos are URLs for now. Next step: real uploads (see roadmap).

## Roadmap (suggested order)

1. **Image & video uploads** — Cloudinary free tier; store returned URLs
2. **M-Pesa payments** — Safaricom Daraja API (STK Push) for featured listings / driver booking deposits
3. **Per-user likes & saved cars** — new `Like`/`Favorite` tables instead of a counter
4. **In-app chat** between buyer and seller (start with WhatsApp links — already built in)
5. **Admin dashboard** — approve verifications, moderate listings
6. **Deploy** — backend: Railway/Render (switch SQLite → PostgreSQL, one line in `schema.prisma`); web: Vercel/Netlify; mobile: `eas build` for Play Store
7. **SMS/OTP login** with phone numbers (more common than email in Kenya)
