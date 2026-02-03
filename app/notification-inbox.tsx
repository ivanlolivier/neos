import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatDistanceToNow, parseISO } from "date-fns";
import { es } from "date-fns/locale";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useUnreadCount,
} from "@/hooks/useNotifications";
import { hapticSelection, hapticLight } from "@/lib/haptics";
import type { Notification } from "@/types/database";

const ICON_CONFIG: Record<
  string,
  { name: React.ComponentProps<typeof FontAwesome>["name"]; color: string }
> = {
  like: { name: "heart", color: "#ef4444" },
  training_reminder: { name: "bell", color: "#00E676" },
  weekend_plan: { name: "calendar", color: "#3b82f6" },
  streak_warning: { name: "fire", color: "#f97316" },
  announcement: { name: "bullhorn", color: "#00E676" },
};

function getTimeAgo(dateStr: string): string {
  return formatDistanceToNow(parseISO(dateStr), {
    addSuffix: true,
    locale: es,
  });
}

function NotificationRow({
  item,
  colors,
  onPress,
}: {
  item: Notification;
  colors: (typeof Colors)["dark"];
  onPress: () => void;
}) {
  const config = ICON_CONFIG[item.type] ?? ICON_CONFIG.announcement;

  return (
    <TouchableOpacity
      style={[
        styles.row,
        {
          backgroundColor: item.is_read
            ? colors.card
            : colors.backgroundSecondary,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconCircle, { backgroundColor: config.color + "20" }]}>
        <FontAwesome name={config.name} size={16} color={config.color} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text
          style={[styles.rowBody, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {item.body}
        </Text>
        <Text style={[styles.rowTime, { color: colors.textSecondary }]}>
          {getTimeAgo(item.created_at)}
        </Text>
      </View>
      {!item.is_read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

export default function NotificationInboxScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const { data: notifications, isLoading } = useNotifications();
  const { data: unreadCount } = useUnreadCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const hasUnread = (unreadCount ?? 0) > 0;

  const handlePress = (notification: Notification) => {
    hapticSelection();

    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }

    // Navigate based on type
    const data = notification.data as Record<string, unknown> | null;
    switch (notification.type) {
      case "weekend_plan":
        router.push("/(tabs)/plan");
        break;
      case "training_reminder":
        router.push("/(tabs)/calendar");
        break;
      default:
        break;
    }
  };

  const handleMarkAll = () => {
    if (!hasUnread) return;
    hapticLight();
    markAllAsRead.mutate();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Notificaciones</Text>
        <TouchableOpacity
          style={styles.markAllButton}
          onPress={handleMarkAll}
          disabled={!hasUnread}
        >
          <Text
            style={[
              styles.markAllText,
              { color: hasUnread ? colors.tint : colors.textSecondary },
            ]}
          >
            Marcar todas
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : !notifications?.length ? (
        <View style={styles.centered}>
          <FontAwesome
            name="bell-slash-o"
            size={48}
            color={colors.textSecondary}
          />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No tenés notificaciones
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationRow
              item={item}
              colors={colors}
              onPress={() => handlePress(item)}
            />
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  markAllButton: {
    padding: 8,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: "500",
  },
  list: {
    paddingBottom: 32,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  rowBody: {
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 4,
  },
  rowTime: {
    fontSize: 12,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#00E676",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 68,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 4,
  },
});
