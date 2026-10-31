# Paolo Savio Color Lab — Commerce backend (staging)

**Status:** integration code only; checkout and webhook are OFF by default. No live payments or digital deliveries have been enabled.

## Architecture

- Storefront: static GitHub Pages at https://www.paolosavio.eu/color-lab/
- Backend: separate Vercel project, root directory set to colorlab-commerce
- Stripe: POST /api/checkout creates payment session with server-owned product and price details.
- Stripe webhooks: POST /api/stripe-webhook verifies raw body signature, confirms amount/payment and writes orders.
- Resend: a verified sender will email purchased file links after verified payment.
- Supabase: dedicated project with protected order tables and a private Storage bucket.
- Download: GET /api/download?sku=...&token=... checks HMAC token and paid order, then redirects to a 60-second Storage signed URL.
- Health: GET /api/health reports safe readiness flags without secrets.

## Important restrictions

No live checkout is enabled. Never put private ZIP files in GitHub Pages or a public repository. Do not expose Stripe secret, Resend key or Supabase service role in browser scripts. Reuse EventLiveOne's architecture, NOT its customer database or credentials unless legally authorized.

The seven SKUs and storage paths live in lib/core.js. Prices are indicative: 2490 euro cents for the 18-LUT bundle; 690 cents each mini-pack.

## Setup after verifying merchant and ownership

1. Choose or create a separate Supabase project. Apply sql/001_colorlab_schema.sql after review and confirm RLS and policies.
2. Upload seven product ZIP archives to exact paths inside private bucket colorlab-downloads.
3. Verify paolosavio.eu as a Resend sending domain and set RESEND_FROM using the actual verified sender.
4. Create a dedicated Vercel project and set Root Directory to colorlab-commerce. Add .env.example values through protected environment settings. Never commit secrets.
5. Configure Stripe TEST keys and webhook signing secret for POST /api/stripe-webhook; begin with ENABLE_WEBHOOK=true. ENABLE_CHECKOUT=true only after preview verification.
6. Test successful payment, pending/failed payment, webhook retries and duplicate events, refunds, wrong SKU, expired token, email and storage signed URLs.
7. Only after passing tests, add a secure client-to-API checkout link to the site. Production must remain disabled until explicitly approved and legal terms completed.

## Security notes

- Prices and product IDs are validated server-side against a fixed catalogue.
- Stripe signature verification uses HMAC-SHA256, timestamp tolerance and raw body.
- The download link is tied to the paid Stripe checkout session and expires in 30 days. Storage URLs expire in 60 seconds.
- Refund events revoke generation of new links by changing order state to refunded; previously signed 60-second URLs expire on their own.
- Resend retries are idempotent per purchase. Make sure customer support can reissue access after 30 days.
- Site legal/privacy documents are drafts, not final terms of sale.
- Do not deploy against the PhotoMetaGo or PlayHandball database without express project selection.
- Run node --test tests/*.test.js in the backend directory.

## Known prerequisites

- Stripe is not yet connected to this chat; merchant account authorization needs confirmation.
- Resend currently has only pressandsport.it verified; paolosavio.eu requires DNS verification before order emails.
- No dedicated Color Lab Supabase or Vercel project was found in the connected accounts.
