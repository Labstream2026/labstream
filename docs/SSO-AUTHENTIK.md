# SSO con Authentik (login del equipo vía el Authentik del NAS)

La webapp y el CMS pueden iniciar sesión con **Authentik** (el de `auth.labstreamsas.com`)
además del login por email+contraseña. Es **opcional**: si no defines las variables,
todo sigue funcionando con email+contraseña como hasta ahora.

## Cómo funciona

- Authentik es el proveedor de identidad (OIDC). NextAuth (Auth.js) ya trae el
  conector de Authentik incluido.
- Al entrar por Authentik, la persona se **empareja por email** con un usuario que
  **ya exista y esté activo** en la app. De ahí salen su **rol y tipo** (ADMIN,
  Productor, Equipo, Cliente, etc.). Authentik solo verifica la identidad; los
  permisos siguen viviendo en la app.
- Si el email no corresponde a un usuario existente y activo, **se rechaza** el
  acceso (no se crean usuarios automáticamente). Si en el futuro quieres
  auto-provisionar usuarios nuevos con un rol por defecto, se ajusta en
  `src/auth.ts` (callback `signIn`).

## Paso 1 — Crear el proveedor en Authentik

En `https://auth.labstreamsas.com` (admin):

1. **Applications → Providers → Create → OAuth2/OpenID Provider.**
2. Configura:
   - **Name:** `Labstream`
   - **Authorization flow:** el de consentimiento implícito por defecto.
   - **Client type:** `Confidential`.
   - **Redirect URIs / Origins** (uno por línea):
     ```
     https://labstreamsas.com/api/auth/callback/authentik
     https://clientes.labstreamsas.com/api/auth/callback/authentik
     http://localhost:3000/api/auth/callback/authentik
     ```
   - **Signing key:** la que tengas por defecto.
   - **Scopes:** `openid`, `email`, `profile`.
3. Guarda y copia el **Client ID** y el **Client Secret**.

## Paso 2 — Crear la Application

1. **Applications → Applications → Create.**
2. **Name:** `Labstream`, **Slug:** `labstream`, **Provider:** el que creaste.
3. (Opcional) Restringe el acceso por grupo/política para que solo el equipo pueda
   entrar.

## Paso 3 — Obtener el Issuer

El **Issuer** es la URL de configuración OIDC del provider, normalmente:

```
https://auth.labstreamsas.com/application/o/labstream/
```

(Lo confirmas en el provider → "OpenID Configuration Issuer". El metadata vive en
`<issuer>.well-known/openid-configuration`.)

## Paso 4 — Variables de entorno (en el NAS, archivo `.env` del deploy)

```
AUTHENTIK_ISSUER="https://auth.labstreamsas.com/application/o/labstream/"
AUTHENTIK_CLIENT_ID="<client id>"
AUTHENTIK_CLIENT_SECRET="<client secret>"
```

Redespliega. Aparecerá el botón **"Iniciar sesión con Authentik"** en `/cms/login`.

## Notas

- Asegúrate de que cada persona del equipo tenga un usuario en la app (en
  `/app/users` o `/cms/users`) con el **mismo email** que en Authentik, y con el
  rol/tipo correcto.
- El admin con contraseña sigue funcionando como respaldo (no dependes solo del SSO).
- El reverse proxy de DSM ya enruta `labstreamsas.com` y `clientes.labstreamsas.com`;
  los redirect URIs de arriba cubren ambos.
