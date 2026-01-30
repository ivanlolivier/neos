# Neos - Running Club App

## Resumen
App mobile para club de running (~100 usuarios). Permite gestionar entrenamientos, asistencias, planes personales y comunicación del grupo.

## Stack Técnico
- **Frontend:** Expo (React Native) con Expo Router (file-based routing)
- **Backend:** Supabase (Auth + Postgres + Storage)
- **State:** React Query (@tanstack/react-query)
- **UI:** Componentes custom con StyleSheet, FontAwesome icons
- **Toasts:** react-native-toast-message (JS puro, no requiere rebuild)
- **Haptics:** expo-haptics (requiere dev build nativo)
- **Idioma:** Español (Argentina) - usar "vos" en lugar de "tú"

## Estructura del Proyecto
```
app/
├── (auth)/           # Pantallas de login/registro
├── (tabs)/           # Tab navigator principal
│   ├── index.tsx     # Home - Encuestas de asistencia + racha
│   ├── calendar.tsx  # Calendario semanal + modal asistentes
│   ├── plan.tsx      # Plan personal (semanal + fin de semana)
│   ├── stats.tsx     # Estadísticas, gráfico km, historial
│   └── profile.tsx   # Perfil del usuario
├── edit-profile.tsx  # Editar perfil
├── notifications.tsx # Configuración de notificaciones
├── races.tsx         # Próximas carreras
└── zones.tsx         # Zonas de entrenamiento (VAM)

components/
├── ActivityModal.tsx  # Modal agregar/editar actividad (con RPE)
├── useColorScheme.ts  # Siempre retorna "dark" (dark mode forzado)
└── Themed.tsx         # Componentes Text/View con tema

hooks/
├── useTrainings.ts    # Entrenamientos, encuestas y asistentes
├── useProfile.ts      # Actualizar perfil y avatar
├── useActivities.ts   # Actividades, estadísticas y gráfico km
├── useAnnouncements.ts # Anuncios del coach
├── usePlan.ts         # Plan semanal y de fin de semana
├── useRaces.ts        # Próximas carreras
└── useWeather.ts      # Clima semanal

providers/
├── AuthProvider.tsx   # Contexto de autenticación
└── QueryProvider.tsx  # React Query provider

lib/
├── supabase.ts        # Cliente Supabase
├── toast.ts           # showSuccess() y showError() wrappers
├── haptics.ts         # Wrappers seguros (no crashean sin native)
└── weather.ts         # Utils de clima

constants/
└── Colors.ts          # Paleta de colores (light/dark)
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
- `activities` - Actividades manuales/importadas
- `push_tokens` - Tokens de notificaciones

### Convenciones de datos
- `week_start` en `personal_plans`: Siempre el **lunes** de la semana (formato `yyyy-MM-dd`)
- `vam` en `profiles`: Guardado en **segundos** (ej: 270 = 4:30 min/km)
- Fechas: Usar `date-fns` con locale `es`. Usar `parseISO()` en vez de `new Date()` para strings de fecha (evita bugs de timezone)

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

### Toasts (en vez de Alert para éxito/error)
```typescript
import { showSuccess, showError } from "@/lib/toast";
// Usar para resultados de acciones (guardar, eliminar, etc.)
showSuccess("Actividad guardada");
showError("No se pudo guardar");
// NO reemplazar Alert.alert que tiene botones (confirmaciones, opciones)
```

### Haptics
```typescript
import { hapticSelection, hapticSuccess, hapticWarning, hapticLight } from "@/lib/haptics";
// Los wrappers atrapan errores si el módulo nativo no está disponible
hapticSelection();  // Votaciones, selección de tabs
hapticLight();      // Abrir modales, botones de acción
hapticSuccess();    // Guardar exitoso
hapticWarning();    // Antes de eliminar
```

### RPE Picker
El selector de RPE (1-10) con pills, barra de color y descripciones está implementado en:
- `app/(tabs)/plan.tsx` (WeekendLogModal)
- `components/ActivityModal.tsx`
Las opciones con colores y descripciones están definidas como constante `RPE_OPTIONS` en cada archivo.

## Funcionalidades Implementadas
- [x] Auth (login con email)
- [x] Perfil (editar nombre, teléfono, avatar)
- [x] Home con encuestas de asistencia (horarios AM/PM) + racha inline
- [x] Calendario semanal con navegación y modal de asistentes
- [x] Plan semanal de running
- [x] Plan de fin de semana con registro de resultados (km, tiempo, RPE)
- [x] Configuración de notificaciones
- [x] Zonas de entrenamiento basadas en VAM
- [x] Dark mode forzado
- [x] Estadísticas personales (km totales, tiempo, racha, ritmo promedio)
- [x] Gráfico de km por semana/mes (View-based, sin dependencia nativa)
- [x] Historial de actividades por mes
- [x] Agregar/editar actividades manuales con RPE
- [x] Toasts nativos para feedback de acciones
- [x] Haptic feedback en touchpoints clave
- [x] Próximas carreras (scraping)

## Funcionalidades Pendientes
- [ ] Eventos especiales (lista + inscripción)
- [ ] Feed de comunidad (posts con fotos)
- [ ] Integración Garmin Connect
- [ ] Integración Apple HealthKit
- [ ] Panel de coach (ver miembros, crear planes)

## Development Build
La app usa `expo-dev-client` para funcionalidades nativas (haptics, notificaciones).
```bash
# Generar proyecto nativo y compilar con Xcode (sin cuenta de dev paga)
npx expo prebuild --platform ios --clean
open ios/neos.xcworkspace
# En Xcode: seleccionar dispositivo > Run

# Correr en desarrollo
npx expo start --dev-client
```

## Notas Importantes
1. **No usar Expo Go** para probar haptics/notificaciones - requiere development build
2. **Avatar upload**: No usar `fetch()` + blob, usar base64 con expo-file-system
3. **Plan de fin de semana**: Busca por `week_start` = lunes de la semana
4. **VAM**: Se guarda en segundos, se muestra como min:seg (ej: 4:30)
5. **startOfWeek**: Siempre usar `{ weekStartsOn: 1 }` para que empiece en lunes
6. **Fechas de strings**: Usar `parseISO()` de date-fns, no `new Date()` (evita offset UTC)
7. **Toasts vs Alert**: Usar `showSuccess`/`showError` para resultados. Mantener `Alert.alert` solo para confirmaciones con botones y validaciones de input
8. **Haptics**: Los wrappers en `lib/haptics.ts` atrapan errores silenciosamente si no hay native module (funciona sin rebuild, solo no vibra)
9. **Gráfico de km**: Implementado con Views puras (no victory-native/Skia) para evitar dependencia nativa
10. **Headers custom**: Pantallas modales (edit-profile, races, zones, notifications) usan header custom con flecha atrás, no el header nativo de Stack
