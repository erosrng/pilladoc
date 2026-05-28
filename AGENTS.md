# PillaDoc - Medical Management Platform

## Stack
- Angular 19.2 (Standalone Components, Signals)
- Bootstrap 5 (grid, utilities only)
- Angular Material (buttons, icons, spinners, cards, inputs)
- API: PHP CodeIgniter (`/srv/www/htdocs/sincrodoc/`)

## API Base
`http://localhost/sincrodoc/api/`

## Auth Endpoints
- `loginprv` - POST: user, password → proveedor login (sprvuser)
- `login_cliente` - POST: user, password → cliente login (scliuser by email or us_codigo)
- `guardar_proveedor` - POST: multi-part → register doctor (valida RIF, email, teléfono duplicados)
- `guardar_cliente` - POST: nombre, email, telefono, rif, password → register patient (valida email, RIF, teléfono duplicados, auto-login con JWT)

## Public Endpoints
- `listar_publico` - GET/POST: search, especialidad, estado, page, limit → doctor directory
- `perfil_publico` - GET/POST: proveed | slug → doctor profile detail
- `listar_slots_disponibles` - POST: proveed, fecha → slots libres de un doctor en una fecha
- `buscagrupoprv` - GET → all specialties (grpr table)
- `estados` - POST: search → Venezuelan states
- `municipios` - POST: estado_id → municipalities

## Authenticated Endpoints (requieren JWT en header `X-Auth-Token`)
- `pillaDoc/obtener_perfil` - GET → perfil completo del médico logueado (sprv)
- `pillaDoc/guardar_perfil` - POST: nombre, email, telefono, about, website, redes, clinicas, horarios, especialidad → guarda perfil
- `pillaDoc/subir_foto_perfil` - POST FormData: foto → sube foto a sprv.foto
- `pillaDoc/obtener_perfil_cliente` - GET → perfil del cliente logueado (scli + scliuser)
- `pillaDoc/guardar_perfil_cliente` - POST: nombre, email, telefono, rif → actualiza perfil cliente (valida duplicados excluyendo propio)
- `pillaDoc/subir_foto_cliente` - POST FormData: foto → sube foto a scliuser.foto
- `pillaDoc/listar_citas_cliente` - GET → citas del cliente logueado (con data del doctor)
- `pillaDoc/agendar_cita` - POST: proveed, fecha, hora_desde, hora_hasta, clinica_nombre, motivo → crear cita
- `pillaDoc/cancelar_cita` - POST: id → cancelar cita (solo dueño)

## Auth Methods
- `loginprv` authenticates against `sprvuser` table, returns JWT with `tipo_u: 'P'`
- `logincli` authenticates against `scliuser` table, returns JWT with `tipo_u: 'C'`
- Token stored in localStorage as `token`

## Database Tables
- `sprv` - Providers/Doctors (proveed PK, nombre, email, telefono, rif, grupo→grpr, direc2, direc3, foto, about, redes, color_theme, url, clinicas JSON, horarios JSON, servicios JSON, banner)
- `citas` - Appointments (id PK, cliente→scli, proveed→sprv, fecha, hora_desde, hora_hasta, clinica_nombre, motivo, notas, estado enum, creada, modificada)
- `grpr` - Provider groups/specialties (grupo PK, gr_desc)
- `sprvuser` - Provider users (us_codigo PK, proveed→sprv, us_nombre, email, us_clave, activo, us_proveed, google_id, foto)
- `scli` - Clients (cliente PK, nombre, email, telefono, rif, direc2, direc3)
- `scliuser` - Client users (us_codigo PK, cliente→scli, us_nombre, email, us_clave, activo)

> **Nota**: `sprv_profile` fue eliminado. Toda la data del perfil (clinicas, horarios, servicios, banner, foto, about, redes, color_theme, url) vive unificada en `sprv`.

## Routes
- `/` - HomePage (landing, hero, benefits, featured doctors, CTA)
- `/servicios` - ServicesPage (service catalog)
- `/doctores` - DoctorsPage (searchable directory with filters)
- `/doctor/:slug` - DoctorProfilePage (public profile from API + booking for clients)
- `/auth/login` - LoginComponent (medic/patient tabs)
- `/auth/register` - RegisterComponent (full registration with tabs: médicos y pacientes)
- `/auth/onboarding` - OnboardingComponent (post-registration tutorial)
- `/dashboardprv` - DashboardprvPage (provider panel: stats, appointments, profile)
- `/cuenta` - CuentaPage (client panel: perfil + citas, requiere auth tipo C)
- `/authprv` - AuthprvPage (legacy provider login/register)
- `/:slug` - PerfilPage (public doctor profile by slug, redirects to /doctor/:slug)

## Color Theme
- Primary: `#0A6E6E` (medical teal)
- Dark: `#0f172a` (navy)
- Accent: `#119999`
- Success: `#22c55e`
- Light bg: `#f8fafc`
- Card bg: `#ffffff`
- Dark mode: `#020617` bg, `#0b1329` cards

## Component Structure
```
src/
├── app/
│   ├── core/auth/
│   │   └── auth.interceptor.ts
│   ├── features/auth/
│   │   ├── login/
│   │   │   ├── login.component.ts
│   │   │   ├── login.component.html
│   │   │   └── login.component.scss
│   │   ├── register/
│   │   │   ├── register.component.ts
│   │   │   ├── register.component.html
│   │   │   └── register.component.scss
│   │   └── onboarding/
│   │       ├── onboarding.component.ts
│   │       ├── onboarding.component.html
│   │       └── onboarding.component.scss
│   ├── pages/
│   │   ├── home-page/
│   │   ├── services-page/
│   │   ├── doctors-page/
│   │   ├── doctor-profile-page/
│   │   ├── cuenta/
│   │   │   ├── cuenta.ts
│   │   │   ├── cuenta.html
│   │   │   └── cuenta.scss
│   │   ├── dashboardprv/
│   │   │   ├── dashboardprv.ts
│   │   │   ├── dashboardprv.html
│   │   │   ├── dashboardprv.scss
│   │   │   ├── services/
│   │   │   │   ├── doctor-profile.service.ts
│   │   │   │   └── medical-dashboard.ts
│   │   │   └── components/profile/
│   │   ├── authprv-page/
│   │   ├── perfil-page/
│   │   └── dashboardprv-page/ (legacy)
│   ├── components/
│   │   ├── navbar/
│   │   └── footer/
│   ├── auth.service.ts (root - enhanced with signals)
│   ├── app.config.ts
│   ├── app.routes.ts
│   └── app.routes.server.ts
```

## Build Commands
- `npm run build` - Production build
- `ng serve` - Dev server
- `npm run build:ssr` - SSR build
