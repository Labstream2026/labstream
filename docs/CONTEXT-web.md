# Contexto — Web pública + CMS de Labstream

> Lee este archivo antes de trabajar en cambios de la web pública o el CMS.
> Para la webapp de proyectos ver `CONTEXT-webapp.md`.

## Qué cubre esta sección

- **Web pública** (`/`, `/servicio`, `/cms/login`) — visible para visitantes
- **CMS** (`/cms/*`) — sólo equipo Labstream — gestiona el contenido público

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind 4
- PostgreSQL (Neon en prod, Postgres local en dev) + Prisma
- NextAuth v5 (credentials, bcrypt, JWT, sesiones server-side)
- Resend para emails (opcional — se loguea a consola si no hay API key)

## Modelo de datos relevante

```
Page (slug, title, status: DRAFT|REVIEW|PUBLISHED, isHome, blocks[], assignments[])
Block (page, type, order, data: Json, visible)
PageAssignment (page, user, canEdit)  // Editor solo ve páginas asignadas
Asset (source: UPLOAD|URL, url, mimeType, alt, ...)
Service (slug, title, summary, content, order, visible)
MenuItem (label, href, location)
SiteSettings (singleton: siteName, tagline, contactEmail, socials)
```

## Tipos de bloque del CMS (8)

Definidos en `src/lib/blocks.ts`:

| Tipo | Descripción | Datos |
|---|---|---|
| `hero` | Encabezado grande | eyebrow, title, subtitle, ctas |
| `stats` | Tarjetas con números | items[] |
| `richText` | Párrafos de texto | eyebrow, heading, body, align |
| `gallery` | Cuadrícula de imágenes | images[], columns 1-4 |
| `videoEmbed` | YouTube/Vimeo/.mp4 | url, caption |
| `cta` | Banner con botón | title, body, ctaLabel, ctaHref |
| `featureList` | Lista con icono | items[] (icon emoji, title, desc) |
| `image` | Imagen individual | url, alt, caption, fullWidth |

Para añadir un tipo nuevo: extender `BLOCK_TYPES`, `blockSchemas`, `BLOCK_DEFAULTS` en `src/lib/blocks.ts`, agregar form en `src/components/cms/BlockForms.tsx`, agregar renderer en `src/components/public/Blocks.tsx`.

## Estructura de archivos principales

```
src/
  app/
    page.tsx                    → Home pública (lee Page slug=home + Services)
    servicio/page.tsx           → Detalle de servicio (?id=slug)
    layout.tsx                  → Root layout (fonts Figtree + Instrument Serif)
    api/contact/route.ts        → Form de contacto (Resend)
    api/upload/route.ts         → Upload de archivos a /public/uploads
    cms/
      layout.tsx                → CmsShell (sidebar + auth gate)
      login/page.tsx            → Login (defaultRedirect=/app)
      page.tsx                  → Dashboard CMS
      pages/                    → CRUD de páginas + editor de bloques
      services/                 → CRUD de servicios
      assets/                   → Medios (upload + URL)
      users/                    → Usuarios CMS (solo Super Admin)
      settings/                 → Site settings
  components/
    Logo.tsx, Icons.tsx
    public/
      Navbar.tsx                → Hamburger en mobile, pill nav en desktop
      Hero.tsx                  → Hero principal (sin video, gradient)
      Services.tsx              → Grid 6 cards de servicio
      Process.tsx               → 5 pasos (briefing → entrega)
      Contact.tsx               → Form contacto (client component)
      Footer.tsx                → Footer con redes desde SiteSettings
      Blocks.tsx                → Renderers para los 8 tipos de bloque
    cms/
      CmsShell.tsx              → Sidebar CMS + drawer mobile
      BlockForms.tsx            → 8 forms editores por tipo de bloque
    ConfirmForm.tsx             → Helper client para confirmar antes de submit
  lib/
    prisma.ts                   → Singleton de Prisma
    blocks.ts                   → Registry de tipos de bloque + utils
    cms-guard.ts                → Auth helpers (requireCmsUser, etc.)
    site-settings.ts            → Helper para leer SiteSettings
    email.ts                    → Wrapper de Resend
  auth.ts                       → Config NextAuth
prisma/
  schema.prisma
  migrations/
  seed.ts                       → Datos demo
```

## Diseño / typography

- Tipografías Google Fonts (cargadas en `layout.tsx`):
  - **Figtree**: cuerpo, navegación, CTAs
  - **Instrument Serif** (italic): titulares grandes
- Variables CSS en `globals.css` (`--bg`, `--orange #E8640C`, `--accent #7B61FF`, etc.)
- Clases utility custom: `.lg` (liquid glass), `.lg-strong`, `.btn-primary`, `.btn-ghost`
- Responsive: hamburguesa < 1024px, sidebar drawer en CMS < 768px

## Imágenes y videos — tamaños esperados

(Las dimensiones son sugerencias, no obligatorias — todo es responsive)

| Lugar | Aspect | Ancho recomendado | Notas |
|---|---|---|---|
| **Hero — video de fondo** (no implementado aún, está como gradient) | 16:9 | 1920×1080 | MP4 ≤ 8 MB. Subir a Vimeo/YouTube y embed |
| **Bloque `gallery`** | 4:3 (forzado por CSS) | 1200×900 cada una | hasta 4 columnas |
| **Bloque `image`** | libre | hasta 1600px ancho | full-width o max-w-4xl |
| **Bloque `videoEmbed`** | 16:9 | YouTube/Vimeo URL | iframe responsive |
| **Asset · Logo navbar** | 4:1 | 520×128 | Actualmente SVG inline |
| **Service cover** (no implementado en cards aún) | 16:9 | 1200×675 | recomendado |
| **Open Graph (SEO)** | 1.91:1 | 1200×630 | Configurable en Page.metaTitle/metaDesc |
| **Favicon** | 1:1 | 256×256 SVG/PNG | Reemplazar `src/app/favicon.ico` |

**Formato recomendado**: WebP o AVIF para foto, SVG para iconos/logos, MP4 H.264 para video.

## Flujo para hacer cambios

### Cambios de **contenido** (sin tocar código)

1. Login en https://labstream.vercel.app/cms/login
2. CMS → Páginas → editar Inicio o Servicios
3. Agregar/mover/eliminar bloques con los botones del editor
4. Cambiar status a "Publicado" → guardar
5. Visible inmediatamente (con `revalidatePath` automático)

### Cambios de **código UI** (componentes, estilos)

1. Editar archivo local en `src/components/...` o `src/app/...`
2. Verificar local con `npm run dev` → http://localhost:3000
3. `git add . && git commit -m "..." && git push`
4. Vercel auto-deploya en ~1 min
5. Verificar en https://labstream.vercel.app

### Cambios de **schema** de BD

1. Editar `prisma/schema.prisma`
2. `npx prisma migrate dev --name describe_change` (crea migración, la aplica local, regenera client)
3. Si el seed lo necesita, actualizar `prisma/seed.ts`
4. `git push` → Vercel buildea
5. Aplicar la migración en Neon manualmente:
   ```
   DATABASE_URL='neon-url' npx prisma migrate deploy
   ```
6. Si necesitas re-sembrar:
   ```
   DATABASE_URL='neon-url' npx tsx prisma/seed.ts
   ```

### Cambios de **variables de entorno**

1. Local: editar `.env`
2. Producción: Vercel → Settings → Environment Variables → editar → Redeploy

## Hueco identificado (próxima mejora)

**El editor de bloques `image` y `gallery` pide URL en texto plano** — el usuario tiene que ir a `/cms/assets`, copiar la URL, volver al bloque y pegarla. Falta:

- **Asset Picker**: modal que abre la biblioteca de medios y permite seleccionar uno
- **Drag & drop directo** dentro del block form
- **Preview en vivo** del bloque mientras se edita

## Credenciales demo (CMS)

```
admin@labstream.local / Labstream2026!     (Super Admin · todo)
lucia@labstream.local / Demo2026!          (sin acceso CMS por defecto, solo webapp)
```

## URLs

- Live: https://labstream.vercel.app
- Repo: https://github.com/Labstream2026/labstream
- BD: Neon (proyecto labstream)

## Decisiones tomadas

- Subir archivos pesados (videos) **NO** se hace por la app — usar share link de Synology/Drive/Vimeo
- `/uploads` local solo para PDFs, imágenes pequeñas, briefs
- Archivos en producción están en `/public/uploads` del servidor Vercel — **se pierden en cada deploy**. Para producción real hay que migrar a Cloudflare R2 o Vercel Blob (tarea pendiente)
- Email opcional — sin `RESEND_API_KEY` solo se loguea
