# Labstream Studio

Plataforma de la productora audiovisual: web pública con CMS + webapp interna para gestión de proyectos, equipos y aprobaciones de cliente.

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS 4**
- **PostgreSQL** + **Prisma** (ORM y migraciones)
- **NextAuth v5** (credentials, bcrypt, JWT)
- **Resend** (emails transaccionales — opcional en dev)

## Estructura de la app

| Sección | URL | Para quién |
|---|---|---|
| Web pública | `/` , `/servicio` | Visitantes |
| CMS | `/cms` | Equipo editorial — edita la web pública |
| Webapp | `/app` | Productores, equipo y clientes — gestión de proyectos |

## Roles

**CMS** (edita la web pública)
- `SUPER_ADMIN` — todo
- `EDITOR` — solo páginas asignadas
- `REVIEWER` — solo lectura / aprueba

**Webapp** (proyectos)
- `MASTER` (= SUPER_ADMIN) — visión global, asigna productoras a proyectos
- `PRODUCER` — gestiona sus proyectos, asigna equipo
- `TEAM` (DIRECTOR, EDITOR, DOP, etc.) — solo proyectos asignados
- `CLIENT` (CLIENT_LEAD, CLIENT_VIEWER) — ve y aprueba sus proyectos

## Setup local

### Requisitos

- Node 20+
- PostgreSQL 16 (`brew install postgresql@16` y `brew services start postgresql@16`)

### Pasos

```bash
git clone <este-repo>
cd labstream
npm install

# 1. Crear BD local
createdb labstream_dev

# 2. Variables de entorno
cp .env.example .env
# Edita .env con tu USER de Postgres y AUTH_SECRET (genera con: openssl rand -base64 32)

# 3. Migrar schema y cargar datos demo
npx prisma migrate dev
npm run db:seed

# 4. Arrancar
npm run dev
```

Abre `http://localhost:3000`.

## Credenciales demo (después del seed)

| Rol | Email | Contraseña |
|---|---|---|
| Master / Super Admin | `admin@labstream.local` | `Labstream2026!` |
| Productor (Labstream) | `lucia@labstream.local` | `Demo2026!` |
| Director | `carlos@labstream.local` | `Demo2026!` |
| Editora | `ana@labstream.local` | `Demo2026!` |
| DOP | `javier@labstream.local` | `Demo2026!` |
| Productora externa | `sofia@productoranorte.com` | `Demo2026!` |
| Cliente PepsiCo (aprueba) | `marta@pepsico.com` | `Demo2026!` |
| Cliente PepsiCo (observa) | `ricardo@pepsico.com` | `Demo2026!` |
| Cliente Bavaria | `elena@bavaria.co` | `Demo2026!` |

> ⚠️ Cambiar todas las contraseñas en producción.

## Scripts

```bash
npm run dev         # dev server (puerto 3000)
npm run build       # build producción
npm run start       # start producción

npm run db:migrate  # crear/aplicar migración
npm run db:seed     # cargar datos demo
npm run db:studio   # GUI visual de Postgres (http://localhost:5555)
npm run db:reset    # reset BD (¡cuidado!)
```

## Deploy

**Recomendación**: Vercel (Next.js) + Neon (Postgres serverless free) + Resend (email).

1. Push a GitHub
2. Conecta el repo en [vercel.com](https://vercel.com)
3. Crea Postgres en [neon.tech](https://neon.tech) (free) → copia la connection string
4. En Vercel agrega variables:
   - `DATABASE_URL` (de Neon)
   - `AUTH_SECRET` (genera con `openssl rand -base64 32`)
   - `NEXTAUTH_URL` = la URL de Vercel
   - `AUTH_TRUST_HOST=true`
   - `RESEND_API_KEY` (opcional — emails)
5. Después del primer deploy, ejecuta contra la BD de Neon:
   ```
   npx prisma migrate deploy
   npm run db:seed
   ```

## Variables de entorno

Ver `.env.example` para la lista completa.

| Variable | Requerida | Descripción |
|---|---|---|
| `DATABASE_URL` | sí | Postgres connection string |
| `AUTH_SECRET` | sí | Secret de NextAuth (32+ chars) |
| `NEXTAUTH_URL` | sí | URL pública del sitio |
| `RESEND_API_KEY` | no | Para enviar emails reales |
| `EMAIL_FROM` | no | Remitente de emails |
| `CONTACT_EMAIL_TO` | no | Destinatario del form de contacto |
| `MAX_UPLOAD_MB` | no | Tamaño máx upload (default 50) |
