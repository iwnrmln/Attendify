import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getSessions, AttendanceSession, deleteSession, Class } from "../../data/store";
import { useFocusEffect } from "expo-router";
import { useCallback, useState, useMemo } from "react";
import { useWindowDimensions } from "react-native";

export default function SessionHistory() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [searchDate, setSearchDate] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [selectedFilter, setSelectedFilter] = useState<"all" | "high" | "low">("all");

  useFocusEffect(
    useCallback(() => {
      const loadSessions = async () => {
        const data = await getSessions();
        setSessions(data);
      };
      loadSessions();
    }, [])
  );

  // Deleting Session
  const handleDeleteSession = async (sessionId: number) => {
    if (isDesktop) {
      const confirmed = window.confirm("Delete this session permanently? This action cannot be undone.");
      if (!confirmed) return;

      await deleteSession(sessionId);
      const updated = await getSessions();
      setSessions(updated);
      return;
    }

    Alert.alert(
      "Delete Session",
      "Are you sure you want to delete this session? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteSession(sessionId);
            const updated = await getSessions();
            setSessions(updated);
          },
        },
      ]
    );
  };

  // Process and filter sessions
  const processedSessions = useMemo(() => {
    let filtered = sessions.filter((s) =>
      s.date.toLowerCase().includes(searchDate.toLowerCase())
    );

    // Apply attendance filter
    if (selectedFilter === "high") {
      filtered = filtered.filter(
        (s) => (s.presentCount / s.totalStudents) >= 0.75
      );
    } else if (selectedFilter === "low") {
      filtered = filtered.filter(
        (s) => (s.presentCount / s.totalStudents) < 0.75
      );
    }

    // Sort sessions
    return filtered.sort((a, b) =>
      sortOrder === "newest" ? b.id - a.id : a.id - b.id
    );
  }, [sessions, searchDate, sortOrder, selectedFilter]);

  // Group sessions by date
  const groupedSessions = useMemo(() => {
    const groups: { [key: string]: AttendanceSession[] } = {};
    processedSessions.forEach((session) => {
      if (!groups[session.date]) {
        groups[session.date] = [];
      }
      groups[session.date].push(session);
    });
    return groups;
  }, [processedSessions]);

  const getAttendanceRate = (present: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((present / total) * 100);
  };

  const getAttendanceColor = (rate: number) => {
    if (rate >= 90) return "#10B981";
    if (rate >= 75) return "#F59E0B";
    return "#EF4444";
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#F96C1B" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Attendance History</Text>
          <Text style={styles.headerSubtitle}>
            {processedSessions.length} {processedSessions.length === 1 ? 'session' : 'sessions'} recorded
          </Text>
        </View>

        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
        >
          <Ionicons
            name={sortOrder === "newest" ? "arrow-down" : "arrow-up"}
            size={20}
            color="#F96C1B"
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isDesktop && styles.desktopContent
        ]}
        showsVerticalScrollIndicator={true}
      >
        {/* Search and Filter Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search-outline" size={20} color="#9CA3AF" />
            <TextInput
              placeholder="Search by date (e.g., 15 Jan)"
              value={searchDate}
              onChangeText={setSearchDate}
              style={styles.searchInput}
              placeholderTextColor="#9CA3AF"
            />
            {searchDate.length > 0 && (
              <TouchableOpacity onPress={() => setSearchDate("")}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

        </View>

        {/* Session List */}
        {Object.keys(groupedSessions).length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>No Sessions Found</Text>
            <Text style={styles.emptyText}>
              {sessions.length === 0
                ? "Start by taking attendance for your classes"
                : "No sessions match your search criteria"}
            </Text>
            {sessions.length === 0 && (
              <TouchableOpacity
                style={styles.startButton}
                onPress={() => router.push("/classes/classSelection")}
              >
                <Ionicons name="camera-outline" size={20} color="white" />
                <Text style={styles.startButtonText}>Take Attendance</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          Object.keys(groupedSessions).map((date) => (
            <View key={date} style={styles.dateGroup}>
              <View style={styles.dateDivider}>
                <View style={styles.dateDot} />
                <Text style={styles.dateText}>{date}</Text>
                <View style={styles.dateLine} />
                <Text style={styles.dateCount}>
                  {groupedSessions[date].length} session{groupedSessions[date].length > 1 ? 's' : ''}
                </Text>
              </View>

              <View style={styles.sessionCardsContainer}>
                {groupedSessions[date].map((item) => {
                  const attendanceRate = getAttendanceRate(item.presentCount, item.totalStudents);
                  const attendanceColor = getAttendanceColor(attendanceRate);

                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.sessionCard, isDesktop && styles.sessionCardDesktop]}
                      onPress={() =>
                        router.push(`/session/sessionDetails?sessionId=${item.id}`)
                      }
                      onLongPress={() => !isDesktop && handleDeleteSession(item.id)}
                      activeOpacity={0.7}
                    >
                      {/* Delete Button */}
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeleteSession(item.id);
                        }}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>

                      {/* Card Header */}
                      <View style={styles.cardHeader}>
                        <View style={styles.cardHeaderLeft}>
                          <View style={[styles.classIcon, { backgroundColor: attendanceColor + '20' }]}>
                            <Ionicons name="school-outline" size={18} color={attendanceColor} />
                          </View>
                          <View style={styles.classInfo}>
                            <Text style={styles.className} numberOfLines={1}>
                              {item.className}
                            </Text>
                            <View style={styles.timeContainer}>
                              <Ionicons name="time-outline" size={12} color="#6B7280" />
                              <Text style={styles.timeText}>{item.time}</Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      {/* Progress Bar */}
                      <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                          <View
                            style={[
                              styles.progressFill,
                              {
                                width: `${attendanceRate}%`,
                                backgroundColor: attendanceColor
                              }
                            ]}
                          />
                        </View>
                        <Text style={styles.progressText}>
                          {item.presentCount}/{item.totalStudents} present
                        </Text>
                      </View>

                      {/* Card Footer */}
                      <View style={styles.cardFooter}>
                        <View style={styles.footerStats}>
                          <View style={styles.footerStat}>
                            <Ionicons name="checkmark-circle-outline" size={14} color="#10B981" />
                            <Text style={styles.footerStatText}>
                              {item.presentCount} Present
                            </Text>
                          </View>
                          <View style={styles.footerStat}>
                            <Ionicons name="close-circle-outline" size={14} color="#EF4444" />
                            <Text style={styles.footerStatText}>
                              {item.totalStudents - item.presentCount} Absent
                            </Text>
                          </View>
                        </View>
                        <View style={styles.viewDetails}>
                          <Text style={styles.viewDetailsText}>Details</Text>
                          <Ionicons name="chevron-forward" size={16} color="#F96C1B" />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Platform.OS === 'ios' ? 60 : 40,
    marginBottom: 25,
    paddingHorizontal: 20,
    paddingTop: 25,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  sortButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF5F0",
    alignItems: "center",
    justifyContent: "center",
  },
  statsOverview: {
    flexDirection: "row",
    backgroundColor: "white",
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF5F0",
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  statLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: "100%",
    backgroundColor: "#E5E7EB",
    marginHorizontal: 10,
  },

  scrollContent: {
    paddingBottom: 40,
  },
  desktopContent: {
    maxWidth: 1000,
    width: "100%",
    alignSelf: "center",
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: "#1F2937",
  },
  filterContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  filterChipActive: {
    backgroundColor: "#FFF5F0",
    borderColor: "#F96C1B",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  filterChipTextActive: {
    color: "#F96C1B",
  },
  dateGroup: {
    marginTop: 20,
  },
  dateDivider: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  dateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F96C1B",
    marginRight: 10,
  },
  dateText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
    marginRight: 10,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
    marginRight: 10,
  },
  dateCount: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  sessionCardsContainer: {
    paddingHorizontal: 20,
  },
  sessionCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sessionCardDesktop: {
    width: "48%",
    marginRight: "2%",
  },
  deleteButton: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  classIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: "#6B7280",
  },
  attendanceBadge: {
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  attendanceRate: {
    fontSize: 16,
    fontWeight: "bold",
  },
  attendanceLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 1,
  },

  // Progress Bar
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    minWidth: 2,
  },
  progressText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    textAlign: "right",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  footerStats: {
    flexDirection: "row",
    gap: 12,
  },
  footerStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  footerStatText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  viewDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 13,
    color: "#F96C1B",
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 40,
    marginTop: 80,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F96C1B",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#F96C1B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  startButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
});