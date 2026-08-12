# Agent Jack — QR Restaurant Ordering

Next.js storefront + Express/Apollo GraphQL API + PostgreSQL.

Scan a table QR, order food (variants / add-ons / combos), bid on live liquor prices with an OpenAI chat bartender, and pay via Stripe Checkout (cards, Apple Pay, Google Pay).

## Stack

- **Frontend:** Next.js 15 (App Router), Tailwind, Clerk (optional), Socket.IO client
- **Backend:** Node.js, Express, Apollo GraphQL, Prisma, Socket.IO
- **DB:** PostgreSQL
- **Payments:** Stripe Checkout + webhooks
- **AI:** OpenAI for bid chat

## Project layout

```
/
├── app/                 # Next.js (user + admin)
├── components/
├── lib/
├── server/              # Express GraphQL API + Prisma
├── docker-compose.yml
└── package.json
```

## Quick start

### 1. Database

```bash
docker compose up -d
# or use local Postgres with DATABASE_URL pointing at agent_jack
```

### 2. API

```bash
cd server
cp .env.example ../.env.example   # values already in server/.env for local
npm install
npm run db:setup                  # generate + push + seed
npm run dev                       # http://localhost:4000/graphql
```

### 3. Web

```bash
# from repo root
npm install --legacy-peer-deps
npm run dev                       # http://localhost:3000
```

Open `/` for the menu, `/admin` for the responsive admin panel, `/t/<tableId>` to bind a table from QR.

## Clerk (Hobby — free)

1. Create a Clerk app and enable **Google**, **Facebook**, and **Apple** (Hobby allows 3 social connections).
2. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.
3. Set a user’s `publicMetadata.role` to `"admin"` for admin access.
4. Without Clerk keys, guest checkout still works; admin mutations accept a local admin header for development.

## Stripe + Apple Pay / Google Pay

1. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` on the server.
2. Point webhook to `POST /webhooks/stripe` for `checkout.session.completed`.
3. In Stripe Dashboard → **Settings → Payment methods**, enable **Apple Pay** and **Google Pay**.
4. Hosted Checkout shows wallets automatically on supported devices/browsers (no separate wallet SDK).

## Liquor bidding

- User types a number (up to 2 decimals) in bid chat.
- Success if `amount >= currentPrice` and `<= highestPrice` → item added to cart, price steps up.
- After 2 failed bids, AI (or fallback copy) jokes about the **current price**.
- Background cooldown lowers price toward min when demand is quiet.
- Admin can **force max**, **force cool-down**, or pause bidding.

## Scripts

| Command | Where | Purpose |
|--------|--------|---------|
| `npm run dev` | root | Next.js |
| `npm run dev` | server | API + sockets |
| `npm run db:setup` | server | migrate + seed |
| `docker compose up -d` | root | Postgres |
