import { View, Text, TouchableOpacity, ScrollView, FlatList, Dimensions, StyleSheet, Alert } from "react-native";
import { useEffect, useState, useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuthStore } from "../../src/store/authStore";
import { profileService } from "../../src/services/profile.service";
import { progressService } from "../../src/services/progress.service";
import { COLORS } from "../../src/constants/theme";

const WARN = "#dc2626";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_GAP = 12;
const CARD_WIDTH = SCREEN_WIDTH - 40;

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) return "İyi geceler";
  if (hour < 12) return "Günaydın";
  if (hour < 18) return "İyi günler";
  return "İyi akşamlar";
}

function daysSince(dateStr: string | null) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / 86400000);
}

export default function HomeScreen() {
  const session = useAuthStore((s) => s.session);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ totalWorkouts: 0, totalSets: 0, mostTrainedCategory: "-" });
  const [weekly, setWeekly] = useState({ thisWeekWorkouts: 0, lastWeekWorkouts: 0, thisWeekSets: 0 });
  const [highlight, setHighlight] = useState<any>(null);
  const [weekDays, setWeekDays] = useState<any[]>([]);
  const [activeCard, setActiveCard] = useState(0);

  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!session) return;
    try {
      const [profileData, statsData, week, weeklyData, highlightData] = await Promise.all([
        profileService.getProfile(session.user.id),
        progressService.getOverallStats(session.user.id),
        progressService.getLast7DaysActivity(session.user.id),
        progressService.getWeeklyStats(session.user.id),
        progressService.getTopHighlight(session.user.id),
      ]);
      setProfile(profileData);
      setStats(statsData);
      setWeekDays(week);
      setWeekly(weeklyData);
      setHighlight(highlightData);
      setLoadError(null);
    } catch (error: any) {
      setLoadError(error.message ?? "Veriler yüklenemedi");
    }
  }, [session]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const lastWorkoutDays = daysSince(profile?.last_workout_date ?? null);
  const trainedToday = lastWorkoutDays === 0;
  const subtext =
    lastWorkoutDays === null
      ? "Henüz antrenman kaydın yok"
      : trainedToday
      ? "Bugünkü antrenmanını tamamladın"
      : `Son antrenman ${lastWorkoutDays} gün önce`;

  const weeklyDelta = weekly.thisWeekWorkouts - weekly.lastWeekWorkouts;
  const weeklyDeltaText =
    weeklyDelta > 0 ? `+${weeklyDelta} geçen haftaya göre` : weeklyDelta < 0 ? `${weeklyDelta} geçen haftaya göre` : "geçen haftayla aynı";

  const cards = [
    {
      key: "overview",
      render: () => (
        <View style={styles.statsCard}>
          <View style={styles.statCol}>
            <View style={styles.statIconCircle}>
              <Ionicons name="person-outline" size={16} color={COLORS.accent} />
            </View>
            <Text style={styles.statNumber}>{stats.totalWorkouts}</Text>
            <Text style={styles.statLabel}>antrenman</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <View style={styles.statIconCircle}>
              <MaterialCommunityIcons name="dumbbell" size={16} color={COLORS.accent} />
            </View>
            <Text style={styles.statNumber}>{stats.totalSets}</Text>
            <Text style={styles.statLabel}>set</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <View style={styles.statIconCircle}>
              <Ionicons name="trophy-outline" size={16} color={COLORS.accent} />
            </View>
            <Text style={styles.statNumberWord} numberOfLines={1}>{stats.mostTrainedCategory}</Text>
            <Text style={styles.statLabel}>en çok çalışılan</Text>
          </View>
        </View>
      ),
    },
    {
      key: "week",
      render: () => (
        <View style={styles.weekCard}>
          <Text style={styles.weekCardLabel}>Bu Hafta</Text>
          <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: 6 }}>
            <Text style={styles.weekCardNumber}>{weekly.thisWeekWorkouts}</Text>
            <Text style={styles.weekCardUnit}>antrenman</Text>
          </View>
          <Text style={[styles.weekCardDelta, weeklyDelta < 0 && { color: WARN }]}>{weeklyDeltaText}</Text>
          <View style={styles.weekCardFooter}>
            <MaterialCommunityIcons name="dumbbell" size={14} color={COLORS.graphite} />
            <Text style={styles.weekCardFooterText}>{weekly.thisWeekSets} set kaydedildi</Text>
          </View>
        </View>
      ),
    },
    ...(highlight
      ? [
          {
            key: "highlight",
            render: () => (
              <View style={styles.highlightCard}>
                <View style={styles.highlightIconCircle}>
                  <Ionicons name="trophy" size={20} color={COLORS.white} />
                </View>
                <Text style={styles.highlightLabel}>Zirve Anı</Text>
                <Text style={styles.highlightName} numberOfLines={1}>{highlight.name}</Text>
                <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: 4 }}>
                  <Text style={styles.highlightValue}>{highlight.value}</Text>
                </View>
                <Text style={styles.highlightKind}>{highlight.kind}</Text>
              </View>
            ),
          },
        ]
      : []),
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
      {loadError && (
        <TouchableOpacity onPress={loadData} style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>Veriler yüklenemedi — tekrar denemek için dokun</Text>
        </TouchableOpacity>
      )}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.avatarCircle} onPress={() => router.push("/(tabs)/profile")}>
          <Text style={styles.avatarLetter}>{(profile?.full_name?.[0] ?? "?").toUpperCase()}</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.greetingSmall}>{getGreeting()},</Text>
          <Text style={styles.greetingName} numberOfLines={1}>
            {profile?.full_name ?? ""}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.iconPill}
          onPress={() => Alert.alert("Bildirimler", "Bildirim merkezi yakında burada olacak.")}
        >
          <Ionicons name="notifications-outline" size={18} color={COLORS.ink} />
          <View style={styles.notifDot} />
        </TouchableOpacity>
        <View style={styles.streakPill}>
          <Ionicons name="flame" size={15} color={COLORS.accent} />
          <Text style={styles.streakPillText}>{profile?.current_streak ?? 0}</Text>
        </View>
      </View>

      <View style={styles.heroPanel}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroLabel}>Antrenman Serisi</Text>
          <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: 6 }}>
            <Text style={styles.heroNumber}>{profile?.current_streak ?? 0}</Text>
            <Text style={styles.heroUnit}>gün</Text>
          </View>
          <Text style={[styles.heroStatus, trainedToday && { color: COLORS.accent }]}>{subtext}</Text>

          <View style={styles.weekRow}>
            {weekDays.map((d) => (
              <View key={d.date} style={styles.weekDayCol}>
                <Text style={styles.weekDayLabel}>{d.label}</Text>
                <View style={[styles.weekDot, d.trained && styles.weekDotFilled, d.isToday && styles.weekDotToday]} />
              </View>
            ))}
          </View>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => router.push("/workout/start")}
        activeOpacity={0.85}
        style={styles.ctaButton}
      >
        <View style={styles.ctaIconCircle}>
          <MaterialCommunityIcons name="dumbbell" size={18} color={COLORS.white} />
        </View>
        <Text style={styles.ctaText}>Antrenmana Başla</Text>
        <Ionicons name="chevron-forward" size={20} color={COLORS.white} />
      </TouchableOpacity>

      <FlatList
        data={cards}
        keyExtractor={(item) => item.key}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_GAP}
        decelerationRate="fast"
        style={{ marginTop: 18 }}
        contentContainerStyle={{ paddingHorizontal: 20 }}
        ItemSeparatorComponent={() => <View style={{ width: CARD_GAP }} />}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_GAP));
          setActiveCard(index);
        }}
        renderItem={({ item }) => <View style={{ width: CARD_WIDTH }}>{item.render()}</View>}
      />

      <View style={styles.dotsRow}>
        {cards.map((c, i) => (
          <View key={c.key} style={[styles.pageDot, i === activeCard && styles.pageDotActive]} />
        ))}
      </View>

      <Text style={styles.sectionTitle}>Devam et</Text>

      <TouchableOpacity style={styles.quickCard} onPress={() => router.push("/(tabs)/library")} activeOpacity={0.75}>
        <View style={styles.quickAccentBar} />
        <View style={styles.quickIconBox}>
          <Ionicons name="trending-up-outline" size={20} color={COLORS.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.quickTitle}>Hareket Kütüphanesi</Text>
          <Text style={styles.quickSubtitle}>Progression'larını incele</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.graphite} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.quickCard} onPress={() => router.push("/(tabs)/progress")} activeOpacity={0.75}>
        <View style={styles.quickAccentBar} />
        <View style={styles.quickIconBox}>
          <Ionicons name="stats-chart-outline" size={20} color={COLORS.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.quickTitle}>İlerleme</Text>
          <Text style={styles.quickSubtitle}>Rekorlarını ve grafiklerini gör</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.graphite} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.paper },
  errorBanner: { backgroundColor: "#fee2e2", margin: 20, marginBottom: 0, padding: 12, borderRadius: 10 },
  errorBannerText: { color: WARN, fontFamily: "Inter_500Medium", fontSize: 12, textAlign: "center" },
  headerRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 16, gap: 10 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(34,197,94,0.12)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(34,197,94,0.25)" },
  avatarLetter: { fontFamily: "Inter_700Bold", fontSize: 16, color: COLORS.accent },
  greetingSmall: { fontFamily: "Inter_400Regular", fontSize: 13, color: COLORS.graphite },
  greetingName: { fontFamily: "Inter_700Bold", fontSize: 17, color: COLORS.ink, marginTop: 1 },
  iconPill: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, alignItems: "center", justifyContent: "center" },
  notifDot: { position: "absolute", top: 9, right: 10, width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.accent },
  streakPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, borderRadius: 20, paddingHorizontal: 12, height: 40 },
  streakPillText: { fontFamily: "Inter_700Bold", fontSize: 13, color: COLORS.ink },
  heroPanel: { flexDirection: "row", backgroundColor: COLORS.ink, borderRadius: 24, marginHorizontal: 20, marginTop: 18, padding: 20 },
  heroLabel: { fontFamily: "Inter_500Medium", fontSize: 12, color: "rgba(250,249,246,0.6)" },
  heroNumber: { fontFamily: "BebasNeue_400Regular", fontSize: 56, color: COLORS.accent, lineHeight: 54 },
  heroUnit: { fontFamily: "Inter_500Medium", fontSize: 16, color: COLORS.paper, marginLeft: 8, marginBottom: 8 },
  heroStatus: { fontFamily: "Inter_500Medium", fontSize: 13, color: "rgba(250,249,246,0.6)", marginTop: 8 },
  weekRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 18 },
  weekDayCol: { alignItems: "center", gap: 8 },
  weekDayLabel: { fontFamily: "Inter_500Medium", fontSize: 11, color: "rgba(250,249,246,0.35)" },
  weekDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "rgba(250,249,246,0.15)" },
  weekDotFilled: { backgroundColor: COLORS.accent },
  weekDotToday: { borderWidth: 2, borderColor: "rgba(250,249,246,0.5)" },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.accent,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
    marginHorizontal: 20,
    marginTop: 18,
  },
  ctaIconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  ctaText: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 16, color: COLORS.white },
  statsCard: { flexDirection: "row", backgroundColor: COLORS.white, borderRadius: 20, paddingVertical: 20, minHeight: 150, borderWidth: 1, borderColor: COLORS.line },
  statCol: { flex: 1, alignItems: "center", gap: 6 },
  statDivider: { width: 1, backgroundColor: COLORS.line },
  statIconCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(34,197,94,0.1)", alignItems: "center", justifyContent: "center" },
  statNumber: { fontFamily: "BebasNeue_400Regular", fontSize: 24, color: COLORS.ink },
  statNumberWord: { fontFamily: "Inter_700Bold", fontSize: 14, color: COLORS.ink },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.graphite },
  weekCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 20, minHeight: 150, borderWidth: 1, borderColor: COLORS.line, justifyContent: "center" },
  weekCardLabel: { fontFamily: "Inter_500Medium", fontSize: 12, color: COLORS.graphite },
  weekCardNumber: { fontFamily: "BebasNeue_400Regular", fontSize: 40, color: COLORS.ink, lineHeight: 38 },
  weekCardUnit: { fontFamily: "Inter_500Medium", fontSize: 14, color: COLORS.ink, marginLeft: 8, marginBottom: 4 },
  weekCardDelta: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: COLORS.accent, marginTop: 6 },
  weekCardFooter: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14 },
  weekCardFooterText: { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.graphite },
  highlightCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 20, minHeight: 150, borderWidth: 1, borderColor: "rgba(34,197,94,0.3)", justifyContent: "center" },
  highlightIconCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  highlightLabel: { fontFamily: "Inter_500Medium", fontSize: 12, color: COLORS.graphite },
  highlightName: { fontFamily: "Inter_700Bold", fontSize: 16, color: COLORS.ink, marginTop: 4 },
  highlightValue: { fontFamily: "BebasNeue_400Regular", fontSize: 34, color: COLORS.accent },
  highlightKind: { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.graphite, marginTop: 2 },
  dotsRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 12 },
  pageDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.line },
  pageDotActive: { backgroundColor: COLORS.accent, width: 16 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: COLORS.ink, marginHorizontal: 20, marginTop: 26, marginBottom: 12 },
  quickCard: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.white, borderRadius: 16, marginHorizontal: 20, marginTop: 10, padding: 14, gap: 12, borderWidth: 1, borderColor: COLORS.line, overflow: "hidden" },
  quickAccentBar: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3, backgroundColor: COLORS.accent },
  quickIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(34,197,94,0.1)", alignItems: "center", justifyContent: "center" },
  quickTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: COLORS.ink },
  quickSubtitle: { fontFamily: "Inter_400Regular", fontSize: 12, color: COLORS.graphite, marginTop: 2 },
});
