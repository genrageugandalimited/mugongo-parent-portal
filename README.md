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

## Hosting on Vercel

The Vercel build uses the database connected in Vercel (not the Lovable `.env`). In Vercel → Settings → Environment Variables it needs:

- `SUPABASE_URL`, `SUPABASE_ANON_KEY` (or `SUPABASE_PUBLISHABLE_KEY`) and `SUPABASE_SERVICE_ROLE_KEY` — added automatically by Vercel's database integration
- `PUPIL_SESSION_SECRET` — any private random text of at least 32 characters

If one is missing, the build stops with a message naming it and the previous deployment stays live.

