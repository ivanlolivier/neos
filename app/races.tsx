import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Linking,
} from "react-native";
import { Stack } from "expo-router";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import FontAwesome from "@expo/vector-icons/FontAwesome";

import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import {
  useRaces,
  formatRaceDistances,
  formatRaceLocation,
  type Race,
} from "@/hooks/useRaces";

function RaceCard({
  race,
  colors,
}: {
  race: Race;
  colors: typeof Colors.dark;
}) {
  const date = new Date(race.rac_Date);

  const handlePress = () => {
    if (race.rac_SourceLink) {
      Linking.openURL(race.rac_SourceLink);
    }
  };

  const getSportIcon = (sportName: string): string => {
    switch (sportName.toLowerCase()) {
      case "trail running":
        return "tree";
      case "triatlón":
        return "trophy";
      default:
        return "road";
    }
  };

  return (
    <TouchableOpacity
      style={[styles.raceCard, { backgroundColor: colors.card }]}
      onPress={handlePress}
      activeOpacity={race.rac_SourceLink ? 0.7 : 1}
    >
      <View style={styles.raceHeader}>
        <View style={styles.raceDateContainer}>
          <Text style={[styles.raceDay, { color: colors.tint }]}>
            {format(date, "d")}
          </Text>
          <Text style={[styles.raceMonth, { color: colors.textSecondary }]}>
            {format(date, "MMM", { locale: es })}
          </Text>
        </View>

        <View style={styles.raceInfo}>
          <Text style={[styles.raceName, { color: colors.text }]} numberOfLines={2}>
            {race.rac_Name}
          </Text>

          <View style={styles.raceDetails}>
            <View style={styles.raceDetailRow}>
              <FontAwesome
                name="map-marker"
                size={12}
                color={colors.textSecondary}
              />
              <Text
                style={[styles.raceDetailText, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {formatRaceLocation(race)}
              </Text>
            </View>

            <View style={styles.raceDetailRow}>
              <FontAwesome
                name={getSportIcon(race.sport?.spo_Name ?? "")}
                size={12}
                color={colors.textSecondary}
              />
              <Text
                style={[styles.raceDetailText, { color: colors.textSecondary }]}
              >
                {race.sport?.spo_Name ?? "Running"}
              </Text>
            </View>
          </View>

          <View style={styles.distancesContainer}>
            {race.raceDistances?.slice(0, 4).map((rd) => (
              <View
                key={rd.id}
                style={[
                  styles.distanceBadge,
                  { backgroundColor: colors.backgroundSecondary },
                ]}
              >
                <Text style={[styles.distanceText, { color: colors.text }]}>
                  {rd.distance.dis_Name}
                </Text>
              </View>
            ))}
            {race.raceDistances && race.raceDistances.length > 4 && (
              <View
                style={[
                  styles.distanceBadge,
                  { backgroundColor: colors.backgroundSecondary },
                ]}
              >
                <Text style={[styles.distanceText, { color: colors.textSecondary }]}>
                  +{race.raceDistances.length - 4}
                </Text>
              </View>
            )}
          </View>
        </View>

        {race.rac_SourceLink && (
          <FontAwesome
            name="external-link"
            size={14}
            color={colors.textSecondary}
            style={styles.externalIcon}
          />
        )}
      </View>

      {race.rac_Night && (
        <View style={[styles.nightBadge, { backgroundColor: colors.tint }]}>
          <FontAwesome name="moon-o" size={10} color="#fff" />
          <Text style={styles.nightText}>Nocturna</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function RacesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const { data: races, isLoading, refetch, isRefetching } = useRaces(100);

  // Group races by month
  const racesByMonth = races?.reduce(
    (acc, race) => {
      const monthKey = format(new Date(race.rac_Date), "yyyy-MM");
      if (!acc[monthKey]) {
        acc[monthKey] = [];
      }
      acc[monthKey].push(race);
      return acc;
    },
    {} as Record<string, Race[]>
  );

  const sortedMonths = racesByMonth ? Object.keys(racesByMonth).sort() : [];

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Próximas Carreras",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerBackTitle: "Inicio",
        }}
      />

      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.tint}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Carreras en Uruguay
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {races?.length ?? 0} carreras próximas
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
          </View>
        ) : races && races.length > 0 ? (
          sortedMonths.map((monthKey) => (
            <View key={monthKey} style={styles.monthSection}>
              <Text style={[styles.monthTitle, { color: colors.textSecondary }]}>
                {format(new Date(monthKey + "-01"), "MMMM yyyy", { locale: es })}
              </Text>
              <View style={styles.racesList}>
                {racesByMonth![monthKey].map((race) => (
                  <RaceCard key={race.id} race={race} colors={colors} />
                ))}
              </View>
            </View>
          ))
        ) : (
          <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
            <FontAwesome
              name="calendar-times-o"
              size={40}
              color={colors.textSecondary}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Sin carreras
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No se encontraron carreras próximas en Uruguay.
            </Text>
          </View>
        )}

        {/* Attribution */}
        <Text style={[styles.attribution, { color: colors.textSecondary }]}>
          Datos de dondecorrer.com
        </Text>
      </ScrollView>
    </>
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
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  loadingContainer: {
    padding: 60,
    alignItems: "center",
  },
  monthSection: {
    marginBottom: 24,
  },
  monthTitle: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "capitalize",
    marginBottom: 12,
    marginLeft: 4,
  },
  racesList: {
    gap: 12,
  },
  raceCard: {
    borderRadius: 12,
    padding: 12,
  },
  raceHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  raceDateContainer: {
    alignItems: "center",
    marginRight: 12,
    minWidth: 44,
  },
  raceDay: {
    fontSize: 24,
    fontWeight: "bold",
  },
  raceMonth: {
    fontSize: 12,
    textTransform: "uppercase",
  },
  raceInfo: {
    flex: 1,
  },
  raceName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  raceDetails: {
    gap: 4,
    marginBottom: 8,
  },
  raceDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  raceDetailText: {
    fontSize: 13,
    flex: 1,
  },
  distancesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  distanceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: "500",
  },
  externalIcon: {
    marginLeft: 8,
    marginTop: 4,
  },
  nightBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
    marginLeft: 56,
  },
  nightText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "500",
  },
  emptyState: {
    padding: 32,
    borderRadius: 16,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
  },
  attribution: {
    textAlign: "center",
    fontSize: 11,
    marginTop: 24,
  },
});
