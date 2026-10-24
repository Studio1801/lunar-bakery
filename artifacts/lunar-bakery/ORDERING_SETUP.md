# Lunar Bakery ordering

The customer flow is a three-step pickup request: choose pastries (or describe a custom cake), add contact and pickup preferences, then review and send. Requests are not paid online, and pickup dates, times, locations, and custom-cake prices are not confirmed until Lunar follows up.

## Persistent storage

The order API needs a PostgreSQL database. Add these environment variables to the deployment that serves `artifacts/lunar-bakery`:

- `DATABASE_URL`: a connection string for a managed PostgreSQL database. Use the provider’s TLS-enabled URL.
- `ADMIN_JOIN_CODE`: a long, unique code for creating staff accounts. Store it as a secret environment variable and share it with staff privately.

The API creates the Lunar tables and indexes on its first request. No separate migration command is required. Without `DATABASE_URL`, the storefront still loads, but order submissions and staff access return a setup message rather than saving data.

## Staff access

Open `/staff`, choose **Create a staff login**, and use the owner join code. Passwords must be at least 12 characters. Passwords are stored as scrypt hashes; sign-in uses an HTTP-only, same-site cookie that expires after 14 days. Each staff member should have their own login.

The board includes week navigation, daily pickup views, status updates, a pastry bake list, order history, search and status filters, and CSV export. The export contains customer contact details and order notes, so keep downloaded copies private.

## Menu and pricing

The seasonal menu and its prices are defined in `src/lib/order-catalog.ts`. The server uses that catalog to calculate totals; it does not trust prices sent by the browser. Update the catalog when the menu or prices change.
