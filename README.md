# Neos - Running Club App

App mobile para el club de running Neos, construida con Expo y Supabase.

## Setup

### 1. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta
2. Crea un nuevo proyecto
3. Ve a **SQL Editor** y ejecuta el contenido de `supabase/schema.sql`
4. Ve a **Settings > API** y copia la URL y la anon key

### 2. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Edita `.env.local` con tus credenciales de Supabase:

```
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

### 3. Instalar dependencias

```bash
npm install
```

### 4. Ejecutar la app

```bash
# iOS Simulator
npx expo start --ios

# Android Emulator
npx expo start --android

# Expo Go (escanear QR)
npx expo start
```

## Crear usuarios

Como el registro es solo por invitación, los usuarios se crean desde Supabase:

1. Ve a **Authentication > Users** en Supabase Dashboard
2. Click en **Add user > Create new user**
3. Ingresa email y contraseña
4. El perfil se crea automáticamente

Para hacer a alguien coach o admin, actualiza el campo `role` en la tabla `profiles`.

## Crear entrenamientos

Desde Supabase SQL Editor:

```sql
INSERT INTO trainings (type, name, day_of_week, time_slots, location) VALUES
('running', 'Running Martes', 2, ARRAY['07:00', '19:00'], 'Parque Centenario'),
('running', 'Running Jueves', 4, ARRAY['07:00', '19:00'], 'Parque Centenario'),
('strength', 'Fuerza Lunes', 1, ARRAY['07:00'], 'Plaza principal');
```

## Estructura del proyecto

```
neos/
├── app/                    # Expo Router (pantallas)
│   ├── (auth)/            # Login
│   ├── (tabs)/            # Tabs principales
│   │   ├── index.tsx      # Home
│   │   ├── calendar.tsx   # Calendario
│   │   ├── plan.tsx       # Mi Plan
│   │   └── profile.tsx    # Perfil
├── components/            # Componentes UI
├── hooks/                 # React Query hooks
├── lib/                   # Supabase client
├── providers/             # Context providers
├── types/                 # TypeScript types
└── supabase/              # SQL schema
```

## Funcionalidades

### MVP (Implementado)
- [x] Login con email/password
- [x] Ver próximos entrenamientos
- [x] Calendario semanal
- [x] Confirmar/cancelar asistencia
- [x] Ver plan personal
- [x] Marcar entrenamientos completados
- [x] Perfil de usuario

### Próximas fases
- [ ] Eventos especiales (pista, trails)
- [ ] Push notifications
- [ ] Integración Garmin Connect
- [ ] Integración Apple HealthKit
- [ ] Comunidad (posts, fotos)
- [ ] Estadísticas y métricas
