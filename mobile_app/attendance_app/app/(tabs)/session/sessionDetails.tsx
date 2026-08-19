import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import {
  getSessions,
  getClasses,
  Class,
  AttendanceSession,
} from "../../../data/store";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { generateMobileReportHTML } from "../../../templates/reportTemplate.mobile";
import { generateWebReportHTML } from "../../../templates/reportTemplate.web";
import * as FileSystem from "expo-file-system";

export default function SessionDetails() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const [session, setSession] = useState<SessionWithResults | null>(null);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "list" | "photos">("overview");
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const { width: screenWidth } = Dimensions.get("window");
  const isDesktop = screenWidth > 768;

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        const sessions = await getSessions();
        const classes = await getClasses();

        const foundSession = sessions.find(
          (s) => s.id === Number(params.sessionId)
        );

        if (foundSession) {
          setSession({
            ...foundSession,
            results: (foundSession.results || []).map((r: any) => ({
              name: r.name,
              student_id: r.student_id,
              status: r.status,
            })),
          });

          const foundClass = classes.find(
            (c) => c.id === foundSession.classId
          );

          setSelectedClass(foundClass || null);
        }
      };

      loadData();
    }, [params.sessionId])
  );

  type ResultStudent = {
    name: string;
    student_id: string;
    status: "Present" | "Absent";
  };

  type SessionWithResults = AttendanceSession & {
    results: ResultStudent[];
    images?: string[];
    totalFacesDetected?: number;
    uniqueFacesDetected?: number;
    duplicateFaces?: number;
    unknownStudents?: number;
  };

  const stats = useMemo(() => {
    if (!session || !selectedClass) return null;

    const presentCount = session.results.filter(
      (r: ResultStudent) => r.status === "Present"
    ).length;

    const absentCount = selectedClass.students.length - presentCount;
    const totalStudents = selectedClass.students.length;
    const percentage = totalStudents > 0
      ? Math.round((presentCount / totalStudents) * 100)
      : 0;

    return {
      presentCount,
      absentCount,
      totalStudents,
      percentage,
      unknownCount: session.unknownStudents || 0,
      totalFacesDetected: session.totalFacesDetected || 0,
      uniqueFacesDetected: session.uniqueFacesDetected || 0,
      duplicateFaces: session.duplicateFaces || 0,
    };
  }, [session, selectedClass]);

  const getAttendanceColor = (rate: number) => {
    if (rate >= 90) return "#10B981";
    if (rate >= 75) return "#F59E0B";
    return "#EF4444";
  };

  const getAttendanceLabel = (rate: number) => {
    if (rate >= 90) return "Excellent";
    if (rate >= 75) return "Good";
    if (rate >= 50) return "Average";
    return "Needs Attention";
  };

  if (!session || !selectedClass || !stats) {
    return (
      <View style={styles.center}>
        <View style={styles.loadingContainer}>
          <Ionicons name="hourglass-outline" size={48} color="#F96C1B" />
          <Text style={styles.loadingText}>Loading session details...</Text>
        </View>
      </View>
    );
  }

  const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(`
{
  type: 'pie',
  data: {
    labels: ['Present', 'Absent', 'Unknown'],
    datasets: [{
      data: [${stats.presentCount}, ${stats.absentCount}, ${stats.unknownCount}],
      backgroundColor: ['#10B981', '#EF4444', '#F59E0B'],
      borderColor: '#ffffff',
      borderWidth: 3
    }]
  },
  options: {
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: { size: 14 },
          padding: 20
        }
      }
    }
  }
}
`)}`;

  const handleExportPDF = async () => {
    try {
      const html = Platform.OS === "web"
        ? generateWebReportHTML({
          session,
          selectedClass,
          presentCount: stats.presentCount,
          absentCount: stats.absentCount,
          percentage: stats.percentage,
          chartUrl,
        })
        : generateMobileReportHTML({
          session,
          selectedClass,
          presentCount: stats.presentCount,
          absentCount: stats.absentCount,
          percentage: stats.percentage,
          chartUrl,
        });

      if (Platform.OS === "web") {
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.open();
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.onload = () => printWindow.print();
        }
        return;
      }

      await Print.printAsync({ html });

      const file = await Print.printToFileAsync({ html });
      const fileName = `${session.className}_${session.date}_Report.pdf`
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_]/g, "");

      const newPath = (FileSystem as any).documentDirectory + fileName;
      await FileSystem.moveAsync({
        from: file.uri,
        to: newPath,
      });

      await Sharing.shareAsync(newPath);
    } catch (error) {
      console.log("Export error:", error);
      Alert.alert("Error", "Failed to export PDF. Please try again.");
    }
  };

  const allImages = session.images || (session.image ? [session.image] : []);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace("/sessionHistory")}
          >
            <Ionicons name="arrow-back" size={24} color="#F96C1B" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Session Summary</Text>
            <Text style={styles.headerSubtitle}>
              {session.className}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={handleExportPDF}
          >
            <Ionicons name="download-outline" size={22} color="#F96C1B" />
          </TouchableOpacity>
        </View>

        {/* Session Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardGradient}>
            <View style={styles.infoCardContent}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="school" size={32} color="white" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoClassName}>{session.className}</Text>
                <View style={styles.infoDetails}>
                  <View style={styles.infoDetail}>
                    <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.infoDetailText}>{session.date}</Text>
                  </View>
                  <View style={styles.infoDivider} />
                  <View style={styles.infoDetail}>
                    <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.infoDetailText}>{session.time}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Attendance Rate Circle */}
        <View style={styles.rateContainer}>
          <View style={styles.rateCircle}>
            <View style={[
              styles.rateCircleInner,
              { borderColor: getAttendanceColor(stats.percentage) }
            ]}>
              <Text style={[styles.ratePercentage, { color: getAttendanceColor(stats.percentage) }]}>
                {stats.percentage}%
              </Text>
              <Text style={[styles.rateLabel, { color: getAttendanceColor(stats.percentage) }]}>
                {getAttendanceLabel(stats.percentage)}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.statCardGreen]}>
            <View style={styles.statIconWrapper}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            </View>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.presentCount}</Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>

          <View style={[styles.statCard, styles.statCardRed]}>
            <View style={styles.statIconWrapper}>
              <Ionicons name="close-circle" size={24} color="#EF4444" />
            </View>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.absentCount}</Text>
            <Text style={styles.statLabel}>Absent</Text>
          </View>

          {stats.unknownCount > 0 && (
            <View style={[styles.statCard, styles.statCardYellow]}>
              <View style={styles.statIconWrapper}>
                <Ionicons name="help-circle" size={24} color="#F59E0B" />
              </View>
              <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.unknownCount}</Text>
              <Text style={styles.statLabel}>Unknown</Text>
            </View>
          )}
        </View>

        {/* Face Detection Stats */}
        {stats.totalFacesDetected > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Face Detection Summary</Text>
            <View style={styles.faceStatsRow}>
              <View style={styles.faceStatItem}>
                <Ionicons name="people-outline" size={24} color="#F96C1B" />
                <Text style={styles.faceStatValue}>{stats.totalFacesDetected}</Text>
                <Text style={styles.faceStatLabel}>Total Faces</Text>
              </View>

              <View style={styles.faceStatDivider} />

              <View style={styles.faceStatItem}>
                <Ionicons name="person-outline" size={24} color="#10B981" />
                <Text style={styles.faceStatValue}>{stats.uniqueFacesDetected}</Text>
                <Text style={styles.faceStatLabel}>Unique Faces</Text>
              </View>

              {stats.duplicateFaces > 0 && (
                <>
                  <View style={styles.faceStatDivider} />
                  <View style={styles.faceStatItem}>
                    <Ionicons name="copy-outline" size={24} color="#F59E0B" />
                    <Text style={styles.faceStatValue}>{stats.duplicateFaces}</Text>
                    <Text style={styles.faceStatLabel}>Duplicates</Text>
                  </View>
                </>
              )}
            </View>

            {stats.duplicateFaces > 0 && (
              <View style={styles.dedupInfo}>
                <Ionicons name="information-circle" size={16} color="#F59E0B" />
                <Text style={styles.dedupText}>
                  {stats.duplicateFaces} duplicate face(s) detected and removed from count
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Progress Bar */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Attendance Progress</Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${stats.percentage}%`,
                    backgroundColor: getAttendanceColor(stats.percentage)
                  }
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {stats.presentCount} of {stats.totalStudents} students present ({stats.percentage}%)
            </Text>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {["overview", "list", "photos"].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab as any)}
            >
              <Ionicons
                name={
                  tab === "overview" ? "pie-chart-outline" :
                    tab === "list" ? "list-outline" : "images-outline"
                }
                size={18}
                color={activeTab === tab ? "#F96C1B" : "#9CA3AF"}
              />
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Distribution Overview</Text>
            <Image
              source={{ uri: chartUrl }}
              style={styles.chartImage}
              resizeMode="contain"
            />

            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.legendText}>Present ({stats.presentCount})</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                <Text style={styles.legendText}>Absent ({stats.absentCount})</Text>
              </View>
              {stats.unknownCount > 0 && (
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                  <Text style={styles.legendText}>Unknown ({stats.unknownCount})</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {activeTab === "list" && (
          <View style={styles.sectionCard}>
            <View style={styles.listHeader}>
              <Text style={styles.sectionTitle}>Attendance List</Text>
              <Text style={styles.listCount}>
                {selectedClass.students.length} Students
              </Text>
            </View>

            {selectedClass.students.map((student, index) => {
              const result = session.results.find(
                (r: ResultStudent) => r.student_id === student.student_id
              );
              const status = result?.status || "Absent";
              const isPresent = status === "Present";

              return (
                <View key={index} style={styles.studentRow}>
                  <View style={styles.studentInfo}>
                    <View style={[
                      styles.studentAvatar,
                      { backgroundColor: isPresent ? '#ECFDF5' : '#FEF2F2' }
                    ]}>
                      <Text style={[
                        styles.studentAvatarText,
                        { color: isPresent ? '#10B981' : '#EF4444' }
                      ]}>
                        {student.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.studentName}>{student.name}</Text>
                      <Text style={styles.studentId}>{student.student_id}</Text>
                    </View>
                  </View>

                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: isPresent ? '#ECFDF5' : '#FEF2F2' }
                  ]}>
                    <Ionicons
                      name={isPresent ? "checkmark-circle" : "close-circle"}
                      size={16}
                      color={isPresent ? '#10B981' : '#EF4444'}
                    />
                    <Text style={[
                      styles.statusText,
                      { color: isPresent ? '#10B981' : '#EF4444' }
                    ]}>
                      {status}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {activeTab === "photos" && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Classroom Photos</Text>

            {allImages.length > 0 ? (
              <View style={styles.photosGrid}>
                {allImages.map((uri: string, index: number) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.photoItem,
                      selectedImageIndex === index && styles.photoItemSelected
                    ]}
                    onPress={() => setSelectedImageIndex(
                      selectedImageIndex === index ? null : index
                    )}
                  >
                    <Image
                      source={{ uri }}
                      style={styles.photoImage}
                      resizeMode="cover"
                    />
                    <View style={styles.photoOverlay}>
                      <Ionicons name="search-outline" size={20} color="white" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.noPhotosContainer}>
                <Ionicons name="images-outline" size={48} color="#D1D5DB" />
                <Text style={styles.noPhotosText}>No photos available</Text>
                <Text style={styles.noPhotosSubtext}>
                  Photos captured during attendance will appear here
                </Text>
              </View>
            )}

            {selectedImageIndex !== null && allImages[selectedImageIndex] && (
              <View style={styles.expandedImageContainer}>
                <Image
                  source={{ uri: allImages[selectedImageIndex] }}
                  style={styles.expandedImage}
                  resizeMode="contain"
                />
                <TouchableOpacity
                  style={styles.closeImageButton}
                  onPress={() => setSelectedImageIndex(null)}
                >
                  <Ionicons name="close-circle" size={32} color="white" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() =>
              router.push({
                pathname: "/session/editAttendance",
                params: { sessionId: String(session.id) },
              })
            }
          >
            <Ionicons name="create-outline" size={20} color="#F96C1B" />
            <Text style={styles.editButtonText}>Edit Attendance</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exportPdfButton}
            onPress={handleExportPDF}
          >
            <Ionicons name="document-text-outline" size={20} color="white" />
            <Text style={styles.exportPdfButtonText}>Export PDF Report</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Loading State
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  loadingContainer: {
    alignItems: "center",
    gap: 15,
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF5F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
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
  exportButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF5F0",
    alignItems: "center",
    justifyContent: "center",
  },

  // Info Card
  infoCard: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  infoCardGradient: {
    backgroundColor: "#F96C1B",
    padding: 20,
  },
  infoCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  infoIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  infoTextContainer: {
    flex: 1,
  },
  infoClassName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
  },
  infoDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  infoDetailText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
  },
  infoDivider: {
    width: 1,
    height: 12,
    backgroundColor: "rgba(255,255,255,0.4)",
  },

  // Rate Circle
  rateContainer: {
    alignItems: "center",
    marginTop: 10,
  },
  rateCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  rateCircleInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  ratePercentage: {
    fontSize: 28,
    fontWeight: "bold",
  },
  rateLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 25,
  },
  statCard: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statCardGreen: {
    borderTopWidth: 3,
    borderTopColor: "#10B981",
  },
  statCardRed: {
    borderTopWidth: 3,
    borderTopColor: "#EF4444",
  },
  statCardYellow: {
    borderTopWidth: 3,
    borderTopColor: "#F59E0B",
  },
  statIconWrapper: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    marginTop: 4,
  },

  // Face Detection Stats
  faceStatsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 10,
  },
  faceStatItem: {
    alignItems: "center",
    gap: 6,
  },
  faceStatValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1F2937",
  },
  faceStatLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  faceStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#E5E7EB",
  },
  dedupInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  dedupText: {
    flex: 1,
    fontSize: 13,
    color: "#92400E",
    fontWeight: "500",
  },

  // Progress Bar
  sectionCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 15,
  },
  progressContainer: {
    gap: 10,
  },
  progressBar: {
    height: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 6,
    minWidth: 2,
  },
  progressText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
    textAlign: "center",
  },

  // Tabs
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  tabTextActive: {
    color: "#F96C1B",
  },

  // Chart
  chartImage: {
    width: "100%",
    height: 300,
    marginTop: 10,
  },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginTop: 15,
    flexWrap: "wrap",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },

  // Student List
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  listCount: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  studentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  studentInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  studentAvatarText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  studentName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
  },
  studentId: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Photos
  photosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  photoItem: {
    width: "47%",
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },
  photoItemSelected: {
    borderWidth: 3,
    borderColor: "#F96C1B",
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  photoOverlay: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  expandedImageContainer: {
    marginTop: 15,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#1F2937",
  },
  expandedImage: {
    width: "100%",
    height: 300,
  },
  closeImageButton: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  noPhotosContainer: {
    alignItems: "center",
    paddingVertical: 30,
  },
  noPhotosText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#9CA3AF",
    marginTop: 10,
  },
  noPhotosSubtext: {
    fontSize: 13,
    color: "#D1D5DB",
    marginTop: 5,
  },

  // Action Buttons
  actionButtonsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 25,
  },
  editButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#F96C1B",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F96C1B",
  },
  exportPdfButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F96C1B",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#F96C1B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  exportPdfButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
  },
});