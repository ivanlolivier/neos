import * as Haptics from "expo-haptics";

const safe = (fn: () => Promise<void>) => () => {
  fn().catch(() => {});
};

export const hapticSelection = safe(() => Haptics.selectionAsync());
export const hapticSuccess = safe(() =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
);
export const hapticWarning = safe(() =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
);
export const hapticLight = safe(() =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
);
