# Subdominio admin.labstreamsas.com (opcional)

Por defecto el área de administración vive en `labstreamsas.com/admin`,
`/cms` y `/app`. Si más adelante quieres aislar la administración en un
subdominio (más limpio para el equipo, separa cookies/bookmarks), aquí
están los pasos. No es necesario; el sistema ya está protegido por
login. Solo agrega un alias.

## Cómo se comporta hoy

| URL | Quién entra | Cómo se ve |
|---|---|---|
| `labstreamsas.com` | Cualquiera | Sitio público |
| `labstreamsas.com/cms` | CMS_EDITOR · CMS_REVIEWER · ADMIN | Portal CMS |
| `labstreamsas.com/app` | PRODUCER · TEAM · CLIENT · ADMIN | Web App |
| `labstreamsas.com/admin` | ADMIN | Super Admin |

Los 3 cuentan con la pestañera (`AreaSwitcher`) arriba que muestra solo
las áreas a las que el usuario tiene acceso. Login único: el botón
"Clientes" del navbar lleva a `/cms/login` que tras autenticar te
manda automáticamente a tu área según tu `kind`.

El ⚙ del navbar público linkea directo a `/admin` — usuarios no admin
caen en login y luego son redirigidos a su propia área.

## Si quieres subdominio aparte (ej: admin.labstreamsas.com)

### Paso 1 — Agregar dominio en Vercel
1. Vercel → tu proyecto → Settings → Domains → **Add**
2. `admin.labstreamsas.com` → Add

### Paso 2 — Crear el registro DNS
En el panel donde tienes `labstreamsas.com`:

| Tipo | Nombre | Valor |
|---|---|---|
| CNAME | `admin` | `cname.vercel-dns.com` |

Espera 5 min – 1 h. SSL se emite automático.

### Paso 3 — (Opcional) Reescritura interna a /admin

Si quieres que `admin.labstreamsas.com` muestre `/admin` directamente
(sin que la URL en el browser cambie), crea
`src/middleware.ts` con:

```ts
import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  if (host.startsWith("admin.") && !req.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.rewrite(new URL(`/admin${req.nextUrl.pathname}`, req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: "/((?!_next|api|favicon).*)" };
```

Con eso, `admin.labstreamsas.com/users` muestra el contenido de
`labstreamsas.com/admin/users`. No es necesario para que funcione el
login — solo es cosmético.

### Paso 4 — (Opcional) Bloquear el acceso público al `/admin` desde el dominio principal

Si quieres que `/admin` SOLO se vea desde `admin.labstreamsas.com`
(refuerza el aislamiento), añade al middleware:

```ts
if (req.nextUrl.pathname.startsWith("/admin") && !host.startsWith("admin.")) {
  return NextResponse.redirect(
    new URL(`https://admin.labstreamsas.com${req.nextUrl.pathname}`, req.url),
  );
}
```

## Recomendación

No lo necesitas hoy. El login + guard de `kind === ADMIN` ya bloquea a
quien no debe entrar. Agrega el subdominio solo si:

- Quieres que tu equipo bookmarkee `admin.labstreamsas.com` en lugar de
  recordar `/admin`
- Vas a meter en el futuro Vercel Authentication (capa extra de auth a
  nivel de edge) solo para esa parte
- Quieres separar cookies/sesiones entre el sitio público y el admin
  (no aplica todavía)

Para todo lo demás, `labstreamsas.com/admin` está bien.
