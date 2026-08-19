import React, { useState, useCallback, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Image,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { getSessions, getClasses, Class, AttendanceSession } from "../../../data/store";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";

export default function StudentDetails() {
    const router = useRouter();
    const params = useLocalSearchParams<{ studentId?: string; classId?: string }>();

    const [selectedClass, setSelectedClass] = useState<Class | null>(null);
    const [sessions, setSessions] = useState<AttendanceSession[]>([]);
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [isLoadingImage, setIsLoadingImage] = useState(true);

    const studentId = params.studentId;

    useFocusEffect(
        useCallback(() => {
            const loadData = async () => {
                const allClasses = await getClasses();
                const allSessions = await getSessions();

                const foundClass = allClasses.find(
                    (c) => c.id === Number(params.classId)
                );

                setSelectedClass(foundClass || null);

                const classSessions = allSessions.filter(
                    (s) => s.classId === Number(params.classId)
                );

                setSessions(classSessions);
            };

            loadData();
        }, [params.classId])
    );

    // Fetch student image
    useEffect(() => {
        const loadStudentImage = async () => {
            if (!selectedClass || !studentId) return;

            setIsLoadingImage(true);

            try {
                const student = selectedClass.students.find(
                    (s) => s.student_id === studentId
                );

                if (!student) {
                    setIsLoadingImage(false);
                    return;
                }

                // Check if image exists in student data
                if (student.imageUri) {
                    const fileInfo = await FileSystem.getInfoAsync(student.imageUri);
                    if (fileInfo.exists) {
                        setProfileImage(student.imageUri);
                        setIsLoadingImage(false);
                        return;
                    }
                }

                // Check local storage
                const localUri = `${FileSystem.documentDirectory}student_photos/student_${studentId}.jpg`;
                const localFileInfo = await FileSystem.getInfoAsync(localUri);
                if (localFileInfo.exists) {
                    setProfileImage(localUri);
                    setIsLoadingImage(false);
                    return;
                }

                // Check all classes for this student's image
                const allClasses = await getClasses();
                for (const cls of allClasses) {
                    const clsStudent = cls.students?.find(
                        (s) => s.student_id === studentId
                    );
                    if (clsStudent?.imageUri) {
                        const fileInfo = await FileSystem.getInfoAsync(clsStudent.imageUri);
                        if (fileInfo.exists) {
                            setProfileImage(clsStudent.imageUri);
                            setIsLoadingImage(false);
                            return;
                        }
                    }
                }

                // Try to fetch from API
                try {
                    const response = await fetch(
                        `http://10.4.148.17:5000/student-image/${studentId}`
                    );

                    if (response.ok) {
                        const data = await response.json();
                        if (data.data?.image_base64) {
                            const base64Data = data.data.image_base64.replace(
                                /^data:image\/\w+;base64,/,
                                ""
                            );

                            // Ensure directory exists
                            const dir = `${FileSystem.documentDirectory}student_photos/`;
                            const dirInfo = await FileSystem.getInfoAsync(dir);
                            if (!dirInfo.exists) {
                                await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
                            }

                            const fileName = `student_${studentId}.jpg`;
                            const fileUri = `${FileSystem.documentDirectory}student_photos/${fileName}`;

                            await FileSystem.writeAsStringAsync(fileUri, base64Data, {
                                encoding: FileSystem.EncodingType.Base64,
                            });

                            setProfileImage(fileUri);
                            setIsLoadingImage(false);
                            return;
                        }
                    }
                } catch (error: any) {
                    console.log(`Failed to fetch image from API for ${studentId}:`, error);
                }

            } catch (error: any) {
                console.log("Error loading student image:", error);
            }

            setIsLoadingImage(false);
        };

        loadStudentImage();
    }, [selectedClass, studentId]);

    if (!selectedClass || !studentId) {
        return (
            <View style={styles.center}>
                <Text>Loading student...</Text>
            </View>
        );
    }

    const student = selectedClass.students.find(
        (s) => s.student_id === studentId
    );

    if (!student) {
        return (
            <View style={styles.center}>
                <Text>Student not found</Text>
            </View>
        );
    }

    // Check if face is registered across all classes and sessions
    const isFaceRegistered = () => {
        // Check current class
        if (student.faceRegistered) return true;

        // Check if student has been detected as "Present" in any session
        const hasBeenPresent = sessions.some((session) => {
            return session.results?.some(
                (r: any) =>
                    r.student_id === studentId &&
                    r.status === "Present"
            );
        });

        if (hasBeenPresent) return true;

        // Check if image exists
        if (profileImage) return true;

        return false;
    };

    const faceRegistered = isFaceRegistered();

    let present = 0;
    let absent = 0;

    const sessionHistory = sessions.map((session) => {
        const result = session.results?.find(
            (r: any) => r.student_id === studentId
        );

        if (result?.status === "Present") present++;
        else absent++;

        return {
            date: session.date,
            time: session.time,
            status: result?.status || "Absent",
            sessionId: session.id,
        };
    });

    const total = sessions.length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    const isAtRisk = percentage < 50 && total > 0;

    const insight =
        total === 0
            ? "No attendance records yet"
            : percentage >= 80
                ? "Excellent attendance"
                : percentage >= 60
                    ? "Moderate attendance"
                    : "At Risk (Low attendance)";

    const lastPresent = [...sessions]
        .reverse()
        .find((s) =>
            s.results?.some(
                (r: any) =>
                    r.student_id === studentId && r.status === "Present"
            )
        );

    const getAvatarColor = (name: string) => {
        const colors = [
            "#F96C1B", "#4CAF50", "#2196F3", "#9C27B0",
            "#FF9800", "#795548", "#607D8B", "#E91E63"
        ];

        let hash = 0;
        for (let i = 0; i < name?.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }

        return colors[Math.abs(hash) % colors.length];
    };

    return (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            <View style={styles.container}>

                {/* HEADER */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => {
                        if (params.classId) {
                            router.push({
                                pathname: "/classes/studentList",
                                params: { classId: params.classId }
                            });
                        } else {
                            router.back();
                        }
                    }}>
                        <Ionicons name="arrow-back" size={24} color="#F96C1B" />
                    </TouchableOpacity>

                    <Text style={styles.headerTitle}>STUDENT DETAILS</Text>
                </View>

                {/* STUDENT INFO */}
                <View style={styles.card}>
                    <View style={styles.profileSection}>
                        {profileImage ? (
                            <Image
                                source={{ uri: profileImage }}
                                style={styles.profileImage}
                                onError={() => {
                                    console.log("Failed to load profile image");
                                    setProfileImage(null);
                                }}
                            />
                        ) : (
                            <View style={[
                                styles.placeholderImage,
                                { backgroundColor: `${getAvatarColor(student.name)}20` }
                            ]}>
                                <Text style={[
                                    styles.placeholderText,
                                    { color: getAvatarColor(student.name) }
                                ]}>
                                    {student.name?.charAt(0)?.toUpperCase()}
                                </Text>
                            </View>
                        )}

                        <View style={{ marginLeft: 15, flex: 1 }}>
                            <Text style={styles.name}>{student.name}</Text>
                            <Text style={styles.subText}>{student.student_id}</Text>

                            <View style={styles.faceRegistrationBadge}>
                                <Ionicons
                                    name={faceRegistered ? "checkmark-circle" : "alert-circle"}
                                    size={16}
                                    color={faceRegistered ? "#4CAF50" : "#FF9800"}
                                />
                                <Text style={[
                                    styles.faceRegistrationText,
                                    { color: faceRegistered ? "#4CAF50" : "#FF9800" }
                                ]}>
                                    {faceRegistered
                                        ? "Face Registered"
                                        : "Face Not Registered"}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {isAtRisk && (
                        <View style={styles.riskBadge}>
                            <Text style={styles.riskText}>
                                ⚠️ Attendance Risk - Below 50%
                            </Text>
                        </View>
                    )}
                </View>

                {/* STATS */}
                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <Text style={styles.statNumber}>{present}</Text>
                        <Text style={styles.statLabel}>Present</Text>
                    </View>

                    <View style={styles.statBox}>
                        <Text style={styles.statNumber}>{absent}</Text>
                        <Text style={styles.statLabel}>Absent</Text>
                    </View>

                    <View style={styles.statBox}>
                        <Text style={styles.statNumber}>{percentage}%</Text>
                        <Text style={styles.statLabel}>Rate</Text>
                    </View>
                </View>

                {/* INSIGHT */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Insight</Text>
                    <Text style={styles.insightText}>{insight}</Text>
                    {total > 0 && (
                        <Text style={styles.insightDetail}>
                            Attended {present} out of {total} sessions
                        </Text>
                    )}
                </View>

                {/* LAST SEEN */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Last Seen</Text>
                    <View style={styles.lastSeenRow}>
                        <Ionicons
                            name={lastPresent ? "time" : "time-outline"}
                            size={20}
                            color={lastPresent ? "#4CAF50" : "#999"}
                        />
                        <Text style={[
                            styles.lastSeenText,
                            { color: lastPresent ? "#333" : "#999" }
                        ]}>
                            {lastPresent
                                ? `${lastPresent.date} • ${lastPresent.time}`
                                : "No attendance record"}
                        </Text>
                    </View>
                </View>

                {/* PROGRESS BAR */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Attendance Progress</Text>
                    <View style={styles.barContainer}>
                        <View
                            style={[
                                styles.barFill,
                                {
                                    width: `${percentage}%`,
                                    backgroundColor:
                                        percentage >= 80
                                            ? "#4CAF50"
                                            : percentage >= 60
                                                ? "#FF9800"
                                                : "#F44336"
                                }
                            ]}
                        />
                    </View>
                    <Text style={styles.barText}>
                        {present} / {total} ({percentage}%)
                    </Text>
                </View>

                {/* SESSION HISTORY */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Session History</Text>

                    {sessionHistory.length === 0 ? (
                        <Text style={styles.noSessionsText}>
                            No sessions recorded yet
                        </Text>
                    ) : (
                        sessionHistory.map((s, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.sessionRow}
                                onPress={() =>
                                    router.push({
                                        pathname: "/session/sessionDetails",
                                        params: { sessionId: String(s.sessionId) },
                                    })
                                }
                            >
                                <View>
                                    <Text style={styles.sessionDate}>{s.date}</Text>
                                    <Text style={styles.sessionTime}>{s.time}</Text>
                                </View>
                                <View style={{ flexDirection: "row", alignItems: "center" }}>
                                    <View style={[
                                        styles.statusBadge,
                                        {
                                            backgroundColor:
                                                s.status === "Present" ? "#E8F5E9" : "#FFEBEE"
                                        }
                                    ]}>
                                        <Text
                                            style={{
                                                color: s.status === "Present" ? "#2E7D32" : "#C62828",
                                                fontWeight: "600",
                                                fontSize: 12,
                                            }}
                                        >
                                            {s.status}
                                        </Text>
                                    </View>

                                    <Ionicons name="chevron-forward" size={16} color="#999" />
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>

            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB",
        padding: 15,
    },

    header: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 50,
        marginBottom: 20,
    },

    headerTitle: {
        fontSize: 20,
        marginLeft: 20,
        fontWeight: "bold",
        color: "#F96C1B",
    },

    card: {
        backgroundColor: "white",
        padding: 15,
        borderRadius: 12,
        marginBottom: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },

    profileSection: {
        flexDirection: "row",
        alignItems: "center",
    },

    profileImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },

    placeholderImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 3,
        borderColor: "#E5E7EB",
    },

    placeholderText: {
        fontSize: 32,
        fontWeight: "bold",
    },

    name: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#F96C1B",
    },

    subText: {
        color: "#777",
        marginTop: 5,
    },

    faceRegistrationBadge: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 8,
        gap: 4,
    },

    faceRegistrationText: {
        fontSize: 12,
        fontWeight: "600",
    },

    riskBadge: {
        marginTop: 10,
        backgroundColor: "#fee2e2",
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
        alignSelf: "flex-start",
        borderWidth: 1,
        borderColor: "#fecaca",
    },

    riskText: {
        color: "#dc2626",
        fontWeight: "600",
        fontSize: 12,
    },

    statsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 15,
    },

    statBox: {
        flex: 1,
        marginHorizontal: 5,
        backgroundColor: "white",
        padding: 15,
        borderRadius: 10,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },

    statNumber: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#F96C1B",
    },

    statLabel: {
        fontSize: 12,
        color: "#777",
    },

    sectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 8,
        color: "#333",
    },

    insightText: {
        fontSize: 14,
        fontWeight: "500",
    },

    insightDetail: {
        fontSize: 12,
        color: "#777",
        marginTop: 4,
    },

    lastSeenRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },

    lastSeenText: {
        fontSize: 14,
    },

    barContainer: {
        height: 20,
        backgroundColor: "#eee",
        borderRadius: 10,
        overflow: "hidden",
    },

    barFill: {
        height: "100%",
        borderRadius: 10,
    },

    barText: {
        marginTop: 8,
        textAlign: "center",
        fontWeight: "600",
        color: "#F96C1B",
    },

    sessionRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },

    sessionDate: {
        fontWeight: "500",
    },

    sessionTime: {
        fontSize: 12,
        color: "#999",
        marginTop: 2,
    },

    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 10,
    },

    noSessionsText: {
        textAlign: "center",
        color: "#999",
        marginTop: 10,
    },

    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
});