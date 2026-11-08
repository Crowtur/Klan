# Klubo Parte 5

## Actualizar desde la Parte 4

Usa la configuración de PostgreSQL, autenticación, Stripe y UploadThing de tu instalación anterior. Desde la carpeta del proyecto, ejecuta:

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
npm start
```

La Parte 5 usa el esquema de la Parte 4. El cron de Vercel incluido en `vercel.json` llama a `GET /api/cron/read-notifications` a las 05:00 UTC (medianoche en Ecuador continental). Configura `CRON_SECRET` en el despliegue de producción. Si utilizas otro alojamiento, programa la misma petición y hora con la cabecera `Authorization: Bearer <CRON_SECRET>`. La operación borra únicamente registros con `readAt` informado.

La migración previa `20261105000100_queue_document_withdrawals` registra las eliminaciones pendientes de archivos. La retirada se intenta al confirmar la operación y el proceso programado existente `POST /api/cron/expired-plans` reintenta los fallos. Debe ejecutarse periódicamente con la cabecera `Authorization: Bearer <CRON_SECRET>`.

Para desarrollo usa `npm run dev`. Para ejecutar las pruebas aisladas desde la raíz:

```bash
node --import tsx --test scripts/*.cjs scripts/*.tsx
```

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
