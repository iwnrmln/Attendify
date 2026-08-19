import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getClasses, Class, getSessions, AttendanceSession, deleteClass } from "../../data/store";
import { useFocusEffect } from "expo-router";
import { useState, useCallback } from "react";
import { useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function ClassList() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;
  const [classes, setClasses] = useState<Class[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        const classData = await getClasses();
        const sessionData = await getSessions();

        setClasses(classData);
        setSessions(sessionData);
      };

      loadData();
    }, [])
  );

  const getLastSession = (classId: number) => {
    const filtered = sessions.filter(
      (s) => s.classId === classId
    );

    if (filtered.length === 0) return "No sessions yet";

    const sorted = filtered.sort((a, b) => b.id - a.id);

    const latest = sorted[0];

    return `${latest.date} • ${latest.time}`;
  };

  const getSessionCount = (classId: number) => {
    return sessions.filter(s => s.classId === classId).length;
  };

  const handleDeleteClass = async (classId: number) => {
    if (isDesktop) {
      const confirmed = window.confirm("Delete this class permanently?");
      if (!confirmed) return;

      await deleteClass(classId);
      const updated = await getClasses();
      setClasses(updated);
      return;
    }

    // Mobile
    Alert.alert(
      "Delete Class",
      "Are you sure you want to delete this class? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteClass(classId);
            const updated = await getClasses();
            setClasses(updated);
          },
        },
      ]
    );
  };

  const getCardGradient = (index: number): [string, string, ...string[]] => {
    const gradients: Array<[string, string, ...string[]]> = [
      ["#F96C1B", "#FF8C42"],
      ["#FF6B35", "#F96C1B"],
      ["#E85D04", "#F96C1B"],
      ["#F48C06", "#F96C1B"],
      ["#DC2F02", "#F96C1B"],
    ];
    return gradients[index % gradients.length];
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 🔙 Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#F96C1B" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>My Classes</Text>
            <Text style={styles.headerSubtitle}>
              {classes.length} {classes.length === 1 ? 'class' : 'classes'} active
            </Text>
          </View>
          {isDesktop && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push("/classes/createClass")}
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          )}
        </View>

        {/* Class Cards */}
        {classes.length > 0 ? (
          <View style={styles.grid}>
            {classes.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, isDesktop && styles.cardDesktop]}
                activeOpacity={0.9}
                onPress={() => {
                  router.push({
                    pathname: "/classes/studentList",
                    params: { classId: item.id.toString() },
                  });
                }}
                onLongPress={() => !isDesktop && handleDeleteClass(item.id)}
              >
                <LinearGradient
                  colors={getCardGradient(index)}
                  style={styles.cardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {/* DELETE ICON */}
                  <TouchableOpacity
                    style={styles.deleteIcon}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeleteClass(item.id);
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="trash-outline" size={18} color="rgba(255,255,255,0.8)" />
                  </TouchableOpacity>

                  {/* Content */}
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.cardSub}>
                      {item.totalStudents} {item.totalStudents === 1 ? 'Student' : 'Students'}
                    </Text>
                    
                    <View style={styles.cardStats}>
                      <View style={styles.statItem}>
                        <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.7)" />
                        <Text style={styles.statText}>
                          {getSessionCount(item.id)} sessions
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cardFooter}>
                      <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.7)" />
                      <Text style={styles.cardFooterText}>
                        {getLastSession(item.id)}
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          /* Empty State */
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="school-outline" size={80} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>No Classes Yet</Text>
            <Text style={styles.emptyText}>
              Start by creating your first class to track attendance
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push("/classes/createClass")}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={20} color="white" />
              <Text style={styles.createButtonText}>Create Your First Class</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Add Class FAB (Mobile only) */}
      {!isDesktop && classes.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push("/classes/createClass")}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={30} color="white" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },

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

  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1A1A1A",
  },

  headerSubtitle: {
    fontSize: 14,
    color: "#888",
    marginTop: 2,
  },

  addButton: {
    marginLeft: "auto",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F96C1B",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#F96C1B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },

  grid: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },

  card: {
    width: "100%",
    height: 160,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    overflow: "hidden",
  },

  cardDesktop: {
    width: "48%",
    marginRight: "2%",
  },

  cardGradient: {
    flex: 1,
    padding: 20,
    justifyContent: "space-between",
  },

  deleteIcon: {
    position: "absolute",
    top: 15,
    right: 15,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  cardIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  cardContent: {
    flex: 1,
    justifyContent: "flex-end",
  },

  cardTitle: {
    color: "white",
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 4,
  },

  cardSub: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    marginBottom: 8,
  },

  cardStats: {
    flexDirection: "row",
    marginBottom: 8,
  },

  statItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },

  statText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
    marginLeft: 4,
  },

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.15)",
    padding: 8,
    borderRadius: 8,
  },

  cardFooterText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 11,
    marginLeft: 5,
    flex: 1,
  },

  emptyContainer: {
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
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },

  createButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F96C1B",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 15,
    shadowColor: "#F96C1B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },

  createButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 10,
  },

  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F96C1B",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#F96C1B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
});