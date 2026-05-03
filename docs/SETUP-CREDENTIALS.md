# Setup de credenciales — 5 minutos

Este documento explica cómo activar las features avanzadas del integration con Drive y storage en Vercel Blob.

**Sin estas credenciales la app funciona** — solo no tendrás:
- Multi-select + descarga ZIP de fotos en carpetas Drive
- Detección automática de cambios en carpetas Drive
- Storage persistente en Vercel Blob (los uploads del CMS se borran en cada deploy)

Con las credenciales el cliente ve un visor con miniaturas, lightbox, selección y descarga, en vez del iframe simple de Drive.

---

## Parte A — Vercel Blob (storage persistente · 2 min)

1. Entra a tu proyecto en Vercel: https://vercel.com/labstream2026s-projects/labstream
2. Click en **Storage** (sidebar izquierda)
3. Click en **Create Database** → elige **Blob**
4. Nombre: `labstream-uploads` → click **Create**
5. Una vez creado, te mostrará un **token** (algo como `vercel_blob_rw_xxx_yyy`) — cópialo
6. Ve a **Settings → Environment Variables** y agrega:
   - Nombre: `BLOB_READ_WRITE_TOKEN`
   - Valor: el token que copiaste
   - Environments: Production + Preview
7. Click **Redeploy** desde la pantalla principal del proyecto

✅ Ya tu CMS guarda los archivos subidos en Vercel Blob (10 GB free, $0.15/GB/mes después).

---

## Parte B — Google Drive API Key (lectura de carpetas públicas · 5 min)

Esto te activa el visor avanzado para carpetas Drive marcadas como "Cualquiera con el link".

### B.1 Crear proyecto en Google Cloud

1. Entra a https://console.cloud.google.com (con tu cuenta de Workspace de Labstream)
2. Click en el selector de proyecto arriba → **New Project**
3. Nombre: `labstream-drive` → click **Create**
4. Espera ~30 segundos, luego selecciónalo

### B.2 Habilitar Drive API

1. En el menú hamburguesa → **APIs & Services → Library**
2. Busca **Google Drive API** → click → **Enable**

### B.3 Crear API Key

1. **APIs & Services → Credentials**
2. Click **Create Credentials → API Key**
3. Te muestra la key: `AIzaSyXXXXXXXXXX...` — cópiala
4. Click en la key → **Edit**:
   - **API restrictions**: marca **Restrict key** → selecciona solo **Google Drive API**
   - **Application restrictions** (opcional pero recomendado):
     - Selecciona **HTTP referrers**
     - Agrega: `https://labstream.vercel.app/*` y `http://localhost:3000/*`
   - **Save**

### B.4 Agregar a Vercel

1. Vercel → **Settings → Environment Variables**
2. Nombre: `GOOGLE_DRIVE_API_KEY`
3. Valor: la API key
4. Production + Preview
5. **Redeploy**

✅ Ya las carpetas de Drive públicas (compartidas como "Anyone with link") se listan vía API. Cliente ve visor avanzado.

---

## Parte C — Google Service Account (para carpetas privadas · 8 min)

Solo necesitas esto si quieres **NO** marcar las carpetas como públicas. Puedes saltártelo si te basta con compartir como "Anyone with the link".

### C.1 Crear Service Account

1. Google Cloud Console (mismo proyecto `labstream-drive`)
2. **APIs & Services → Credentials**
3. **Create Credentials → Service Account**
4. Nombre: `labstream-drive-bot`
5. ID se autogenera (algo como `labstream-drive-bot@labstream-drive.iam.gserviceaccount.com`) — **anota este email**
6. Sin roles necesarios (Skip → Done)

### C.2 Generar JSON key

1. Click en la SA recién creada
2. Tab **Keys → Add Key → Create new key**
3. Tipo: **JSON** → Create
4. Se descarga un archivo `labstream-drive-XXXXXXX.json`
5. **Abre el JSON en un editor de texto y cópialo COMPLETO**

### C.3 Agregar a Vercel

1. Vercel → **Settings → Environment Variables**
2. Nombre: `GOOGLE_SERVICE_ACCOUNT_JSON`
3. Valor: pega el JSON completo (Vercel lo guarda como una sola línea)
4. Production + Preview
5. **Redeploy**

### C.4 Compartir carpetas con la Service Account

Para CADA carpeta de Drive que quieras que el cliente pueda ver:
1. Abre la carpeta en Drive
2. Click derecho → **Compartir**
3. Pega el email de la SA: `labstream-drive-bot@labstream-drive.iam.gserviceaccount.com`
4. Permiso: **Viewer** → **Send**

✅ Ahora la Service Account puede leer esas carpetas aunque sean privadas.

---

## Verificar que funciona

1. Ve a https://labstream.vercel.app/cms/login
2. Login: `admin@labstream.local` / `Labstream2026!`
3. Ve a `/app/projects` → entra al proyecto **PepsiCo Agro · Comercial 30s**
4. Verás 3 entregables demo con los 3 links que me pasaste:
   - "Sesión fotográfica · Demo Drive" (carpeta de fotos)
   - "Master final · Demo video Drive (1 archivo)"
   - "Cortes para redes · Demo carpeta videos"
5. Click en cualquiera → si las credenciales están bien, ves el visor avanzado.
   Si no, ves el iframe embed (también funciona, solo sin features avanzados).

---

## Costos

| Recurso | Free | Si pasas free | Notas |
|---|---|---|---|
| Vercel Blob | 1 GB storage + 1 GB egress/mes | $0.15/GB storage, $0.30/GB egress | Para tu volumen real seguramente $0/mes |
| Google Drive API | 1B queries/día | — | Sin costo monetario, solo rate limits muy generosos |
| Google Drive Storage | (ya pagas con Workspace) | — | No hay costo adicional |

**Estimación realista para Labstream**: $0/mes los primeros 6-12 meses. Después depende del volumen de fotos en CMS.

---

## Si algo sale mal

- **"Cannot list folder"**: revisa que la carpeta esté compartida con la SA (Parte C.4) o pública con link (Parte B)
- **API key inválida**: revisa que `GOOGLE_DRIVE_API_KEY` no tenga espacios, y que en Google Cloud el key tenga acceso a Drive API
- **Vercel Blob 401**: revisa que `BLOB_READ_WRITE_TOKEN` sea el correcto del proyecto, no de otro
- **Sin credenciales todo igual funciona**: la app cae a modo iframe embed → cliente ve la carpeta de Drive embebida (sin selección/descarga avanzada)

---

## Variables de entorno completas

Lo que debe estar en Vercel después de todo este setup:

```
DATABASE_URL                    (Neon)
AUTH_SECRET                     (generado)
NEXTAUTH_URL                    (https://labstream.vercel.app)
AUTH_TRUST_HOST                 (true)
BLOB_READ_WRITE_TOKEN           (Parte A)
GOOGLE_DRIVE_API_KEY            (Parte B)
GOOGLE_SERVICE_ACCOUNT_JSON     (Parte C — opcional)
RESEND_API_KEY                  (opcional, para emails reales)
EMAIL_FROM                      (opcional)
CONTACT_EMAIL_TO                (opcional)
```
