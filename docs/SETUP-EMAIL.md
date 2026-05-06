# Setup Email + Dominio

Esta guía deja **emails saliendo desde tu dominio** y la web pública en
**labstreamsas.com**. Hay 3 servicios que tocas: Resend (emails), Vercel
(dominio web), y el panel DNS donde tengas registrado el dominio.

---

## Parte 1 — Resend (envío de emails) · ~10 min

### 1.1. Crear cuenta y API key

1. Ve a <https://resend.com> → **Sign Up** (gratis: 100 emails/día, 3.000/mes).
2. Una vez dentro, ve a **API Keys** → **Create API Key**.
3. Nombre: `labstream-prod` · Permissions: `Sending access`.
4. Copia el token que empieza con `re_…`. **Solo se ve una vez.**

### 1.2. Verificar el dominio `labstream.co`

Para que los emails salgan de `noreply@labstream.co` (no de
`onboarding@resend.dev`), tienes que verificar el dominio.

1. En Resend → **Domains** → **Add Domain** → `labstream.co`.
2. Resend te muestra 3-4 registros DNS (MX, TXT con SPF, TXT con DKIM,
   y opcionalmente DMARC).
3. Entra al panel donde tienes registrado `labstream.co` (GoDaddy,
   Namecheap, Cloudflare, etc.) y agrega cada registro **exactamente
   como aparece**:
   - Tipo: `MX` o `TXT` según diga Resend
   - Nombre/Host: lo que diga Resend (ej. `send`, `_dmarc`)
   - Valor: lo que diga Resend
   - TTL: 3600 (1h) está bien
4. En Resend, dale **Verify Domain**. Puede tardar 5 min – 1 h en propagar.
5. Cuando aparezca **Verified** ✓ ya puedes enviar como
   `noreply@labstream.co`.

> **Si no quieres tocar DNS aún:** salta este paso. Los emails saldrán
> desde `Labstream Studio <onboarding@resend.dev>` (default de Resend) y
> los `replyTo` siguen apuntando a `hola@labstream.co`, así que el
> equipo recibe las respuestas correctamente. La única diferencia
> visible es la dirección "From" que ve el cliente.

### 1.3. Cargar variables en Vercel

1. <https://vercel.com/dashboard> → proyecto **labstream** →
   **Settings** → **Environment Variables**.
2. Añade estas 3 vars (Production, Preview, Development — los 3 ambientes):

| Name | Value |
|---|---|
| `RESEND_API_KEY` | `re_…` (la que copiaste en 1.1) |
| `EMAIL_FROM` | `Labstream Studio <noreply@labstream.co>` (o `<onboarding@resend.dev>` si no verificaste el dominio) |
| `CONTACT_EMAIL_TO` | `hola@labstream.co` |

3. Después de guardar, ve a **Deployments**, selecciona el último, y
   click **Redeploy** (Vercel usa env nuevas solo a partir del próximo
   build).

### 1.4. Probar

1. Entra a <https://labstreamsas.com/contacto> (o
   <https://labstream.vercel.app/contacto> mientras se configura el
   dominio).
2. Llena el formulario con un email tuyo distinto a `hola@labstream.co`.
3. Deberías recibir **dos correos**:
   - En `hola@labstream.co`: notificación con el mensaje del cliente
     (asunto `Nuevo mensaje de …`)
   - En el email del cliente: auto-respuesta
     (asunto `Recibimos tu mensaje, … — Labstream Studio`)
4. En `/cms/leads` debería aparecer el mensaje en estado **Nuevo**.

> Si los correos no llegan: revisa la **carpeta de Spam** primero
> (común antes de tener DKIM/SPF). En Resend → **Logs** ves cada email
> enviado y cualquier error.

---

## Parte 2 — Dominio web `labstreamsas.com` · ~10 min

### 2.1. Conectar el dominio en Vercel

1. <https://vercel.com/dashboard> → proyecto **labstream** →
   **Settings** → **Domains** → **Add**.
2. Escribe `labstreamsas.com` y dale **Add**.
3. Repite con `www.labstreamsas.com` (Vercel sugiere redirigir uno al
   otro — escoge `labstreamsas.com` como principal).
4. Vercel te muestra los registros DNS necesarios. Generalmente:
   - **A record** apuntando a `76.76.21.21` (raíz `@`)
   - **CNAME** `www` apuntando a `cname.vercel-dns.com`

### 2.2. Configurar el DNS

1. Entra al panel del registrador donde tengas `labstreamsas.com`.
2. Crea los dos registros:
   - Tipo `A` · Host `@` · Valor `76.76.21.21` · TTL 3600
   - Tipo `CNAME` · Host `www` · Valor `cname.vercel-dns.com` · TTL 3600
3. Si tu registrador tiene un "registro A apex" o "ALIAS", úsalo en lugar
   del A puro.
4. Borra cualquier `A` o `CNAME` previo del root o `www` que apunte a
   otro lado.

### 2.3. Esperar y validar

- Vercel verifica el dominio cuando los DNS propagan (5 min – 24 h).
- Cuando aparezca el ✓ verde junto al dominio, **el certificado SSL
  (HTTPS) se emite automático**. No tienes que hacer nada más.
- Visita <https://labstreamsas.com> — debería ser exactamente lo mismo
  que `labstream.vercel.app`.

> **Si no sale el ✓**: vuelve al panel DNS y revisa que los registros
> coincidan exactamente con lo que pidió Vercel. <https://dnschecker.org>
> te dice si tu A record ya propagó por el mundo.

---

## Parte 3 — Confirmar todo · 5 min

Una vez Resend está verificado y el dominio resuelve:

- [ ] `labstreamsas.com` carga con HTTPS y muestra el sitio.
- [ ] `/contacto` envía: notificación llega a `hola@labstream.co` y
      auto-reply llega al cliente.
- [ ] Newsletter (footer) envía confirmación al suscriptor.
- [ ] `/cms/leads` muestra los mensajes recibidos con filtros por
      estado (Nuevo / Contactado / Ganado / Perdido / Spam).

---

## Editar contenido sin redeployar

**Sí, puedes editar todo el contenido del sitio sin volver a hacer
push.** Eso es lo que el CMS resuelve.

- Cambias un servicio, post de blog, foto del equipo, testimonio, etc.
  desde `/cms`.
- El CMS ejecuta `revalidatePath()` de la ruta pública afectada después
  de cada save → la próxima vez que alguien visite esa página, ve el
  contenido nuevo.
- **Solo hace falta un nuevo deploy si tocas código** (componentes,
  estilos, esquema de base de datos, dependencias).

Resumen:
| Cambio | Necesita push? |
|---|---|
| Texto, imagen, post, proyecto, testimonio, FAQ, equipo, etc. | No |
| Color de marca, logo, fuente | No (`/cms/appearance`) |
| Navbar, footer | Sí (es código) |
| Lógica de un componente | Sí |
| Nuevo modelo / migración Prisma | Sí |
