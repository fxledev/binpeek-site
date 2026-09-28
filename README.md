# binpeek site

The shop. This repository exists on its own, and on purpose: the product code is
private, and GitHub Pages does not serve a private repository on a free plan, so
the page that sells the thing has to live somewhere public.

There is nothing secret here. The page is static HTML with one small script and
no backend, it never sees a jar and it never asks for a file. Buying happens on
Stripe, account state lives in Supabase, and neither is wired into this
repository.

```
site/index.html   markup
site/site.css     the design, including the pointer spotlight and the shine border
site/site.ts      three small behaviours: spotlight, counters, marquee
```

Build and preview:

```
npm install
npm run dev
npm run build
```

A push to `main` builds and publishes to Pages.
