# Neos - Running Club App

## Resumen
App mobile para club de running (~100 usuarios). Permite gestionar entrenamientos, asistencias, planes personales y comunicación del grupo.

## Stack Técnico
- **Frontend:** Expo (React Native) con Expo Router (file-based routing)
- **Backend:** Supabase (Auth + Postgres + Storage)
- **State:** React Query (@tanstack/react-query)
- **UI:** Componentes custom con StyleSheet, FontAwesome icons
- **Idioma:** Español (Argentina) - usar "vos" en lugar de "tú"

## Estructura del Proyecto
```
app/
├── (auth)/           # Pantallas de login/registro
├── (tabs)/           # Tab navigator principal
│   ├── index.tsx     # Home - Encuestas de asistencia
│   ├── calendar.tsx  # Calendario semanal
│   ├── plan.tsx      # Plan personal (semanal + fin de semana)
│   ├── stats.tsx     # Estadísticas y historial de actividades
│   └── profile.tsx   # Perfil del usuario
├── edit-profile.tsx  # Editar perfil
├── notifications.tsx # Configuración de notificaciones
└── zones.tsx         # Zonas de entrenamiento (VAM)

components/
├── useColorScheme.ts # Siempre retorna "dark" (dark mode forzado)
└── Themed.tsx        # Componentes Text/View con tema

hooks/
├── useTrainings.ts   # Entrenamientos y encuestas
├── useProfile.ts     # Actualizar perfil y avatar
└── useActivities.ts  # Actividades y estadísticas

providers/
├── AuthProvider.tsx  # Contexto de autenticación
└── QueryProvider.tsx # React Query provider

lib/
└── supabase.ts       # Cliente Supabase

constants/
└── Colors.ts         # Paleta de colores (light/dark)
```

## Colores (Dark Mode)
- Background: `#1a1a1a`
- Card: `#2a2a2a`
- Tint (accent): `#a855f7` (purple)
- Text: `#fff`
- Text Secondary: `#9ca3af`
- Error: `#ef4444`

## Base de Datos (Supabase)

### Tablas principales
- `profiles` - Usuarios (id, full_name, avatar_url, role, vam, etc.)
- `trainings` - Entrenamientos recurrentes (running, strength, track)
- `training_sessions` - Sesiones específicas por fecha
- `attendances` - Asistencias/respuestas a encuestas
- `personal_plans` - Planes semanales (running, weekend, strength)
- `events` - Eventos especiales (carreras, trekkings)
- `push_tokens` - Tokens de notificaciones

### Convenciones de datos
- `week_start` en `personal_plans`: Siempre el **lunes** de la semana (formato `yyyy-MM-dd`)
- `vam` en `profiles`: Guardado en **segundos** (ej: 270 = 4:30 min/km)
- Fechas: Usar `date-fns` con locale `es`

## Patrones de Código

### Hooks de datos (React Query)
```typescript
function useSomething() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["something", param],
    queryFn: async () => {
      const { data, error } = await supabase.from("table").select("*");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}
```

### Pantallas con color scheme
```typescript
export default function Screen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  // ... usar colors.background, colors.text, etc.
}
```

### Upload de imágenes
Usar `expo-file-system` + `base64-arraybuffer` para subir a Supabase Storage:
```typescript
const base64 = await FileSystem.readAsStringAsync(uri, {
  encoding: FileSystem.EncodingType.Base64,
});
await supabase.storage.from("bucket").upload(fileName, decode(base64), {
  contentType: "image/jpeg",
});
```

## Funcionalidades Implementadas
- [x] Auth (login con email)
- [x] Perfil (editar nombre, teléfono, avatar)
- [x] Home con encuestas de asistencia (horarios AM/PM)
- [x] Calendario semanal con navegación
- [x] Plan semanal de running
- [x] Plan de fin de semana con registro de resultados (km, tiempo, RPE)
- [x] Configuración de notificaciones
- [x] Zonas de entrenamiento basadas en VAM
- [x] Dark mode forzado
- [x] Estadísticas personales (km totales, tiempo, racha, ritmo promedio)
- [x] Historial de actividades por mes
- [x] Agregar actividades manuales

## Funcionalidades Pendientes
- [ ] Eventos especiales (lista + inscripción)
- [ ] Feed de comunidad (posts con fotos)
- [ ] Anuncios del coach
- [ ] Integración Garmin Connect
- [ ] Integración Apple HealthKit
- [ ] Panel de coach (ver miembros, crear planes)

## Development Build
La app usa `expo-dev-client` para funcionalidades nativas (notificaciones).
```bash
# Crear build de desarrollo
eas build --profile development --platform ios

# Correr en desarrollo
npx expo start --dev-client
```

## Notas Importantes
1. **No usar Expo Go** para probar notificaciones - requiere development build
2. **Avatar upload**: No usar `fetch()` + blob, usar base64 con expo-file-system
3. **Plan de fin de semana**: Busca por `week_start` = lunes de la semana
4. **VAM**: Se guarda en segundos, se muestra como min:seg (ej: 4:30)
5. **startOfWeek**: Siempre usar `{ weekStartsOn: 1 }` para que empiece en lunes
