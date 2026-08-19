import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { getSessions, updateSessions, getClasses } from "../../../data/store";

export default function EditAttendance() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId?: string }>();

  const [session, setSession] = useState<any>(null);
  const [classData, setClassData] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      const sessions = await getSessions();
      const classes = await getClasses();

      const foundSession = sessions.find(
        (s: any) => s.id === Number(params.sessionId)
      );

      if (foundSession) {
        setSession(foundSession);

        const foundClass = classes.find(
          (c: any) => c.id === foundSession.classId
        );

        setClassData(foundClass);
      }
    };

    loadData();
  }, [params.sessionId]);

  const toggleStatus = (index: number) => {
    if (!session || !session.results) return;

    const updatedResults = [...session.results];

    if (updatedResults[index].status === "Unknown") return;

    updatedResults[index].status =
      updatedResults[index].status === "Present"
        ? "Absent"
        : "Present";

    setSession({ ...session, results: updatedResults });
  };

  const assignStudent = (index: number) => {
    if (!classData) return;

    const assignedIds = session.results.map((r: any) => r.student_id);

    const availableStudent = classData.students.find(
      (s: any) => !assignedIds.includes(s.student_id)
    );

    if (!availableStudent) return;

    const updatedResults = [...session.results];

    updatedResults[index] = {
      name: availableStudent.name,
      student_id: availableStudent.student_id,
      status: "Present",
    };

    setSession({ ...session, results: updatedResults });
  };

  const saveChanges = async () => {
    const sessions = await getSessions();

    const updatedSessions = sessions.map((s: any) => {
      if (s.id === session.id) {
        return {
          ...session,
          presentCount: session.results.filter(
            (r: any) => r.status === "Present"
          ).length,
          absentCount: session.results.filter(
            (r: any) => r.status === "Absent"
          ).length,
        };
      }
      return s;
    });

    await updateSessions(updatedSessions);

    router.replace({
      pathname: "/session/sessionDetails",
      params: { sessionId: String(session.id) },
    });
  };

  if (!session || !session.results) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit Attendance</Text>

      <ScrollView>
        {session.results.map((student: any, index: number) => {
          const isPresent = student.status === "Present";

          return (
            <View key={index} style={styles.row}>
              <View>
                <Text style={styles.name}>{student.name}</Text>
                <Text style={styles.id}>{student.student_id}</Text>
              </View>

              {student.status === "Unknown" ? (
                <TouchableOpacity
                  style={styles.assignBtn}
                  onPress={() => assignStudent(index)}
                >
                  <Text style={{ color: "white" }}>Assign</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.toggleContainer}>
                  <Text
                    style={{
                      marginRight: 8,
                      color: isPresent ? "green" : "red",
                      fontWeight: "600",
                    }}
                  >
                    {isPresent ? "Present" : "Absent"}
                  </Text>

                  <Switch
                    value={isPresent}
                    onValueChange={() => toggleStatus(index)}
                  />
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.legend}>
        <Text style={{ color: "green" }}>● Present</Text>
        <Text style={{ color: "red" }}>● Absent</Text>
        <Text style={{ color: "gray" }}>● Unknown</Text>
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={saveChanges}>
        <Text style={{ color: "white", fontWeight: "bold" }}>
          Save Changes
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    padding: 15,
  },

  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#F96C1B",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: "center",
  },

  name: {
    fontWeight: "bold",
  },

  id: {
    color: "#777",
    fontSize: 12,
  },

  toggleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  assignBtn: {
    backgroundColor: "#6B7280",
    padding: 8,
    borderRadius: 6,
  },

  saveBtn: {
    backgroundColor: "#F96C1B",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },

  legend: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
