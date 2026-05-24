# Allo Reservation System

A full-stack inventory reservation system built for the Allo Engineering take-home exercise.

The app solves the checkout inventory race condition by temporarily reserving stock for a short time window. If the user confirms the purchase, the reservation is confirmed. If the user cancels or the reservation expires, the stock is released back to availability.

## Links

- Live Demo: `https://allo-reservation-system-eight.vercel.app/`

## Tech Stack

- Next.js App Router
- TypeScript
- Prisma ORM
- Hosted PostgreSQL
- Upstash Redis
- Zod
- Tailwind CSS
- shadcn/ui
- Vercel

## Features

- Product listing page
- Warehouse-wise stock display
- Reserve button per product/warehouse
- Checkout/reservation page
- Live countdown timer
- Confirm purchase action
- Cancel reservation action
- Visible `409 Conflict` error for insufficient stock
- Visible `410 Gone` error for expired reservations
- Automatic expired reservation cleanup
- Concurrency-safe reservation endpoint
- Redis-based idempotency support
- Redis product-list cache with invalidation

## Problem Summary

During checkout, payment can take several minutes. If stock is only reduced after payment succeeds, two users may pay for the same physical unit. If stock is reduced too early, abandoned carts make inventory look unavailable.

This project uses a reservation approach:

1. A user reserves stock before checkout.
2. The reserved units are temporarily held.
3. If payment succeeds, the reservation is confirmed.
4. If payment fails or the timer expires, the reservation is released.

## Data Model

The main models are:

- `Product`
- `Warehouse`
- `StockLevel`
- `Reservation`

`StockLevel` tracks inventory per product per warehouse.

```txt
availableUnits = totalUnits - reservedUnits
```

`Reservation` tracks:

- product
- warehouse
- quantity
- status
- expiry time
- confirmed time
- released time

Reservation statuses:

```txt
PENDING
CONFIRMED
RELEASED
```

## API Routes

| Method | Route | Description |
|---|---|---|
| GET | `/api/products` | Lists products with available stock per warehouse |
| GET | `/api/warehouses` | Lists warehouses |
| POST | `/api/reservations` | Creates a reservation |
| GET | `/api/reservations/:id` | Gets reservation details |
| POST | `/api/reservations/:id/confirm` | Confirms a reservation |
| POST | `/api/reservations/:id/release` | Releases a reservation |
| POST | `/api/reservations/release-expired` | Releases expired reservations |

## Concurrency Safety

The most important part of the project is the reservation endpoint.

The endpoint is safe under concurrent requests because it does not do a separate read-then-write stock check.

Instead, it uses a single atomic PostgreSQL update:

```sql
UPDATE "StockLevel"
SET "reservedUnits" = "reservedUnits" + quantity
WHERE "productId" = productId
  AND "warehouseId" = warehouseId
  AND ("totalUnits" - "reservedUnits") >= quantity
RETURNING id;
```

If two requests try to reserve the last unit at the same time:

- one update succeeds
- the other update affects zero rows
- the failed request returns `409 Conflict`

This guarantees that stock cannot be over-reserved.

## Reservation Flow

### 1. Reserve

When a user clicks Reserve:

- the frontend sends product, warehouse, and quantity
- the backend checks availability atomically
- if enough stock exists, `reservedUnits` increases
- a `PENDING` reservation is created
- the user is redirected to the checkout page

If stock is not available, the API returns:

```txt
409 Conflict
```

### 2. Confirm

When the user confirms purchase:

- if the reservation is still pending and not expired, it becomes `CONFIRMED`
- the reserved stock remains held as sold stock

If the reservation is expired, the API returns:

```txt
410 Gone
```

### 3. Release

When the user cancels:

- the reservation becomes `RELEASED`
- `reservedUnits` is decremented
- stock becomes available again

## Reservation Expiry

Reservations expire after 10 minutes.

This project uses lazy cleanup on read:

- before products are listed, the API runs expired reservation cleanup
- expired `PENDING` reservations are changed to `RELEASED`
- their quantities are removed from `reservedUnits`
- the Redis product cache is invalidated

This keeps the system simple for the take-home exercise.

In a larger production system, I would move this to a Vercel Cron job or background worker so expiry cleanup runs independently of user traffic.

## Idempotency

The bonus idempotency requirement is implemented using Redis.

The reserve and confirm endpoints support an `Idempotency-Key` header.

For each idempotent request, Redis stores:

- request hash
- status code
- response body

If the same key is retried with the same request body, the original response is returned without repeating the side effect.

If the same key is reused with a different request body, the API returns:

```txt
409 Conflict
```

This prevents duplicate reservations or duplicate confirmations during retries.

## Redis Usage

Redis is used for:

1. Idempotency storage
2. Product listing cache
3. Product cache invalidation after stock changes

The product list cache key is:

```txt
products:list
```

The cache is invalidated after:

- reservation creation
- reservation confirmation
- reservation release
- expired reservation cleanup

The product cache also has a short TTL to avoid stale inventory data.

## Frontend

The frontend includes:

### Product Listing Page

Shows:

- product image
- product name
- description
- price
- warehouse selector
- available stock
- Reserve button

### Checkout Page

Shows:

- reservation details
- selected warehouse
- quantity
- countdown timer
- Confirm purchase button
- Cancel button

After confirming or cancelling, the UI updates without requiring a manual refresh.

## Error Handling

Important API errors are shown to the user.

### 409 Conflict

Used when there is not enough stock available.

Example:

```txt
Not enough stock available
```

### 410 Gone

Used when a reservation has expired or is no longer valid.

Example:

```txt
Reservation expired
```

## Local Setup

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPO_URL
cd allo-reservation-system
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file:

```env
DATABASE_URL="your_hosted_postgres_database_url"

UPSTASH_REDIS_REST_URL="your_upstash_redis_rest_url"
UPSTASH_REDIS_REST_TOKEN="your_upstash_redis_rest_token"
```

### 4. Run database migrations

```bash
npx prisma migrate dev
```

### 5. Generate Prisma client

```bash
npx prisma generate
```

### 6. Seed the database

```bash
npx prisma db seed
```

### 7. Start the development server

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Production Setup

The app is deployed on Vercel.

Required Vercel environment variables:

```txt
DATABASE_URL
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

For production database migration:

```bash
npx prisma migrate deploy
```

The production database should be seeded so the reviewer can interact with products immediately.

## Testing the Core Flow

### Reserve Stock

1. Open the product listing page.
2. Select a warehouse.
3. Click Reserve.
4. You should be redirected to the reservation page.

### Confirm Reservation

1. On the reservation page, click Confirm purchase.
2. Reservation should become confirmed.
3. Product stock should update.

### Cancel Reservation

1. Create a new reservation.
2. Click Cancel.
3. Reservation should be released.
4. Product stock should become available again.

### Expiry

1. Create a reservation.
2. Wait until the timer expires.
3. Try confirming.
4. API returns `410 Gone`.
5. Stock is released back.

## Testing Concurrency

To test concurrency manually, seed a stock level with only one available unit.

Then send two reservation requests at almost the same time.

Expected result:

```txt
One request returns 201 Created
One request returns 409 Conflict
```

The database should show only one successful pending reservation.

## Testing Idempotency

Send a reservation request with:

```txt
Idempotency-Key: test-key-1
```

Send the exact same request again with the same key.

Expected result:

```txt
The same response is returned
No duplicate reservation is created
Stock is not reserved twice
```

Send another request with the same key but a different body.

Expected result:

```txt
409 Conflict
```

## Design Decisions

### Atomic database update for concurrency

I used PostgreSQL as the source of truth for stock correctness. Redis is useful, but the final guarantee should come from the database because stock lives there.

### Lazy expiry cleanup

I used lazy cleanup on product reads to keep the system simple. This is acceptable for the exercise and avoids extra infrastructure.

### Redis for idempotency

Redis is a good fit for short-lived idempotency keys because the data is temporary and can expire automatically.

### Short product cache TTL

Inventory changes frequently, so product caching is intentionally short-lived and invalidated after mutations.

## Trade-offs

- No authentication was added.
- Payment is simulated with confirm/cancel buttons.
- Expiry cleanup is lazy instead of cron-based.
- Product cache is simple and global.
- No automated test suite was added yet.
- Idempotency is focused on reserve and confirm endpoints.

## What I Would Improve With More Time

- Add Vercel Cron for expiry cleanup
- Add automated concurrency tests
- Add integration tests for reservation lifecycle
- Add authentication and user-specific reservations
- Add admin UI for managing stock
- Add structured logs and monitoring
- Add better loading and empty states
- Add rate limiting for mutation endpoints
- Add stronger idempotency handling for in-flight duplicate requests

## Scripts

```bash
npm run dev
npm run build
npm start
npx prisma migrate dev
npx prisma migrate deploy
npx prisma db seed
npx prisma studio
```

## Final Notes

The main focus of this project is correctness under concurrency.

The reservation creation endpoint uses an atomic database update so stock cannot be over-reserved even when simultaneous requests compete for the last unit.

Redis is used for idempotency and caching, while PostgreSQL remains the source of truth for inventory correctness.