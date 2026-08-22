# Groundrule

Groundrule is intended to become a municipal property guidance application that makes local property rules easier to understand. This repository currently contains only the initial application shell; it does not yet perform property lookups or provide municipal guidance.

## Technology

- [Next.js](https://nextjs.org/) with the App Router
- React
- TypeScript
- ESLint
- Plain CSS
- Supabase JavaScript client
- npm

The intentionally small dependency set keeps the application straightforward to run locally and compatible with a future Vercel deployment.

## Local development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

For a production build and local production server, run:

```bash
npm run build
npm start
```

## Current scope

This foundation contains a single placeholder landing screen for the initial municipality, Clearwater, Florida. The municipality label is read on the server from the existing Supabase `public.municipalities` table using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Authentication, database schema changes, PostGIS integration, municipal source documents, structured rules, parcel data, and property lookup remain intentionally deferred. Environment-specific settings and secrets must be supplied through local environment files and Vercel environment variables rather than committed to this repository.
