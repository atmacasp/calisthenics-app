import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet, ActivityIndicator } from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../src/store/authStore";
import { profileService } from "../../src/services/profile.service";
import { progressService } from "../../src/services/progress.service";
import { bodyWeightService } from "../../src/services/bodyweight.service";
import { programsService } from "../../src/services/programs.service";
import { COLORS } from "../../src/constants/theme";
import type { ProgramAdherence } from "../../src/types/programs";

const WARN = "#dc2626";

const SEGMENTS = [
  { key: "genel", label: "Genel", icon: "apps-outline" },
  { key: "hacim", label: "Hacim", icon: "bar-chart-outline" },
  { key: "kategoriler", label: "Kategoriler", icon: "layers-outline" },
  { key: "vucut", label: "Vücut", icon: "body-outline" },
] as const;

function heatColor(count: number) {
  if (count === 0) return { backgroundColor: COLORS.line };
  if (count <= 2) return { backgroundColor: "rgba(34,197,94,0.35)" };
  if (count <= 5) return { backgroundColor: "rgba(34,197,94,0.65)" };
  return { backgroundColor: COLORS.accent };
}

function barHeight(value: number, max: number) {
  if (max <= 0) return 6;
  return Math.max(6, Math.round((value / max) * 100));
}

export default function ProgressScreen() {
  const session = useAuthStore((s) => s.session);
  const [segment, setSegment] = useState<(typeof SEGMENTS)[number]["key"]>("genel");
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ totalWorkouts: 0, totalSets: 0, mostTrainedCategory: "-" });
  const [heatmap, setHeatmap] = useState<any[]>([]);
  const [weeklyVolume, setWeeklyVolume] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [prs, setPrs] = useState<any[]>([]);
  const [weightLogs, setWeightLogs] = useState<any[]>([]);
  const [adherence, setAdherence] = useState<ProgramAdherence | null>(null);
  const [newWeight, setNewWeight] = useState("");
  const [savingWeight, setSavingWeight] = useState(false);

  const loadData = useCallback(async () => {
    if (!session) return;
    try {
      const [profileData, statsData, heatmapData, volumeData, categoryData, prData, logs, adherenceData] = await Promise.all([
        profileService.getProfile(session.user.id),
        progressService.getOverallStats(session.user.id),
        progressService.getActivityHeatmap(session.user.id),
        progressService.getWeeklyVolume(session.user.id),
        progressService.getCategoryBreakdown(session.user.id),
        progressService.getPersonalRecords(session.user.id),
        bodyWeightService.getLogs(session.user.id),
        programsService.getProgramAdherence(session.user.id),
      ]);
      setProfile(profileData);
      setStats(statsData);
      setHeatmap(heatmapData);
      setWeeklyVolume(volumeData);
      setCategories(categoryData);
      setPrs(prData);
      setWeightLogs(logs ?? []);
      setAdherence(adherenceData);
    } catch (error: any) {
      Alert.alert("Hata", error.message ?? "Veriler yüklenemedi");
    } finally {
      setLoading(false);
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

  const handleAddWeight = async () => {
    if (!session || !newWeight) return;
    setSavingWeight(true);
    try {
      await bodyWeightService.addLog(session.user.id, Number(newWeight));
      setNewWeight("");
      loadData();
    } catch (error: any) {
      Alert.alert("Hata", error.message ?? "Kaydedilemedi");
    } finally {
      setSavingWeight(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.accent} />
      </View>
    );
  }

  const maxWeekly = Math.max(...weeklyVolume.map((w) => w.totalSets), 1);
  const avgWeekly = weeklyVolume.length ? Math.round(weeklyVolume.reduce((s, w) => s + w.totalSets, 0) / weeklyVolume.length) : 0;
  const bestWeek = weeklyVolume.reduce((best, w) => (w.totalSets > (best?.totalSets ?? -1) ? w : best), null as any);
  const lastTwo = weeklyVolume.slice(-2);
  const weeklyTrend = lastTwo.length === 2 ? lastTwo[1].totalSets - lastTwo[0].totalSets : 0;

  const weights = weightLogs.map((l) => Number(l.weight_kg));
  const firstWeight = weights[0];
  const lastWeight = weights[weights.length - 1];
  const minWeight = weights.length ? Math.min(...weights) : 0;
  const maxWeight = weights.length ? Math.max(...weights) : 0;
  const weightDelta = weights.length > 1 ? Math.round((lastWeight - firstWeight) * 10) / 10 : 0;
  const recentLogs = weightLogs.slice(-8);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      <Text style={styles.header}>İlerleme</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16, marginBottom: 20 }}>
        {SEGMENTS.map((s) => (
          <TouchableOpacity
            key={s.key}
            style={[styles.segmentPill, segment === s.key && styles.segmentPillActive]}
            onPress={() => setSegment(s.key)}
          >
            <Ionicons name={s.icon as any} size={14} color={segment === s.key ? COLORS.white : COLORS.graphite} />
            <Text style={[styles.segmentLabel, segment === s.key && styles.segmentLabelActive]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {segment === "genel" && (
        <>
          {adherence && (
            <View style={styles.adherenceCard}>
              <View style={styles.adherenceHeaderRow}>
                <Ionicons name="calendar-outline" size={14} color={COLORS.accent} />
                <Text style={styles.adherenceProgramName}>{adherence.programName}</Text>
              </View>
              <View style={styles.adherenceRow}>
                <View style={styles.adherenceCol}>
                  <Text style={styles.adherenceNumber}>
                    {adherence.completedThisWeek}/{adherence.trainingDaysPerWeek}
                  </Text>
                  <Text style={styles.adherenceLabel}>bu hafta</Text>
                </View>
                <View style={styles.adherenceDivider} />
                <View style={styles.adherenceCol}>
                  <Text style={styles.adherenceNumber}>%{adherence.adherencePercent}</Text>
                  <Text style={styles.adherenceLabel}>genel uyum</Text>
                </View>
              </View>
              <View style={styles.adherenceBarTrack}>
                <View style={[styles.adherenceBarFill, { width: `${Math.min(100, adherence.adherencePercent)}%` }]} />
              </View>
            </View>
          )}

          <View style={styles.streakRow}>
            <View style={styles.streakBox}>
              <Text style={styles.streakBoxNumber}>{profile?.current_streak ?? 0}</Text>
              <Text style={styles.streakBoxLabel}>güncel seri</Text>
            </View>
            <View style={styles.streakBox}>
              <Text style={styles.streakBoxNumber}>{profile?.longest_streak ?? 0}</Text>
              <Text style={styles.streakBoxLabel}>en uzun seri</Text>
            </View>
          </View>

          <View style={styles.statsCard}>
            <View style={styles.statCol}>
              <Text style={styles.statNumber}>{stats.totalWorkouts}</Text>
              <Text style={styles.statLabel}>antrenman</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statNumber}>{stats.totalSets}</Text>
              <Text style={styles.statLabel}>set</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statNumberWord} numberOfLines={1}>{stats.mostTrainedCategory}</Text>
              <Text style={styles.statLabel}>en çok çalışılan</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Son 7 Hafta</Text>
          <View style={styles.heatmapPanel}>
            <View style={styles.heatmapGrid}>
              {heatmap.map((d) => (
                <View key={d.date} style={[styles.heatmapCell, heatColor(d.count)]} />
              ))}
            </View>
            <View style={styles.heatmapLegendRow}>
              <Text style={styles.heatmapLegendText}>Az</Text>
              <View style={[styles.heatmapCell, heatColor(0)]} />
              <View style={[styles.heatmapCell, heatColor(1)]} />
              <View style={[styles.heatmapCell, heatColor(3)]} />
              <View style={[styles.heatmapCell, heatColor(6)]} />
              <Text style={styles.heatmapLegendText}>Çok</Text>
            </View>
          </View>
        </>
      )}

      {segment === "hacim" && (
        <>
          <View style={styles.volumeSummaryRow}>
            <View style={styles.volumeSummaryBox}>
              <Text style={styles.volumeSummaryNumber}>{avgWeekly}</Text>
              <Text style={styles.volumeSummaryLabel}>ort. set/hafta</Text>
            </View>
            <View style={styles.volumeSummaryBox}>
              <Text style={styles.volumeSummaryNumber}>{bestWeek?.totalSets ?? 0}</Text>
              <Text style={styles.volumeSummaryLabel}>en yüksek hafta</Text>
            </View>
            <View style={styles.volumeSummaryBox}>
              <Text style={[styles.volumeSummaryNumber, weeklyTrend < 0 && { color: WARN }]}>
                {weeklyTrend > 0 ? `+${weeklyTrend}` : weeklyTrend}
              </Text>
              <Text style={styles.volumeSummaryLabel}>haftalık trend</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Son 8 Hafta — Set Hacmi</Text>
          <View style={styles.barChartPanel}>
            {weeklyVolume.map((w) => (
              <View key={w.weekLabel} style={styles.barCol}>
                <Text style={styles.barValue}>{w.totalSets}</Text>
                <View style={[styles.bar, { height: barHeight(w.totalSets, maxWeekly) }, w.isCurrent && styles.barCurrent]} />
                <Text style={styles.barLabel}>{w.weekLabel}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {segment === "kategoriler" && (
        <>
          <Text style={styles.sectionTitle}>Kategori Dağılımı</Text>
          {categories.map((c) => (
            <View key={c.id} style={styles.categoryRow}>
              <View style={styles.categoryHeaderRow}>
                <Text style={styles.categoryName}>{c.name}</Text>
                <Text style={styles.categorySets}>{c.totalSets} set</Text>
              </View>
              <View style={styles.categoryBarTrack}>
                <View style={[styles.categoryBarFill, { width: `${c.percentage}%` }]} />
              </View>
              <Text style={styles.categoryStepText}>
                {c.stepsReached}/{c.totalSteps} basamağa dokunuldu
              </Text>
            </View>
          ))}

          <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Hareket Bazlı Rekorlar</Text>
          {prs.length === 0 ? (
            <Text style={styles.emptyText}>Henüz set kaydın yok.</Text>
          ) : (
            prs.map((pr) => (
              <View key={pr.movementId} style={styles.prCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.prName}>{pr.name}</Text>
                  <Text style={styles.prCategory}>{pr.category}</Text>
                </View>
                <View style={styles.prBadgeCol}>
                  {pr.maxReps > 0 && <Text style={styles.prBadge}>{pr.maxReps} tekrar</Text>}
                  {pr.maxDuration > 0 && <Text style={styles.prBadge}>{pr.maxDuration} sn</Text>}
                  {pr.maxWeight > 0 && <Text style={styles.prBadge}>+{pr.maxWeight} kg</Text>}
                </View>
              </View>
            ))
          )}
        </>
      )}

      {segment === "vucut" && (
        <>
          <View style={styles.weightInputRow}>
            <TextInput
              style={styles.weightInput}
              placeholder="Kilo (kg)"
              placeholderTextColor={COLORS.graphite}
              keyboardType="decimal-pad"
              value={newWeight}
              onChangeText={(v) => setNewWeight(v.replace(",", "."))}
            />
            <TouchableOpacity style={styles.addWeightButton} onPress={handleAddWeight} disabled={savingWeight}>
              <Text style={styles.addWeightButtonText}>{savingWeight ? "..." : "Ekle"}</Text>
            </TouchableOpacity>
          </View>

          {weights.length > 0 ? (
            <>
              <View style={styles.weightSummaryRow}>
                <View style={styles.weightSummaryBox}>
                  <Text style={styles.weightSummaryNumber}>{lastWeight}</Text>
                  <Text style={styles.weightSummaryLabel}>güncel (kg)</Text>
                </View>
                <View style={styles.weightSummaryBox}>
                  <Text style={[styles.weightSummaryNumber, weightDelta > 0 ? { color: WARN } : weightDelta < 0 ? { color: COLORS.accent } : null]}>
                    {weightDelta > 0 ? `+${weightDelta}` : weightDelta}
                  </Text>
                  <Text style={styles.weightSummaryLabel}>ilk kayıttan beri</Text>
                </View>
                <View style={styles.weightSummaryBox}>
                  <Text style={styles.weightSummaryNumber}>{minWeight}–{maxWeight}</Text>
                  <Text style={styles.weightSummaryLabel}>min–maks</Text>
                </View>
              </View>

              <View style={styles.barChartPanel}>
                {recentLogs.map((log) => {
                  const w = Number(log.weight_kg);
                  const range = maxWeight - minWeight || 1;
                  const h = Math.max(6, Math.round(((w - minWeight) / range) * 100));
                  return (
                    <View key={log.id} style={styles.barCol}>
                      <Text style={styles.barValue}>{w}</Text>
                      <View style={[styles.bar, { height: h }]} />
                      <Text style={styles.barLabel}>{log.logged_at?.slice(5)}</Text>
                    </View>
                  );
                })}
              </View>
            </>
          ) : (
            <Text style={styles.emptyText}>Henüz kilo kaydı yok.</Text>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.paper },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.paper },
  header: { fontFamily: "Inter_700Bold", fontSize: 24, color: COLORS.ink },
  segmentPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, height: 34, borderRadius: 17, backgroundColor: COLORS.white, marginRight: 8, borderWidth: 1, borderColor: COLORS.line },
  segmentPillActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  segmentLabel: { fontFamily: "Inter_500Medium", fontSize: 12, color: COLORS.graphite },
  segmentLabelActive: { color: COLORS.white, fontFamily: "Inter_700Bold" },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: COLORS.ink, marginBottom: 12, marginTop: 4 },
  adherenceCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.25)",
  },
  adherenceHeaderRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  adherenceProgramName: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: COLORS.accent,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  adherenceRow: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  adherenceCol: { flex: 1, alignItems: "center" },
  adherenceDivider: { width: 1, height: 32, backgroundColor: COLORS.line },
  adherenceNumber: { fontFamily: "BebasNeue_400Regular", fontSize: 26, color: COLORS.ink },
  adherenceLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.graphite, marginTop: 2 },
  adherenceBarTrack: { height: 6, borderRadius: 3, backgroundColor: COLORS.line, overflow: "hidden", marginTop: 14 },
  adherenceBarFill: { height: 6, borderRadius: 3, backgroundColor: COLORS.accent },
  streakRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  streakBox: { flex: 1, backgroundColor: COLORS.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.line },
  streakBoxNumber: { fontFamily: "BebasNeue_400Regular", fontSize: 34, color: COLORS.accent },
  streakBoxLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.graphite, marginTop: 2 },
  statsCard: { flexDirection: "row", backgroundColor: COLORS.white, borderRadius: 16, paddingVertical: 16, marginBottom: 24, borderWidth: 1, borderColor: COLORS.line },
  statCol: { flex: 1, alignItems: "center" },
  statDivider: { width: 1, backgroundColor: COLORS.line },
  statNumber: { fontFamily: "BebasNeue_400Regular", fontSize: 24, color: COLORS.ink },
  statNumberWord: { fontFamily: "Inter_700Bold", fontSize: 13, color: COLORS.ink },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.graphite, marginTop: 4 },
  heatmapPanel: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.line },
  heatmapGrid: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  heatmapCell: { width: 12, height: 12, borderRadius: 3 },
  heatmapLegendRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 14 },
  heatmapLegendText: { fontFamily: "Inter_400Regular", fontSize: 10, color: COLORS.graphite, marginHorizontal: 2 },
  volumeSummaryRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  volumeSummaryBox: { flex: 1, backgroundColor: COLORS.white, borderRadius: 14, padding: 12, alignItems: "center", borderWidth: 1, borderColor: COLORS.line },
  volumeSummaryNumber: { fontFamily: "BebasNeue_400Regular", fontSize: 22, color: COLORS.ink },
  volumeSummaryLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: COLORS.graphite, marginTop: 2, textAlign: "center" },
  barChartPanel: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", backgroundColor: COLORS.white, borderRadius: 16, padding: 16, paddingTop: 24, height: 180, borderWidth: 1, borderColor: COLORS.line },
  barCol: { flex: 1, alignItems: "center", justifyContent: "flex-end", height: "100%" },
  barValue: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: COLORS.graphite, marginBottom: 6 },
  bar: { width: 14, backgroundColor: "rgba(34,197,94,0.35)", borderRadius: 4 },
  barCurrent: { backgroundColor: COLORS.accent },
  barLabel: { fontFamily: "Inter_400Regular", fontSize: 9, color: COLORS.graphite, marginTop: 6 },
  categoryRow: { backgroundColor: COLORS.white, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.line },
  categoryHeaderRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  categoryName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: COLORS.ink },
  categorySets: { fontFamily: "Inter_500Medium", fontSize: 12, color: COLORS.graphite },
  categoryBarTrack: { height: 6, borderRadius: 3, backgroundColor: COLORS.line, overflow: "hidden" },
  categoryBarFill: { height: 6, borderRadius: 3, backgroundColor: COLORS.accent },
  categoryStepText: { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.graphite, marginTop: 8 },
  emptyText: { fontFamily: "Inter_400Regular", color: COLORS.graphite, marginBottom: 12 },
  prCard: { flexDirection: "row", backgroundColor: COLORS.white, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.line },
  prName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: COLORS.ink },
  prCategory: { fontFamily: "Inter_400Regular", fontSize: 11, color: COLORS.graphite, marginTop: 2 },
  prBadgeCol: { alignItems: "flex-end", gap: 4, justifyContent: "center" },
  prBadge: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: COLORS.accent, backgroundColor: "rgba(34,197,94,0.1)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: "hidden" },
  weightInputRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  weightInput: { flex: 1, borderWidth: 1, borderColor: COLORS.line, borderRadius: 10, padding: 12, color: COLORS.ink, backgroundColor: COLORS.white, fontFamily: "Inter_400Regular" },
  addWeightButton: { backgroundColor: COLORS.accent, paddingHorizontal: 20, justifyContent: "center", borderRadius: 10 },
  addWeightButtonText: { color: COLORS.white, fontFamily: "Inter_700Bold" },
  weightSummaryRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  weightSummaryBox: { flex: 1, backgroundColor: COLORS.white, borderRadius: 14, padding: 12, alignItems: "center", borderWidth: 1, borderColor: COLORS.line },
  weightSummaryNumber: { fontFamily: "BebasNeue_400Regular", fontSize: 20, color: COLORS.ink },
  weightSummaryLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: COLORS.graphite, marginTop: 2, textAlign: "center" },
});
