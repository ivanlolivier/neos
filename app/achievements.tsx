import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { BADGE_CATEGORIES } from "@/constants/badges";
import { useAchievements, type BadgeStatus } from "@/hooks/useAchievements";

function BadgeItem({
  status,
  colors,
}: {
  status: BadgeStatus;
  colors: (typeof Colors)["dark"];
}) {
  const { badge, unlocked, current, target } = status;
  const hasProgress = badge.category === "volumen" || badge.category === "consistencia";
  const progress = target > 0 ? Math.min(current / target, 1) : 0;

  return (
    <View
      style={[
        styles.badgeItem,
        { backgroundColor: colors.card, opacity: unlocked ? 1 : 0.55 },
      ]}
    >
      <Text style={styles.badgeIcon}>{badge.icon}</Text>
      <View style={styles.badgeContent}>
        <View style={styles.badgeHeader}>
          <Text
            style={[
              styles.badgeName,
              { color: unlocked ? colors.text : colors.textSecondary },
            ]}
          >
            {badge.name}
          </Text>
          {unlocked && (
            <FontAwesome name="check-circle" size={16} color={colors.success} />
          )}
        </View>
        <Text style={[styles.badgeDescription, { color: colors.textSecondary }]}>
          {badge.description}
        </Text>
        {hasProgress && !unlocked && (
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressBar,
                { backgroundColor: colors.backgroundSecondary },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.tint,
                    width: `${progress * 100}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              {badge.category === "volumen"
                ? `${current} / ${target} km`
                : `${current} / ${target} días`}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function AchievementsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { badges, unlockedCount, totalCount, isLoading } = useAchievements();

  const overallProgress = totalCount > 0 ? unlockedCount / totalCount : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <FontAwesome name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Logros
        </Text>
        <View style={styles.backButton} />
      </View>

      {isLoading ? (
        <ActivityIndicator
          size="large"
          color={colors.tint}
          style={styles.loader}
        />
      ) : (
        <>
          {/* Summary Card */}
          <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.summaryCount, { color: colors.text }]}>
              {unlockedCount}{" "}
              <Text style={[styles.summaryTotal, { color: colors.textSecondary }]}>
                / {totalCount}
              </Text>
            </Text>
            <Text
              style={[styles.summaryLabel, { color: colors.textSecondary }]}
            >
              logros desbloqueados
            </Text>
            <View
              style={[
                styles.summaryProgressBar,
                { backgroundColor: colors.backgroundSecondary },
              ]}
            >
              <View
                style={[
                  styles.summaryProgressFill,
                  {
                    backgroundColor: colors.tint,
                    width: `${overallProgress * 100}%`,
                  },
                ]}
              />
            </View>
          </View>

          {/* Badge Sections */}
          {BADGE_CATEGORIES.map((category) => {
            const categoryBadges = badges.filter(
              (b) => b.badge.category === category.key
            );
            return (
              <View key={category.key} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <FontAwesome
                    name={category.icon as any}
                    size={16}
                    color={colors.tint}
                  />
                  <Text
                    style={[styles.sectionTitle, { color: colors.textSecondary }]}
                  >
                    {category.label}
                  </Text>
                </View>
                {categoryBadges.map((status) => (
                  <BadgeItem
                    key={status.badge.id}
                    status={status}
                    colors={colors}
                  />
                ))}
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
    width: 36,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  loader: {
    marginTop: 48,
  },
  summaryCard: {
    alignItems: "center",
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
  },
  summaryCount: {
    fontSize: 36,
    fontWeight: "bold",
  },
  summaryTotal: {
    fontSize: 24,
    fontWeight: "normal",
  },
  summaryLabel: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  summaryProgressBar: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  summaryProgressFill: {
    height: "100%",
    borderRadius: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  badgeItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  badgeIcon: {
    fontSize: 28,
  },
  badgeContent: {
    flex: 1,
  },
  badgeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badgeName: {
    fontSize: 15,
    fontWeight: "600",
  },
  badgeDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
  },
});
