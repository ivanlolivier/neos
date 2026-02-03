export type BadgeCategory = "volumen" | "consistencia" | "carreras";

export type BadgeDefinition = {
  id: string;
  category: BadgeCategory;
  name: string;
  description: string;
  icon: string;
  threshold?: number;
  eventKey?: string;
  order: number;
};

export const BADGE_CATEGORIES: {
  key: BadgeCategory;
  label: string;
  icon: string;
}[] = [
  { key: "volumen", label: "Volumen", icon: "road" },
  { key: "consistencia", label: "Consistencia", icon: "fire" },
  { key: "carreras", label: "Carreras", icon: "trophy" },
];

export const BADGES: BadgeDefinition[] = [
  // Volumen
  {
    id: "km_50",
    category: "volumen",
    name: "Primeros 50 km",
    description: "Acumulá 50 km en total",
    icon: "🏃",
    threshold: 50,
    order: 1,
  },
  {
    id: "km_100",
    category: "volumen",
    name: "100 km",
    description: "Acumulá 100 km en total",
    icon: "💪",
    threshold: 100,
    order: 2,
  },
  {
    id: "km_250",
    category: "volumen",
    name: "250 km",
    description: "Acumulá 250 km en total",
    icon: "⚡",
    threshold: 250,
    order: 3,
  },
  {
    id: "km_500",
    category: "volumen",
    name: "500 km",
    description: "Acumulá 500 km en total",
    icon: "🔥",
    threshold: 500,
    order: 4,
  },
  {
    id: "km_1000",
    category: "volumen",
    name: "1000 km",
    description: "Acumulá 1000 km en total",
    icon: "🏆",
    threshold: 1000,
    order: 5,
  },

  // Consistencia
  {
    id: "streak_5",
    category: "consistencia",
    name: "5 días seguidos",
    description: "Racha de 5 días de asistencia",
    icon: "✨",
    threshold: 5,
    order: 6,
  },
  {
    id: "streak_10",
    category: "consistencia",
    name: "10 días seguidos",
    description: "Racha de 10 días de asistencia",
    icon: "🌟",
    threshold: 10,
    order: 7,
  },
  {
    id: "streak_20",
    category: "consistencia",
    name: "20 días seguidos",
    description: "Racha de 20 días de asistencia",
    icon: "💫",
    threshold: 20,
    order: 8,
  },
  {
    id: "streak_50",
    category: "consistencia",
    name: "50 días seguidos",
    description: "Racha de 50 días de asistencia",
    icon: "🌠",
    threshold: 50,
    order: 9,
  },

  // Carreras
  {
    id: "first_pr",
    category: "carreras",
    name: "Primer Record",
    description: "Registrá tu primer record personal",
    icon: "🎯",
    order: 10,
  },
  {
    id: "race_5k",
    category: "carreras",
    name: "5K",
    description: "Registrá un record en 5K",
    icon: "🏅",
    eventKey: "5K",
    order: 11,
  },
  {
    id: "race_10k",
    category: "carreras",
    name: "10K",
    description: "Registrá un record en 10K",
    icon: "🥈",
    eventKey: "10K",
    order: 12,
  },
  {
    id: "race_21k",
    category: "carreras",
    name: "Media Maratón",
    description: "Registrá un record en 21K",
    icon: "🥇",
    eventKey: "21K",
    order: 13,
  },
  {
    id: "race_42k",
    category: "carreras",
    name: "Maratón",
    description: "Registrá un record en 42K",
    icon: "👑",
    eventKey: "42K",
    order: 14,
  },
  {
    id: "race_official",
    category: "carreras",
    name: "Carrera Oficial",
    description: "Registrá un record de carrera oficial",
    icon: "🏁",
    order: 15,
  },
];
