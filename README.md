# Translate3D (Shopify Headless con Hydrogen)

Este proyecto es una tienda headless en **Shopify + Hydrogen (Remix/React Router)**.

## Stack

- Shopify Hydrogen `2025.x`
- React 18
- Tailwind CSS v4 (CSS-first)
- `shadcn/ui` como base de componentes (`/app/components/ui/*`)

## Requisitos

- Node `>= 18`
- Bun (recomendado): https://bun.sh
- Shopify CLI (`shopify`) (ya viene en dependencias del proyecto)

## Desarrollo local

```bash
cd nozzle
bun install
bun run dev
```

Nota:
- `bun run dev` usa `--customer-account-push`, por lo que requiere internet para generar dominio de túnel y habilitar login de Customer Account API en local.
- para que la app funcione de verdad necesitas conectar una tienda de Shopify (Storefront API token).

## Conectar Shopify (Storefront API)

1. Crea una tienda (dev store funciona perfecto).
2. Enlaza Hydrogen con tu tienda:

```bash
cd nozzle
bun shopify hydrogen link
```

3. Descarga variables de entorno (si aplica en tu caso):

```bash
bun shopify hydrogen env pull
```

El dev server usa `.env` (MiniOxygen). Debes tener variables tipo `PUBLIC_STORE_DOMAIN` y `PUBLIC_STOREFRONT_API_TOKEN`.

### Variables requeridas (Hydrogen)

- `SESSION_SECRET` (min 32 chars recomendado)
- `PUBLIC_STORE_DOMAIN` (ej: `tu-tienda.myshopify.com`)
- `PUBLIC_CHECKOUT_DOMAIN` (si no tienes dominio de checkout custom, usa el mismo que `PUBLIC_STORE_DOMAIN`)
- `PUBLIC_STOREFRONT_API_TOKEN` (token público Storefront API)
- `PRIVATE_STOREFRONT_API_TOKEN` (token privado Storefront API; temporalmente puede ser el mismo que el público)
- `PUBLIC_STOREFRONT_ID` (Storefront ID, para analytics)
- `SHOP_ID` (ID numérico de la tienda, para Customer Account API)
- `PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID` (Customer Account API client id)
- `PUBLIC_CUSTOMER_ACCOUNT_API_URL` (base URL `https://shopify.com/<SHOP_ID>`; Hydrogen no lo usa hoy, pero el tipo lo exige)

### API administrativa (panel, cotizaciones y rastreo)

La tienda necesita una app instalada en la misma organizacion de Shopify con acceso a los recursos usados por estas funciones. Guarda `SHOPIFY_ADMIN_API_CLIENT_ID` y `SHOPIFY_ADMIN_API_CLIENT_SECRET` como variables privadas de Oxygen Production; nunca las publiques como variables `PUBLIC_` ni las confirmes en Git. Hydrogen obtiene un token temporal de Shopify y lo renueva antes de que caduque.

`PUBLIC_STORE_DOMAIN` ya apunta al dominio canonico de la tienda (`0jdqr1-hd.myshopify.com`), que debe usarse para la autenticacion administrativa. No lo sustituyas por el alias `translate3d.myshopify.com`. Opcionalmente, `SHOPIFY_STORE_DOMAIN` puede fijar otro dominio canonico de Shopify y `SHOPIFY_ADMIN_API_VERSION` puede fijar la version estable de Admin API (por defecto `2026-01`). El token heredado `SHOPIFY_ADMIN_API_ACCESS_TOKEN` sigue siendo compatible si ya existe, pero no es necesario para la app del Dev Dashboard.

## Seed de datos (blog + colecciones + productos)

Como no tienes data inicial en Shopify, incluimos un script para crear los datos del landing en tu tienda:

- Blog: `Blog` (handle esperado: `blog`) + 4 art\u00edculos
- Colecciones (handles):
  - `modelos-3d`
  - `filamentos`
  - `resinas`
  - `refacciones`
  - `impresiones` (puede estar vac\u00eda al inicio)
  - `best-sellers`
- Productos (del mock del repo viejo): 3 productos + im\u00e1genes + tags

### Requisitos del Admin API token

Necesitas un **Custom App** en Shopify Admin con un **Admin API access token** con scopes como:

- `write_products`
- `write_content`

### Ejecutar seed

```bash
cd nozzle
SHOPIFY_STORE_DOMAIN="tu-tienda.myshopify.com" \
SHOPIFY_ADMIN_API_ACCESS_TOKEN="shpat_..." \
bun run seed:shopify
```

Importante: el seed no es 100% idempotente; si lo ejecutas varias veces puede duplicar contenido.

## Test/Verificaci\u00f3n (real fetch)

Este script valida que la data que usa el landing exista y sea fetchable desde el **Storefront API**.

```bash
cd nozzle
PUBLIC_STORE_DOMAIN="tu-tienda.myshopify.com" \
PUBLIC_STOREFRONT_API_TOKEN="..." \
bun run test:shopify
```

Tambi\u00e9n acepta `SHOPIFY_STORE_DOMAIN` / `SHOPIFY_STOREFRONT_API_TOKEN`.

## Notas de producto

- Idioma: **espa\u00f1ol** (por ahora).
- El “order tracker” en Hero/Footer est\u00e1 intencionalmente como **dummy** (deshabilitado) para decidir provider/servicio despu\u00e9s.
- El landing usa Shopify real:
  - “Featured” = art\u00edculos de blog (`blog`)
  - Categor\u00edas = colecciones por handle
  - Best sellers = productos (Storefront API)
