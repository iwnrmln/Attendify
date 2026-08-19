import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  Dimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { getSessionById } from "../../../data/store";
import { useRouter } from "expo-router";

const { width } = Dimensions.get('window');

type ResultStudent = {
  student_id: string;
  name: string;
  status: "Present" | "Absent" | "Unknown";
  face_image?: string | null;
  confidence?: number;
  detectionScore?: number;
  bbox?: number[]; 
};

export default function AttendanceResults() {
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const router = useRouter();
  const [session, setSession] = useState<{
    results: ResultStudent[];
    presentCount: number;
    absentCount: number;
    totalStudents: number;
    unknownStudents: number;
    totalFacesDetected?: number;
    uniqueFacesDetected?: number;
    duplicateFaces?: number;
    duplicateFacesData?: any[];
    className: string;
    date: string;
    time: string;
    moduleName?: string; 
  } | null>(null);

  const [activeTab, setActiveTab] = useState<
    "Present" | "Absent" | "Unknown"
  >("Present");

  useEffect(() => {
    const loadSession = async () => {
      if (!params.sessionId) return;

      try {
        const data = await getSessionById(Number(params.sessionId));
        console.log("📊 Session loaded:", data);

        if (data?.results) {
          const confidences = data.results
            .filter((r: ResultStudent) => r.confidence != null)
            .map((r: ResultStudent) => r.confidence);
          console.log("📊 Confidence values:", confidences);
          console.log("📊 Max confidence:", Math.max(...confidences, 0));
          console.log("📊 Min confidence:", Math.min(...confidences, 0));
        }

        setSession(data);
      } catch (error) {
        console.error("Error loading session:", error);
        Alert.alert("Error", "Failed to load attendance results");
      }
    };

    loadSession();
  }, [params.sessionId]);

  // Helper function to safely format confidence
  const formatConfidence = (confidence?: number): string => {
    if (confidence == null || isNaN(confidence)) return "N/A";

    if (confidence > 1) {
      return `${confidence.toFixed(1)}%`;
    }
    return `${(confidence * 100).toFixed(1)}%`;
  };

  const getConfidenceColor = (confidence?: number): string => {
    if (confidence == null) return "#9CA3AF";

    const percent = confidence > 1 ? confidence : confidence * 100;

    if (percent >= 80) return "#10B981"; 
    if (percent >= 60) return "#F59E0B"; 
    return "#EF4444"; 
  };

  if (!session) {
    return (
      <View style={styles.center}>
        <View style={styles.loadingCard}>
          <View style={styles.loadingSpinner}>
            <Ionicons name="sync-outline" size={32} color="#F96C1B" />
          </View>
          <Text style={styles.loadingText}>Loading results...</Text>
        </View>
      </View>
    );
  }

  const students = session.results || [];
  const filteredStudents = students.filter(
    (s) => s.status === activeTab
  );

  const percentage =
    session.totalStudents > 0
      ? Math.round(
        (session.presentCount / session.totalStudents) * 100
      )
      : 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Present": return "checkmark-circle";
      case "Absent": return "close-circle";
      default: return "help-circle";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Present": return "#10B981";
      case "Absent": return "#EF4444";
      default: return "#F59E0B";
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case "Present": return "#D1FAE5";
      case "Absent": return "#FEE2E2";
      default: return "#FEF3C7";
    }
  };

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
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#F96C1B" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Attendance Results</Text>
            <Text style={styles.headerSubtitle}>Session Summary</Text>
          </View>
        </View>

        {/* Class Info Card */}
        <View style={styles.classCard}>
          <View style={styles.classIconContainer}>
            <Ionicons name="school-outline" size={24} color="#F96C1B" />
          </View>
          <View style={styles.classInfo}>
            <Text style={styles.className}>{session.className}</Text>
            {session.moduleName && (
              <Text style={styles.moduleName}>{session.moduleName}</Text>
            )}
            <View style={styles.dateTimeContainer}>
              <Ionicons name="calendar-outline" size={14} color="#6B7280" />
              <Text style={styles.sessionMeta}>{session.date}</Text>
              <View style={styles.timeDot} />
              <Ionicons name="time-outline" size={14} color="#6B7280" />
              <Text style={styles.sessionMeta}>{session.time}</Text>
            </View>
          </View>
        </View>

        {/* Detection Quality Stats - NEW */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Students</Text>
            <Text style={styles.statValue}>{session.totalStudents}</Text>
            <View style={[styles.statIcon, { backgroundColor: "#F96C1B15" }]}>
              <Ionicons name="people-outline" size={20} color="#F96C1B" />
            </View>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Faces Detected</Text>
            <Text style={styles.statValue}>{session?.totalFacesDetected ?? 0}</Text>
            <View style={[styles.statIcon, { backgroundColor: "#F96C1B15" }]}>
              <Ionicons name="scan-outline" size={20} color="#F96C1B" />
            </View>
          </View>
        </View>

        {/* Detection Accuracy Card - NEW */}
        {session?.totalFacesDetected != null && session.totalFacesDetected > 0 && (
          <View style={styles.accuracyCard}>
            <View style={styles.accuracyHeader}>
              <Ionicons name="analytics-outline" size={16} color="#6B7280" />
              <Text style={styles.accuracyTitle}>Detection Accuracy</Text>
            </View>
            <View style={styles.accuracyGrid}>
              <View style={styles.accuracyItem}>
                <Text style={styles.accuracyLabel}>Unique Faces</Text>
                <Text style={styles.accuracyValue}>
                  {session?.uniqueFacesDetected ?? 0}
                </Text>
              </View>
              <View style={styles.accuracyItem}>
                <Text style={styles.accuracyLabel}>Duplicates</Text>
                <Text style={[styles.accuracyValue,
                (session?.duplicateFaces ?? 0) > 0 && { color: '#F59E0B' }
                ]}>
                  {session?.duplicateFaces ?? 0}
                </Text>
              </View>
              <View style={styles.accuracyItem}>
                <Text style={styles.accuracyLabel}>Match Rate</Text>
                <Text style={styles.accuracyValue}>
                  {session.totalFacesDetected > 0
                    ? `${((session.uniqueFacesDetected ?? 0) / session.totalFacesDetected * 100).toFixed(0)}%`
                    : "0%"
                  }
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Duplicate Info */}
        {(session?.duplicateFaces != null && session.duplicateFaces > 0) && (
          <>
            <View style={styles.duplicateCard}>
              <Ionicons
                name="information-circle"
                size={20}
                color="#F59E0B"
              />

              <View style={styles.duplicateTextContainer}>
                <Text style={styles.duplicateTitle}>
                  {session.duplicateFaces} duplicate face(s) removed
                </Text>

                <Text style={styles.duplicateSubtext}>
                  {session.uniqueFacesDetected} unique faces from {session.totalFacesDetected} total detections
                </Text>
              </View>
            </View>

            {session?.duplicateFacesData &&
              session.duplicateFacesData.length > 0 && (
                <View style={styles.duplicateFacesContainer}>
                  <Text style={styles.duplicateFacesTitle}>
                    Duplicate Face Detections
                  </Text>

                  {session.duplicateFacesData.map((dup, index) => (
                    <View key={index} style={styles.duplicateFaceCard}>
                      {dup.face_image ? (
                        <Image
                          source={{ uri: dup.face_image }}
                          style={styles.duplicateFaceImage}
                        />
                      ) : (
                        <View style={styles.duplicatePlaceholder}>
                          <Ionicons
                            name="person"
                            size={24}
                            color="#9CA3AF"
                          />
                        </View>
                      )}

                      <View style={{ flex: 1 }}>
                        <Text style={styles.duplicateFaceName}>
                          {dup.name}
                        </Text>

                        <Text style={styles.duplicateFaceId}>
                          {dup.student_id}
                        </Text>

                        <Text style={styles.duplicateFaceConfidence}>
                          Confidence: {formatConfidence(dup.confidence)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
          </>
        )}

        {/* Attendance Rate */}
        <View style={styles.attendanceCard}>
          <View style={styles.attendanceHeader}>
            <Text style={styles.attendanceTitle}>Attendance Rate</Text>
            <Text style={styles.attendancePercentage}>{percentage}%</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${percentage}%` }
              ]}
            />
          </View>
        </View>

        {/* Status Cards */}
        <View style={styles.statusCards}>
          <TouchableOpacity
            style={[
              styles.statusCard,
              activeTab === "Present" && styles.activeStatusCard
            ]}
            onPress={() => setActiveTab("Present")}
          >
            <View style={[styles.statusIconContainer, { backgroundColor: "#10B98115" }]}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            </View>
            <Text style={styles.statusCardLabel}>Present</Text>
            <Text style={styles.statusCardValue}>{session.presentCount}</Text>
            {activeTab === "Present" && <View style={styles.activeIndicator} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statusCard,
              activeTab === "Absent" && styles.activeStatusCard
            ]}
            onPress={() => setActiveTab("Absent")}
          >
            <View style={[styles.statusIconContainer, { backgroundColor: "#EF444415" }]}>
              <Ionicons name="close-circle" size={24} color="#EF4444" />
            </View>
            <Text style={styles.statusCardLabel}>Absent</Text>
            <Text style={styles.statusCardValue}>{session.absentCount}</Text>
            {activeTab === "Absent" && <View style={styles.activeIndicator} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statusCard,
              activeTab === "Unknown" && styles.activeStatusCard
            ]}
            onPress={() => setActiveTab("Unknown")}
          >
            <View style={[styles.statusIconContainer, { backgroundColor: "#F59E0B15" }]}>
              <Ionicons name="help-circle" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.statusCardLabel}>Unknown</Text>
            <Text style={styles.statusCardValue}>{session.unknownStudents}</Text>
            {activeTab === "Unknown" && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        </View>

        {/* Student List Header */}
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>
            {activeTab} Students
          </Text>
          <View style={styles.listBadge}>
            <Text style={styles.listBadgeText}>{filteredStudents.length}</Text>
          </View>
        </View>

        {/* Student List */}
        {filteredStudents.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
              <Ionicons
                name={activeTab === "Present" ? "checkmark-circle" : activeTab === "Absent" ? "close-circle" : "help-circle"}
                size={48}
                color="#D1D5DB"
              />
            </View>
            <Text style={styles.emptyStateTitle}>No {activeTab} Students</Text>
            <Text style={styles.emptyStateText}>
              {activeTab === "Present"
                ? "No students were marked present in this session"
                : activeTab === "Absent"
                  ? "All students are present! 🎉"
                  : "No unknown faces were detected"}
            </Text>
          </View>
        ) : (
          filteredStudents.map((student, index) => (
            <View key={`${student.student_id}-${index}`} style={styles.studentCard}>
              <View style={styles.studentAvatar}>
                {student.face_image ? (
                  <Image
                    source={{ uri: student.face_image }}
                    style={[
                      styles.faceImage,
                      { borderColor: getStatusColor(student.status) }
                    ]}
                  />
                ) : (
                  <View style={[
                    styles.avatarPlaceholder,
                    { backgroundColor: getStatusBgColor(student.status) }
                  ]}>
                    <Ionicons
                      name={getStatusIcon(student.status)}
                      size={28}
                      color={getStatusColor(student.status)}
                    />
                  </View>
                )}
              </View>

              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{student.name}</Text>
                <Text style={styles.studentId}>{student.student_id}</Text>

                {/* Improved Confidence Display */}
                {student.confidence != null && (
                  <View style={styles.confidenceContainer}>
                    <Ionicons
                      name="analytics-outline"
                      size={12}
                      color={getConfidenceColor(student.confidence)}
                    />
                    <Text style={[
                      styles.confidenceText,
                      { color: getConfidenceColor(student.confidence) }
                    ]}>
                      {formatConfidence(student.confidence)} match
                    </Text>
                  </View>
                )}

                {/* Detection Score - NEW */}
                {student.detectionScore != null && (
                  <View style={styles.detectionContainer}>
                    <Ionicons name="camera-outline" size={10} color="#6B7280" />
                    <Text style={styles.detectionText}>
                      Detection: {formatConfidence(student.detectionScore)}
                    </Text>
                  </View>
                )}
              </View>

              <View style={[
                styles.statusBadge,
                { backgroundColor: getStatusBgColor(student.status) }
              ]}>
                <Text style={[
                  styles.statusBadgeText,
                  { color: getStatusColor(student.status) }
                ]}>
                  {student.status}
                </Text>
              </View>
            </View>
          ))
        )}

        {/* Bottom Padding */}
        <View style={styles.bottomPadding} />
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
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  loadingCard: {
    alignItems: "center",
    backgroundColor: "white",
    padding: 30,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingSpinner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFF5F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
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

  // Class Card
  classCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  classIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF5F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 6,
  },
  moduleName: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  dateTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sessionMeta: {
    fontSize: 13,
    color: "#6B7280",
  },
  timeDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#D1D5DB",
    marginHorizontal: 4,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 20,
    marginTop: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "white",
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: "relative",
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
    fontWeight: "500",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1F2937",
  },
  statIcon: {
    position: "absolute",
    bottom: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  // Accuracy Card - NEW
  accuracyCard: {
    backgroundColor: "white",
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  accuracyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  accuracyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  accuracyGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  accuracyItem: {
    alignItems: "center",
  },
  accuracyLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 4,
  },
  accuracyValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },

  // Duplicate Card
  duplicateCard: {
    flexDirection: "row",
    backgroundColor: "#FEF3C7",
    marginHorizontal: 20,
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    gap: 10,
  },
  duplicateTextContainer: {
    flex: 1,
  },
  duplicateTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#92400E",
  },
  duplicateSubtext: {
    fontSize: 11,
    color: "#92400E",
    marginTop: 2,
    opacity: 0.8,
  },

  // Attendance Card
  attendanceCard: {
    backgroundColor: "white",
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  attendanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 12,
  },
  attendanceTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  attendancePercentage: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#10B981",
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 4,
  },

  // Status Cards
  statusCards: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 20,
    marginTop: 20,
  },
  statusCard: {
    flex: 1,
    backgroundColor: "white",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: "relative",
  },
  activeStatusCard: {
    borderWidth: 2,
    borderColor: "#F96C1B",
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statusIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statusCardLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  statusCardValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
  },
  activeIndicator: {
    position: "absolute",
    bottom: -1,
    width: 40,
    height: 3,
    backgroundColor: "#F96C1B",
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },

  // List Header
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  listBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  listBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },

  // Student Card
  studentCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 14,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  studentAvatar: {
    marginRight: 14,
  },
  faceImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    backgroundColor: "#F3F4F6",
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  studentId: {
    fontSize: 12,
    color: "#6B7280",
  },
  confidenceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: "500",
  },
  detectionContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  detectionText: {
    fontSize: 10,
    color: "#9CA3AF",
    fontWeight: "400",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    marginHorizontal: 20,
    padding: 40,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },

  bottomPadding: {
    height: 20,
  },
  duplicateFacesContainer: {
    marginHorizontal: 20,
    marginTop: 14,
  },

  duplicateFacesTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },

  duplicateFaceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  duplicateFaceImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
    borderWidth: 2,
    borderColor: "#F59E0B",
  },

  duplicatePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  duplicateFaceName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
  },

  duplicateFaceId: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },

  duplicateFaceConfidence: {
    fontSize: 12,
    color: "#F59E0B",
    marginTop: 4,
    fontWeight: "600",
  },
});