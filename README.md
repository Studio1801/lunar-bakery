# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## Database: Google Sheet

`apps-script/Code.gs` turns the Lunar Bakery Database sheet into the shop's database
(same idea as the Baklava Story sheet). Setup is in the comment at the top of that file.
Vercel env vars: `SHEETS_URL` (the Web app /exec URL), `SHEETS_SECRET` (same value as the
script property `LUNAR_SECRET`), `LUNAR_STAFF_KEY` (the dashboard password).
Without the sheet vars the site falls back to Postgres.
