import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  StatusBar,
  Alert,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { getClasses, getSessions, AttendanceSession } from "../../data/store";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../../context/AuthContext";

export default function Home() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const [classesCount, setClassesCount] = useState(0);
  const [todaySessionsCount, setTodaySessionsCount] = useState(0);
  const [todaySchedule, setTodaySchedule] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [userName, setUserName] = useState("Professor");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const { user, logout } = useAuth();

  useFocusEffect(
    useCallback(() => {
      const loadStats = async () => {
        const classes = await getClasses();
        const sessions = await getSessions();

        setClassesCount(classes.length);

        const todayObj = new Date();

        const todayDate = todayObj.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });

        const todaySessions = sessions.filter(
          (s: AttendanceSession) => s.date === todayDate
        );

        setTodaySessionsCount(todaySessions.length);

        const todayDay = todayObj
          .toLocaleDateString("en-US", { weekday: "long" })
          .toLowerCase();

        const todayClasses = classes.filter((c: any) =>
          c.schedule?.some(
            (s: any) => s.day?.toLowerCase() === todayDay
          )
        );

        setTodaySchedule(todayClasses);

        // Get recent activity (last 5 sessions)
        const recent = sessions
          .sort((a, b) => b.id - a.id)
          .slice(0, 5);
        setRecentActivity(recent);

        // Load user info
        try {
          const userData = await AsyncStorage.getItem("user_data");
          if (userData) {
            const user = JSON.parse(userData);
            const displayName = user.name || user.preferred_username || user.display_name || "Professor";
            setUserName(displayName);

            if (user.picture) {
              setUserAvatar(user.picture);
            }
          }
        } catch (error) {
          console.log("Error loading user data:", error);
          setUserName("Professor");
        }
      };

      loadStats();
    }, [])
  );

  const handleLogout = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/");
          }
        }
      ]
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const todayDay = new Date()
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#F96C1B" />

      {/* Main Content */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <LinearGradient
          colors={["#F96C1B", "#FF8C42"]}
          style={[styles.heroSection, isDesktop && styles.heroSectionDesktop]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color="white" />
          </TouchableOpacity>

          <View style={styles.heroContent}>
            <View style={styles.logoContainer}>
              <Ionicons name="school" size={32} color="#F96C1B" />
            </View>
            <Text style={styles.heroTitle}>Attendify</Text>
            <Text style={styles.heroSubtitle}>
              Automated Facial Attendance System
            </Text>
            <View style={styles.dateContainer}>
              <Ionicons name="calendar" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.dateText}>{currentDate}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Main Content Area */}
        <View style={[styles.mainContent, isDesktop && styles.mainContentDesktop]}>
          {/* Welcome Card */}
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeCardLeft}>
              <Text style={styles.greeting}>Good {getGreeting()},</Text>
              <Text style={styles.professorName}>{userName}</Text>
              <Text style={styles.welcomeMessage}>
                Ready to manage your classes today?
              </Text>
            </View>
            <View style={styles.welcomeIcon}>
              {userAvatar ? (
                <View style={styles.avatarImage}>
                  {/* You'll need to add an Image component here if you have avatars */}
                  <Ionicons name="person-circle" size={50} color="#F96C1B" />
                </View>
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>{getInitials(userName)}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            {/* Manage Class Button */}
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => router.push("/classList")}
            >
              <View style={[styles.quickActionGradient, styles.quickActionLight]}>
                <Ionicons name="people" size={28} color="#F96C1B" />
                <Text style={[styles.quickActionText, styles.quickActionTextDark]}>Manage{'\n'}Classes</Text>
              </View>
            </TouchableOpacity>

            {/* Take Attendance Button */}
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => router.push("/classes/classSelection")}
            >
              <LinearGradient
                colors={["#F96C1B", "#FF6B35"]}
                style={styles.quickActionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="camera" size={28} color="white" />
                <Text style={styles.quickActionText}>Take{'\n'}Attendance</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* View History Button */}
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => router.push("/sessionHistory")}
            >
              <View style={[styles.quickActionGradient, styles.quickActionLight]}>
                <Ionicons name="time" size={28} color="#F96C1B" />
                <Text style={[styles.quickActionText, styles.quickActionTextDark]}>View{'\n'}History</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <LinearGradient
                colors={["#FFF5F0", "#FFF0E6"]}
                style={styles.statCardContent}
              >
                <View style={styles.statIconContainer}>
                  <Ionicons name="today-outline" size={24} color="#F96C1B" />
                </View>
                <Text style={styles.statValue}>{todaySessionsCount}</Text>
                <Text style={styles.statLabel}>Today's Sessions</Text>
              </LinearGradient>
            </View>

            <View style={styles.statCard}>
              <LinearGradient
                colors={["#FFF5F0", "#FFF0E6"]}
                style={styles.statCardContent}
              >
                <View style={styles.statIconContainer}>
                  <Ionicons name="school-outline" size={24} color="#F96C1B" />
                </View>
                <Text style={styles.statValue}>{classesCount}</Text>
                <Text style={styles.statLabel}>Classes Managed</Text>
              </LinearGradient>
            </View>
          </View>

          {/* Today's Schedule */}
          <View style={styles.scheduleSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="calendar-outline" size={22} color="#1A1A1A" />
              <Text style={styles.sectionTitle}>Today's Schedule</Text>
              <Text style={styles.sectionBadge}>{todaySchedule.length} classes</Text>
            </View>

            <View style={styles.scheduleCard}>
              {todaySchedule.length === 0 ? (
                <View style={styles.emptySchedule}>
                  <Ionicons name="calendar-clear-outline" size={48} color="#D1D5DB" />
                  <Text style={styles.emptyScheduleTitle}>No Classes Today</Text>
                  <Text style={styles.emptyScheduleText}>
                    Enjoy your free day!
                  </Text>
                </View>
              ) : (
                todaySchedule.map((c, index) => {
                  const schedules = c.schedule?.filter(
                    (s: any) => s.day?.toLowerCase() === todayDay
                  );

                  return (
                    <View key={index} style={styles.scheduleItem}>
                      <View style={styles.scheduleItemLeft}>
                        <View style={styles.scheduleDot} />
                        <View>
                          <Text style={styles.scheduleItemName}>{c.name}</Text>
                          <Text style={styles.scheduleItemStudents}>
                            {c.totalStudents} students
                          </Text>
                        </View>
                      </View>
                      <View>
                        {schedules?.map((s: any, i: number) => (
                          <View key={i} style={styles.scheduleTimePill}>
                            <Ionicons name="time-outline" size={12} color="#F96C1B" />
                            <Text style={styles.scheduleTimeText}>{s.time}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>

          {/* Recent Activity */}
          {recentActivity.length > 0 && (
            <View style={styles.activitySection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="pulse-outline" size={22} color="#1A1A1A" />
                <Text style={styles.sectionTitle}>Recent Activity</Text>
              </View>

              {recentActivity.slice(0, 3).map((session, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.activityItem}
                >
                  <View style={styles.activityIcon}>
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>
                      Attendance taken for {session.className || "Class"}
                    </Text>
                    <Text style={styles.activityTime}>
                      {session.date} • {session.time}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollView: {
    flex: 1,
  },

  // Logout Button
  logoutButton: {
    position: "absolute",
    top: Platform.OS === 'ios' ? 60 : 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Hero Section
  heroSection: {
    paddingTop: Platform.OS === 'ios' ? 60 : 70,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  heroSectionDesktop: {
    paddingHorizontal: "10%",
  },
  heroContent: {
    alignItems: "center",
    paddingHorizontal: 30,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: "bold",
    color: "white",
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginTop: 5,
    fontWeight: "500",
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 15,
    gap: 6,
  },
  dateText: {
    color: "white",
    fontSize: 13,
    fontWeight: "500",
  },

  // Main Content
  mainContent: {
    padding: 20,
    marginTop: -20,
  },
  mainContentDesktop: {
    maxWidth: 1000,
    alignSelf: "center",
    width: "100%",
  },

  // Welcome Card
  welcomeCard: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20,
    marginTop: 20,
  },
  welcomeCardLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },
  professorName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginTop: 4,
  },
  welcomeMessage: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 8,
  },
  welcomeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFF5F0",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F96C1B",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: "hidden",
  },

  // Quick Actions
  quickActions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  quickActionButton: {
    flex: 1,
    height: 100,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  quickActionGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
  },
  quickActionLight: {
    backgroundColor: "#FFF5F0",
  },
  quickActionText: {
    color: "white",
    fontWeight: "700",
    fontSize: 13,
    textAlign: "center",
    marginTop: 5,
    lineHeight: 18,
  },
  quickActionTextDark: {
    color: "#F96C1B",
  },

  // Stats Grid
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  statCardContent: {
    padding: 20,
    alignItems: "center",
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#F96C1B",
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    fontWeight: "500",
  },

  // Schedule Section
  scheduleSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 15,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A1A",
    flex: 1,
  },
  sectionBadge: {
    fontSize: 12,
    fontWeight: "600",
    color: "#F96C1B",
    backgroundColor: "#FFF5F0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scheduleCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  emptySchedule: {
    alignItems: "center",
    paddingVertical: 20,
  },
  emptyScheduleTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#9CA3AF",
    marginTop: 10,
  },
  emptyScheduleText: {
    fontSize: 13,
    color: "#D1D5DB",
    marginTop: 4,
  },
  scheduleItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  scheduleItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  scheduleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#F96C1B",
  },
  scheduleItemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
  },
  scheduleItemStudents: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  scheduleTimePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF5F0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginBottom: 4,
  },
  scheduleTimeText: {
    fontSize: 12,
    color: "#F96C1B",
    fontWeight: "600",
  },

  // Activity Section
  activitySection: {
    marginBottom: 30,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 15,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  activityTime: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
});