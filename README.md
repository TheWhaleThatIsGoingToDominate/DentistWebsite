# Aurora Dental Website

A premium single-page dental clinic website built with React, TypeScript, Vite, and Tailwind CSS.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL shown by Vite. To create a production build:

```bash
npm run build
```

## Editing the clinic

- Clinic name, phone, WhatsApp number, email, address, opening hours: `src/data/clinic.ts`
- Treatments and descriptions: `src/data/clinic.ts`
- Testimonials, prices, FAQs, and image URLs: `src/data/clinic.ts`
- Page section layout and copy: `src/App.tsx`
- Header and mobile menu: `src/components/Header.tsx`
- Colours, fonts, and design tokens: `tailwind.config.js`
- Global styling and animation: `src/index.css`

The contact form is visual only. All booking CTAs open WhatsApp using the placeholder number in `src/data/clinic.ts`.
