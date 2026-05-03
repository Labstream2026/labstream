# Contexto — Webapp de proyectos de Labstream

> Lee este archivo antes de trabajar en cambios de la webapp (`/app/*`).
> Para la web pública / CMS ver `CONTEXT-web.md`.

## Qué cubre esta sección

- **Webapp** (`/app/*`) — para productores, equipo audiovisual y clientes
- Auth compartida con el CMS (mismo login en `/cms/login`)
- Después de login el redirect default es `/app` (NO el CMS)

## Roles del sistema

### Roles a nivel CMS (en `User.role`)
- `SUPER_ADMIN` → en webapp es **Master**
- `EDITOR`, `REVIEWER` → no usados directamente en webapp

### Roles a nivel proyecto (`ProjectMember.projectRole`)
Una persona puede tener distinto rol en cada proyecto. Enum completo:

```
EXEC_PRODUCER, PRODUCER, DIRECTOR, DOP, CAMERA, PHOTOGRAPHER,
EDITOR, COLORIST, SOUND, VFX, AI_ARTIST, ART_DIRECTOR,
PRODUCTION_ASSISTANT, CLIENT_LEAD, CLIENT_VIEWER, OTHER
```

### Rol "primario" inferido (`AppRole` en `src/lib/app-guards.ts`)
- `MASTER` — si es SUPER_ADMIN del CMS
- `PRODUCER` — si es PRODUCER/EXEC_PRODUCER en algún proyecto
- `CLIENT` — si pertenece a una org tipo CLIENT
- `TEAM` — resto

El rol primario decide qué sidebar ve y a qué páginas tiene acceso.

## Modelo de datos — webapp

```
Organization (CLIENT | PRODUCER | INTERNAL)
   └─ OrgMember (user, orgRole: OWNER|MEMBER, title)

Project (clientOrgId, producerOrgId, status, dates, templateId)
   ├─ ProjectMember (user, projectRole)
   ├─ Phase (type: BRIEF|PROPOSAL|PRE|PRODUCTION|POST|DELIVERY|CUSTOM)
   │   └─ Task (title, status, assignees[])
   ├─ Deliverable (kind, title, status, currentVersionId)
   │   ├─ DeliverableVersion (versionNumber, externalUrl|assetId, notes, submittedBy)
   │   ├─ Approval (stage: INTERNAL|CLIENT, decision, decidedBy, comment)
   │   └─ Comment (author, body)
   └─ ActivityLog (type, summary, actor)

ProjectTemplate (name, description, isDefault)
   └─ TemplatePhase (type, name, order)
       └─ TemplateTask (title, defaultRole, order)
```

## Flujo de un entregable (lo más importante de la app)

```
1. Productor crea Deliverable (DRAFT)
2. Productor sube DeliverableVersion (link Drive/Synology o asset)
   → status: INTERNAL_REVIEW
3. Productor pre-aprueba (Approval stage=INTERNAL, decision=APPROVED)
   → status: CLIENT_REVIEW
   → Email a la org cliente
4. Cliente abre, comenta y decide:
   - APPROVED → Approval stage=CLIENT, status: APPROVED → email a productora
   - CHANGES_REQUESTED → status: CHANGES_REQUESTED → email a productora
5. Productor sube nueva versión → ciclo se repite
```

Versiones son **inmutables**: cada cambio crea una nueva v1, v2, v3... el cliente puede revisar el historial.

## Estructura de archivos

```
src/app/app/
  layout.tsx                     → AppShell + auth gate + getPrimaryAppRole()
  page.tsx                       → Dashboard adaptativo (3 versiones según rol)
  projects/
    page.tsx                     → Lista de proyectos con filtros
    new/page.tsx                 → Crear proyecto desde plantilla
    [id]/page.tsx                → Detalle (fases, tareas, equipo, entregables)
  deliverables/[id]/page.tsx     → Pantalla de revisión (la más importante)
  approvals/page.tsx             → Inbox del cliente — pendientes
  tasks/page.tsx                 → "Mis tareas" para equipo
  orgs/page.tsx                  → CRUD orgs (Master)
  templates/page.tsx             → Editor de plantillas (Master)
  team/page.tsx                  → Vista global de personas (Master)

src/components/app/
  AppShell.tsx                   → Sidebar + drawer mobile

src/lib/
  app-guards.ts                  → Helpers: requireMaster, canManageProject,
                                   canApproveAsClient, canApproveInternal,
                                   listVisibleProjectIds, label maps
```

## Permisos (de `app-guards.ts`)

| Acción | Quién |
|---|---|
| Ver proyecto | Miembros del proyecto + miembros de orgs (cliente o productora) + Master |
| Editar proyecto / asignar equipo | PRODUCER/EXEC_PRODUCER del proyecto + Master |
| Pre-aprobar entregable (INTERNAL) | Mismos que arriba |
| Aprobar como cliente | CLIENT_LEAD del proyecto + OWNER de la org cliente |
| Crear org / asignar productora a proyecto | Solo Master |
| CRUD plantillas | Solo Master |

## Caso de uso clave (PepsiCo con dos productoras)

PepsiCo tiene 2 proyectos:
- **PEPSI-2026-AGRO** ← productora interna `Labstream`
- **PEPSI-2026-REFRESH** ← productora externa `Productora Norte`

Diferentes equipos. Los brand managers de PepsiCo (Marta, Ricardo) ven **ambos** proyectos en su panel de cliente porque son OWNER de la org PepsiCo. Pero solo Marta puede aprobar (es CLIENT_LEAD).

Esto demuestra que el modelo `Organization → Project ←→ ProjectMember` funciona para multi-cliente, multi-productora, equipos rotativos.

## Plantillas seeded

1. **Comercial completo (30s)** — 6 fases, ~13 tareas (default)
2. **Cobertura ligera** — 3 fases, ~4 tareas (eventos rápidos)
3. **Sesión de fotografía** — 3 fases
4. **Streaming en vivo** — 3 fases

Editables en `/app/templates`. Al crear un proyecto se clonan en `Phase`/`Task`.

## Pantallas y qué hace cada rol

### Master (jonathanf)
- `/app` → KPIs cross-proyecto + actividad
- `/app/projects` → todos
- `/app/projects/new` → crear (asigna cliente + productora)
- `/app/orgs` → crear/eliminar orgs
- `/app/templates` → editor de plantillas (crear, editar fases/tareas)
- `/app/team` → mapa global de quién está en qué

### Productor
- `/app` → solo SUS proyectos + KPIs
- `/app/projects/[id]` → asignar equipo, mover tareas, crear deliverables, subir versiones, **pre-aprobar**

### Equipo (Director, Editor, etc.)
- `/app` → "Mis tareas" + proyectos donde está
- `/app/projects/[id]` → solo lectura del pipeline, puede comentar

### Cliente (CLIENT_LEAD)
- `/app` → banner naranja "Tienes N por revisar" + sus proyectos
- `/app/approvals` → inbox dedicado de pendientes
- `/app/deliverables/[id]` → pantalla de revisión con botones gigantes "Aprobar" / "Solicitar cambios"

## Email — eventos que disparan envío

(Si no hay `RESEND_API_KEY`, se loguean a consola)

| Evento | A quién |
|---|---|
| Productor pre-aprueba (INTERNAL → CLIENT_REVIEW) | Todos los miembros de la org cliente |
| Cliente aprueba o solicita cambios | Todos los miembros de la org productora |
| Form de contacto público | `CONTACT_EMAIL_TO` o SiteSettings.contactEmail |

## Fases pendientes (roadmap)

Identificadas pero NO implementadas todavía:

1. **Comentarios con timecode** en videos (campo `Comment.timecodeSeconds` ya existe en schema, pero el reproductor no lo usa)
2. **Comparar versiones lado a lado** (v1 vs v2)
3. **Notificaciones in-app** (campana arriba) — actualmente solo email
4. **Métricas reales** (proyectos en mora, presupuesto consumido, etc.)
5. **Subida directa al Synology** (WebDAV) — actualmente sólo URLs externos manuales
6. **Asignaciones automáticas** al aplicar plantilla (la plantilla tiene `defaultRole` por tarea pero no se auto-asigna)
7. **Idiomas** — solo español por ahora

## Flujo para hacer cambios

Idéntico al CMS — ver `CONTEXT-web.md` sección "Flujo para hacer cambios".

Para extender el modelo (ej. nuevo tipo de Approval, nuevo Phase type):

1. Editar `prisma/schema.prisma` (enums o relaciones)
2. `npx prisma migrate dev --name describe_change`
3. Actualizar labels en `src/lib/app-guards.ts` (`PHASE_LABELS`, `STATUS_LABELS`, etc.)
4. Actualizar UI relevante
5. Commit + push → Vercel
6. `npx prisma migrate deploy` contra Neon (manual)

## Credenciales demo (webapp)

```
admin@labstream.local / Labstream2026!     (Master)
lucia@labstream.local / Demo2026!          (Productor — Labstream)
sofia@productoranorte.com / Demo2026!      (Productor — Norte)
carlos@labstream.local / Demo2026!         (Director)
ana@labstream.local / Demo2026!            (Editor)
javier@labstream.local / Demo2026!         (DOP / Photographer)
marta@pepsico.com / Demo2026!              (Cliente lead PepsiCo)
ricardo@pepsico.com / Demo2026!            (Cliente viewer PepsiCo)
elena@bavaria.co / Demo2026!               (Cliente lead Bavaria)
```

## URLs

- Live: https://labstream.vercel.app/app
- Repo: https://github.com/Labstream2026/labstream
- BD: Neon (proyecto labstream)
