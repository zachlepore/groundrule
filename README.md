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

## Municipality theming

Municipalities may color a small set of semantic accents while Groundrule continues to own typography, spacing, geometry, layout, hierarchy, interactions, and regulatory presentation. Themes live in `lib/municipality-themes.ts`; add a municipality entry there and apply `MunicipalityTheme` once at its route layout. Unknown slugs safely use the neutral Groundrule default.

The six tokens cover an accessible primary/foreground pair, a restrained secondary accent, a soft surface, section dividers, and a secondary soft surface. Adapt brand colors for sufficient contrast rather than copying them literally, and keep tints quiet: themes should provide continuity, not white-label the product.

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
