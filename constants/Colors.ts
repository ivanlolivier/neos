// Neos brand colors
const neosGreen = "#00E676"; // Bright green accent
const neosGreenDark = "#00C853"; // Slightly darker for pressed states
const neosDark = "#1a1a1a"; // Near black background
const neosDarkSecondary = "#2d2d2d"; // Card/secondary background

export default {
  light: {
    text: "#1a1a1a",
    textSecondary: "#666",
    background: "#f5f5f5",
    backgroundSecondary: "#fff",
    tint: neosGreen,
    tintPressed: neosGreenDark,
    tabIconDefault: "#999",
    tabIconSelected: neosGreen,
    border: "#e0e0e0",
    card: "#fff",
    success: "#00E676",
    warning: "#ff9800",
    error: "#f44336",
  },
  dark: {
    text: "#fff",
    textSecondary: "#aaa",
    background: neosDark,
    backgroundSecondary: neosDarkSecondary,
    tint: neosGreen,
    tintPressed: neosGreenDark,
    tabIconDefault: "#666",
    tabIconSelected: neosGreen,
    border: "#404040",
    card: neosDarkSecondary,
    success: "#00E676",
    warning: "#ff9800",
    error: "#f44336",
  },
};
