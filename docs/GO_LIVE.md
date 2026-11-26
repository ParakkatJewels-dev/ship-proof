# ShipProof: going live

What is already built is described in the project history. This file lists what only a person with the
accounts can do, in order, and how to confirm each step worked. Nothing below has been run against a real
Supabase project or a real Shopify store yet; the "Check" line of each step is how you find out.

## What runs where

| Part | Where | Why |
|---|---|---|
| Web app (Next.js) | Vercel, or any Node host | Dashboard and the customer watch page |
| API (Express) | Vercel, as its own project with Root Directory `apps/api` (or any Node host: `npm start`) | No long-lived connections: the camera agent reports its status over HTTPS, and the retention and Shopify retry jobs run as Vercel Cron (`apps/api/vercel.json`, protected by `CRON_SECRET`). Trimming a video that is only in the cloud needs `ffmpeg`, which Vercel does not have; trimming the copy on the packing computer works everywhere. |
| Database and file storage | Supabase | Orders, video records, video files |
| Camera agent | The packing computer | Records and uploads; keeps working without internet |
| Shopify extension | Shopify | Shows the Watch button on the customer's order page |

The web app and API each need a public **https** address, for example `proof.yourstore.com` (web) and
`api.yourstore.com` (API).

## 1. Supabase

1. Create a project. Copy the **Project URL** and the **service_role** key (Project settings, API).
   The service_role key is a secret: it goes only into the API's environment, never into the web app, the
   camera agent or Git.
2. Apply the files in `supabase/migrations`, in order, 00001 to 00008 (SQL editor, or `supabase db push`).
   They create the tables, the private `packing-videos` bucket, the retention rules and the security rules.
   Migration 00006 also turns on row level security for every table, so the public key can read nothing.
   If some are already applied, `supabase/apply-remaining.sql` holds the rest in one paste.
3. Check: Storage shows a private bucket `packing-videos`, and each table in the Table editor shows
   "RLS enabled".
4. In the API environment set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. The API then stops using its
   in-memory store.
5. Create the first admin: `npm run user:create -- you@yourstore.com "<strong password>" "Your Name" ADMIN`
   (run in `apps/api`).
6. Retention numbers. Videos are kept 30 days after delivery and 60 days after a return to origin. The numbers
   live in the `retention_policy` table; change them with one statement, for example
   `update retention_policy set delivered_days = 45, returned_days = 90;`. A change applies to orders delivered or
   returned afterwards.

## 2. Shopify

1. In the Dev Dashboard app, set the scopes `read_orders, write_orders, read_customers, read_fulfillments`,
   release a version, and install it on the store. Put `SHOPIFY_SHOP_DOMAIN`, `SHOPIFY_CLIENT_ID` and
   `SHOPIFY_CLIENT_SECRET` in the API environment.
2. Run `npm run shopify:check` in `apps/api`. Check: it prints the shop name and a few recent orders.
3. Run `npm run shopify:definitions`. This creates the three order fields ShipProof writes
   (`packed_at`, `packing_video_url`) with customer account read access, which the customer
   page needs.
4. After the API has a public address, set `API_PUBLIC_URL` and run `npm run shopify:webhooks`. This registers
   the order and shipment webhooks. Check: the three subscriptions appear in the Dev Dashboard.
5. **Delivery dates.** The 30-day countdown starts from the delivery date in Shopify. Shopify only has one when a
   shipping carrier integration reports "delivered", or when someone records a delivered event on the
   fulfillment. If your orders are never marked delivered, their videos will never expire.
6. **Returns to origin (RTO).** Shopify has no RTO status, so ShipProof reads tags. An order counts as returned
   when it has the tag `RTO` or `RTO Initiated via Shiprocket` (set `RTO_TAGS` in the API settings to change the
   list; not case sensitive, whole tag only). The API sees the tag within a moment, marks the order returned, and
   the video is kept 60 days from the day the tag first appeared. That day is fixed once and does not move when the
   order is updated later. Without a tag, a returned order's video is never deleted.
7. Customer page. See `shopify-app/` and step 6 below.
6. Customer page. See `shopify-app/` and step 6 below.

## 3. Deploy the API

Set these environment variables on the host (see `apps/api/.env.example`):

`NODE_ENV=production`, `JWT_SECRET` (long random), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`SHOPIFY_*`, `PUBLIC_WEB_URL` (the web app's https address), `WEB_ORIGINS` (the same address),
`STATION_API_KEY` (long random), `API_PUBLIC_URL`, and `FFMPEG_PATH` if ffmpeg is not on the PATH.

Build and run: `npm run build:shared`, then in `apps/api` `npm run build` and `npm start`.
In production the API refuses to start when any of these is missing or still an example value, and says which.

Check: `https://api.yourstore.com/health` answers, and the API log shows
"Starting video background jobs".

## 4. Deploy the web app

Set `NEXT_PUBLIC_API_URL` to the API's https address, deploy `apps/web` (`npm run build`, `npm start`), and
point `proof.yourstore.com` at it.

Check: `https://proof.yourstore.com/login` loads, and signing in works with the admin account from step 1.5.

## 5. The camera agent

On the packing computer set `CLOUD_API_URL` to the API address and `STATION_API_KEY` to the same value the API
has. Set `ALLOWED_ORIGINS` to the web app's address.

Start and stop go straight from the dashboard to the camera agent on the same computer, so packing is done in
the browser on the packing computer. The first time the hosted dashboard talks to the agent, the browser may ask
to allow access to devices on the local network: choose Allow.

## 6. Customer order page

The code is in `shopify-app/` and has not been deployed or tested.

1. In `shopify-app`, run `npx shopify app config link` to connect it to your app.
2. `npx shopify app dev` to preview on a development store, then `npx shopify app deploy`.
3. In Shopify, open Settings, Checkout, "Customize" for the customer accounts and add the
   **ShipProof packing video** block to the order status page.
4. The store must use the new customer accounts and the upgraded order status page.

## 7. End-to-end test

1. Place a test order. Sign in, record and finish packing it.
2. Check Supabase Storage has the file and the `videos` table has an `ACTIVE` row.
3. Check the order in Shopify has the three `shipproof` fields.
4. Open the order status page as the customer: **Order packed** and **Watch Packing Video** appear, and the
   button opens the video on your web address without any sign-in.
5. Mark the fulfillment delivered. In Supabase, the video's `expires_at` is exactly 30 days later. On a second
   test order, add the `RTO` tag instead: its `expires_at` is 60 days after that day.
6. To see deletion without waiting weeks, set that video's `expires_at` to the past. Within the hour the file
   is gone from Storage, the status is `DELETED`, the Watch button disappears and the link says the video was removed.

## Known limits

- A video of an order that is never delivered and never tagged RTO (cancelled, lost) is never deleted. Decide
  whether you want a fallback age limit.
- The API holds the live camera connection in memory, so run a single API instance.
- Trimming happens on the API host and needs `ffmpeg`. Long videos take a few minutes.
- A retake or a trim replaces the video; a retake also gives the order a new customer link.
