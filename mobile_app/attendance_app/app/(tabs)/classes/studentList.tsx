import React from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Platform,
    Alert,
    Image,
    ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useLocalSearchParams } from "expo-router";
import { Class, getClasses, getSessions, updateClass } from "../../../data/store";
import { useState, useCallback, useEffect } from "react";
import { generateClassAnalytics } from "../../../templates/reportAnalytics";
import { generateOverallReportHTML } from "../../../templates/overallReportTemplate";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";

export default function StudentList() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedClass, setSelectedClass] = useState<Class | null>(null);
    const params = useLocalSearchParams<{ classId?: string; refresh?: string }>();
    const [sessions, setSessions] = useState<any[]>([]);
    const [studentImages, setStudentImages] = useState<Record<string, string>>({});
    const [isLoadingImages, setIsLoadingImages] = useState(false);
    const [isRegistering, setIsRegistering] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useFocusEffect(
        useCallback(() => {
            const loadClass = async () => {
                console.log("🔄 Loading class data...", "refreshTrigger:", refreshTrigger);
                const classes = await getClasses();
                const sessionsData = await getSessions();

                const found = classes.find(
                    (c) => c.id === Number(params.classId)
                );

                console.log("📊 Class loaded:", found?.name, "Students:", found?.students?.length);
                setSelectedClass(found || null);
                setSessions(sessionsData);
            };

            loadClass();
        }, [params.classId, refreshTrigger, params.refresh])
    );

    // Fetch student images when class loads or changes
    useEffect(() => {
        if (selectedClass?.students) {
            fetchStudentImagesBatch();
        }
    }, [selectedClass?.id, selectedClass?.students?.length]);

    const fetchStudentImagesBatch = async () => {
        if (!selectedClass?.students || selectedClass.students.length === 0) return;

        setIsLoadingImages(true);
        const images: Record<string, string> = { ...studentImages };
        const studentsToFetch: string[] = [];

        for (const student of selectedClass.students) {
            if (studentImages[student.student_id]) {
                const fileInfo = await FileSystem.getInfoAsync(studentImages[student.student_id]);
                if (fileInfo.exists) {
                    images[student.student_id] = studentImages[student.student_id];
                    continue;
                }
            }

            if (student.imageUri) {
                const fileInfo = await FileSystem.getInfoAsync(student.imageUri);
                if (fileInfo.exists) {
                    images[student.student_id] = student.imageUri;
                    continue;
                }
            }

            const localUri = `${FileSystem.documentDirectory}student_photos/student_${student.student_id}.jpg`;
            const localFileInfo = await FileSystem.getInfoAsync(localUri);
            if (localFileInfo.exists) {
                images[student.student_id] = localUri;
                continue;
            }

            studentsToFetch.push(student.student_id);
        }

        if (studentsToFetch.length > 0) {
            try {
                console.log(`Fetching images for ${studentsToFetch.length} students...`);

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);

                const response = await fetch(
                    `http://10.4.148.17:5000/student-images`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            identity_codes: studentsToFetch,
                        }),
                        signal: controller.signal,
                    }
                );

                clearTimeout(timeoutId);

                if (response.ok) {
                    const data = await response.json();
                    console.log(`Received response for ${data.data?.length || 0} students`);

                    if (data.data && Array.isArray(data.data)) {
                        const dir = `${FileSystem.documentDirectory}student_photos/`;
                        const dirInfo = await FileSystem.getInfoAsync(dir);
                        if (!dirInfo.exists) {
                            await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
                        }

                        for (const result of data.data) {
                            if (result.success && result.image_base64) {
                                try {
                                    const base64Data = result.image_base64.replace(
                                        /^data:image\/\w+;base64,/,
                                        ""
                                    );

                                    const fileName = `student_${result.identity_code}.jpg`;
                                    const fileUri = `${FileSystem.documentDirectory}student_photos/${fileName}`;

                                    await FileSystem.writeAsStringAsync(fileUri, base64Data, {
                                        encoding: FileSystem.EncodingType.Base64,
                                    });

                                    images[result.identity_code] = fileUri;
                                } catch (writeError) {
                                    console.error(`Failed to save image for ${result.identity_code}:`, writeError);
                                }
                            } else {
                                console.log(`No image available for ${result.identity_code}`);
                            }
                        }
                    }
                } else {
                    console.log("Batch fetch failed with status:", response.status);
                }
            } catch (error: any) {
                if (error?.name === 'AbortError') {
                    console.log("Batch fetch timed out");
                } else {
                    console.log("Batch fetch error:", error);
                }
            }
        }

        setStudentImages(images);
        setIsLoadingImages(false);
    };

    // Search Function
    const filteredStudents = selectedClass?.students?.filter((student: any) => {
        const query = searchQuery.toLowerCase();
        return (
            student.name?.toLowerCase().includes(query) ||
            student.student_id?.toLowerCase().includes(query)
        );
    });

    if (!selectedClass) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <Text>Loading students...</Text>
            </View>
        );
    }

    const getStudentStats = (studentId: string) => {
        const classSessions = sessions.filter(
            (s) => s.classId === selectedClass?.id
        );

        let present = 0;

        classSessions.forEach((session) => {
            const result = session.results?.find(
                (r: any) => String(r.student_id).trim().toLowerCase() === String(studentId).trim().toLowerCase()
            );

            if (result?.status === "Present") present++;
        });

        const total = classSessions.length;
        const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

        return { percentage, present, total };
    };

    const handleExportOverallReport = async () => {
        try {
            if (!selectedClass) {
                Alert.alert("Error", "Class not loaded yet");
                return;
            }

            const allSessions = await getSessions();

            const classSessions = allSessions
                .filter((s) => s && s.classId === selectedClass.id)
                .sort(
                    (a, b) =>
                        new Date(a.date).getTime() - new Date(b.date).getTime()
                );

            if (classSessions.length === 0) {
                Alert.alert("No Data", "No session data available");
                return;
            }

            const analytics = generateClassAnalytics(
                classSessions,
                selectedClass
            );

            if (!analytics) {
                Alert.alert("Error", "Failed to generate analytics");
                return;
            }

            const chartConfig = {
                type: "line",
                data: {
                    labels: analytics.trendData.map((t: any) => t.date),
                    datasets: [
                        {
                            label: "Attendance (%)",
                            data: analytics.trendData.map((t: any) => t.rate),
                            borderColor: "#F96C1B",
                            backgroundColor: "rgba(249, 108, 27, 0.1)",
                            fill: true,
                            tension: 0.4,
                            pointBackgroundColor: "#F96C1B",
                            pointBorderColor: "#ffffff",
                            pointBorderWidth: 2,
                            pointRadius: 5,
                        },
                    ],
                },
                options: {
                    plugins: {
                        legend: {
                            display: true,
                            position: 'bottom',
                            labels: {
                                font: { size: 14 },
                                padding: 20,
                                usePointStyle: true,
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                callback: 'function(value) { return value + "%"; }',
                            }
                        }
                    }
                }
            };

            const trendChartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(
                JSON.stringify(chartConfig)
            )}&width=800&height=400`;

            const html = generateOverallReportHTML({
                analytics,
                className: selectedClass.name,
                trendChartUrl,
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

            const { uri } = await Print.printToFileAsync({ html });

            const fileName = `Overall_Attendance_${selectedClass.name.replace(/\s+/g, '_')}.pdf`
                .replace(/[^a-zA-Z0-9_\.]/g, "");

            const newPath = (FileSystem.documentDirectory || FileSystem.cacheDirectory) + fileName;

            await FileSystem.moveAsync({
                from: uri,
                to: newPath,
            });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(newPath, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Share Overall Attendance Report',
                    UTI: 'com.adobe.pdf',
                });
            } else {
                Alert.alert("Success", "Report saved to device");
            }

        } catch (error: any) {
            console.log("Export error:", error);
            Alert.alert("Error", "Failed to export report. Please try again.");
        }
    };

    const groupAndSortSchedule = (schedule: any[]) => {
        const dayOrder = [
            "monday", "tuesday", "wednesday", "thursday",
            "friday", "saturday", "sunday",
        ];

        const grouped: Record<string, any[]> = {};

        schedule.forEach((s) => {
            const day = s.day.toLowerCase();
            if (!grouped[day]) grouped[day] = [];
            grouped[day].push(s);
        });

        return Object.keys(grouped)
            .sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b))
            .map((day) => ({
                day,
                times: grouped[day].sort(
                    (a, b) =>
                        new Date(`1970/01/01 ${a.time}`).getTime() -
                        new Date(`1970/01/01 ${b.time}`).getTime()
                ),
            }));
    };

    const getLastSession = () => {
        const classSessions = sessions
            .filter((s) => s.classId === selectedClass?.id)
            .sort((a, b) => b.id - a.id);

        if (classSessions.length === 0) return null;

        return classSessions[0];
    };

    const handleRegisterFace = async (student: any) => {
        try {
            console.log(`🔵 Starting face registration for student: ${student.name} (${student.student_id})`);
            setIsRegistering(student.student_id);

            const API_URL = "http://10.4.148.17:5000";

            // Test if server is reachable
            try {
                console.log(`Testing connection to ${API_URL}/health...`);
                const healthCheck = await fetch(`${API_URL}/health`, {
                    method: "GET",
                });

                if (!healthCheck.ok) {
                    throw new Error(`Server responded with ${healthCheck.status}`);
                }

                const healthData = await healthCheck.json();
                console.log("✅ Server is reachable:", JSON.stringify(healthData));

                if (healthData.availableModels && !healthData.availableModels.tinyFace) {
                    setIsRegistering(null);
                    Alert.alert(
                        "Server Not Ready",
                        "The face detection server is still loading models. Please wait a moment and try again."
                    );
                    return;
                }
            } catch (healthError: any) {
                setIsRegistering(null);
                console.error("❌ Server unreachable:", healthError.message);
                Alert.alert(
                    "Server Unreachable",
                    `Cannot connect to ${API_URL}\n\n` +
                    "Troubleshooting:\n" +
                    "1. Is face.js running? Check terminal\n" +
                    "2. Are both on same WiFi?\n" +
                    "3. Try opening this in your browser:\n" +
                    `   ${API_URL}/health\n` +
                    "4. Check firewall allows port 5000"
                );
                return;
            }

            // Pick image
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8,
                base64: false,
            });

            if (result.canceled) {
                console.log("Image selection cancelled");
                setIsRegistering(null);
                return;
            }

            const image = result.assets[0];
            console.log(`📸 Selected: ${image.width}x${image.height}, ${image.fileSize ? (image.fileSize / 1024).toFixed(0) + 'KB' : 'unknown size'}`);

            // Validate
            if (image.fileSize && image.fileSize > 10 * 1024 * 1024) {
                setIsRegistering(null);
                Alert.alert("Image Too Large", "Please select an image under 10MB");
                return;
            }

            // Prepare FormData
            const formData = new FormData();
            const uriParts = image.uri.split('.');
            const fileType = uriParts[uriParts.length - 1] || 'jpg';

            formData.append("image", {
                uri: image.uri,
                name: `student_${student.student_id}.${fileType}`,
                type: `image/${fileType}`,
            } as any);

            formData.append("display_name", student.name);
            formData.append("identity_code", student.student_id);
            formData.append("email", `${student.student_id}@example.com`);
            formData.append("department", selectedClass?.name || "General");

            // Send request
            console.log(`📤 Sending to ${API_URL}/register-student-face...`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            const response = await fetch(`${API_URL}/register-student-face`, {
                method: "POST",
                body: formData,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            const data = await response.json();
            console.log(`📥 Response (${response.status}):`, JSON.stringify(data, null, 2));

            // Handle response
            if (!data.success) {
                setIsRegistering(null);
                const errorCode = data.error?.code;
                const errorMessage = data.message || data.error || "Unknown error";

                if (errorCode === "DUPLICATE_EMAIL" || errorCode === "DUPLICATE_IDENTITY") {
                    Alert.alert("Already Registered", "This student's face is already registered.");
                } else if (errorCode === "NO_FACE_DETECTED") {
                    Alert.alert("No Face Detected", "Please use a clearer photo with good lighting.");
                } else if (errorCode === "INVALID_IMAGE") {
                    Alert.alert("Invalid Image", "The image couldn't be processed. Try another photo.");
                } else {
                    Alert.alert("Registration Failed", errorMessage);
                }
                return;
            }

            console.log("✅ Face registered on server");

            // Save locally
            const fileName = `student_${student.student_id}.jpg`;
            const permanentUri = `${FileSystem.documentDirectory}student_photos/${fileName}`;

            const dir = `${FileSystem.documentDirectory}student_photos/`;
            const dirInfo = await FileSystem.getInfoAsync(dir);
            if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
            }

            await FileSystem.copyAsync({
                from: image.uri,
                to: permanentUri,
            });

            console.log(`💾 Image saved to: ${permanentUri}`);


            setStudentImages(prev => {
                const updated = { ...prev, [student.student_id]: permanentUri };
                console.log("🖼️ Updated studentImages:", Object.keys(updated));
                return updated;
            });

            const targetStudentId = String(student.student_id).trim().toLowerCase();

            const updatedStudents = selectedClass.students.map((s) => {
                const currentId = String(s.student_id).trim().toLowerCase();
                if (currentId === targetStudentId) {
                    console.log(`📝 Setting faceRegistered=true for ${s.name} (${s.student_id})`);
                    return {
                        ...s,
                        faceRegistered: true,
                        imageUri: permanentUri
                    };
                }
                return s;
            });

            console.log("📝 Students to save:", updatedStudents.map(s =>
                `${s.name}(${s.student_id}): faceRegistered=${s.faceRegistered}`
            ));

            await updateClass(selectedClass.id, updatedStudents);

            const allClasses = await getClasses();
            for (const cls of allClasses) {
                if (cls.id === selectedClass.id) continue;
                const hasStudent = cls.students?.some(
                    (s) => String(s.student_id).trim().toLowerCase() === targetStudentId
                );
                if (hasStudent) {
                    const updated = cls.students.map((s) =>
                        String(s.student_id).trim().toLowerCase() === targetStudentId
                            ? { ...s, faceRegistered: true, imageUri: permanentUri }
                            : s
                    );
                    await updateClass(cls.id, updated);
                }
            }

            const updatedClass = {
                ...selectedClass,
                students: updatedStudents
            };
            setSelectedClass(updatedClass);
            setRefreshTrigger(prev => prev + 1);
            setIsRegistering(null);

            Alert.alert("Success", `${student.name}'s face registered successfully`);

        } catch (error: any) {
            console.error("❌ Registration error:", error.message);
            setIsRegistering(null);

            if (error.name === 'AbortError') {
                Alert.alert("Timeout", "Server took too long. Check if face.js is running.");
            } else if (error.message?.includes("Network request failed")) {
                Alert.alert(
                    "Connection Failed",
                    `Cannot reach server.\n\nMake sure:\n• face.js is running\n• Both on same WiFi\n• No firewall blocking port 5000`
                );
            } else {
                Alert.alert("Error", error.message || "Registration failed");
            }
        }
    };

    const isStudentFaceRegistered = (studentId: string) => {
        const student = selectedClass?.students?.find(
            (s) => String(s.student_id).trim().toLowerCase() === String(studentId).trim().toLowerCase()
        );

        if (student?.faceRegistered) {
            return true;
        }

        return sessions.some((session) => {
            if (session.classId === selectedClass?.id) {
                return session.results?.some(
                    (r: any) =>
                        String(r.student_id).trim().toLowerCase() === String(studentId).trim().toLowerCase() &&
                        r.status === "Present"
                );
            }
            return false;
        });
    };

    return (
        <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.push("/classList")}>
                            <Ionicons name="arrow-back" size={24} color="#F96C1B" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.classTitle}>
                            {selectedClass?.name || "Class"}
                        </Text>

                        <View style={styles.sessionInfo}>
                            <Text style={styles.text}>
                                Total Students: {selectedClass?.totalStudents || 0}
                            </Text>
                        </View>

                        <View style={styles.sessionInfo}>
                            {(() => {
                                const lastSession = getLastSession();
                                return (
                                    <>
                                        <Text style={styles.text}>Last Session: {lastSession
                                            ? `${lastSession.date} • ${lastSession.time}`
                                            : "No sessions yet"} </Text>
                                    </>
                                );
                            })()}
                        </View>
                        <View style={styles.scheduleBox}>
                            <Text style={styles.scheduleTitle}>Schedule:</Text>

                            {selectedClass.schedule && selectedClass.schedule.length > 0 ? (
                                groupAndSortSchedule(selectedClass.schedule).map((group, index) => (
                                    <View key={index} style={styles.scheduleRow}>
                                        <Text style={styles.dayLabel}>
                                            {group.day.charAt(0).toUpperCase() + group.day.slice(1)}
                                        </Text>
                                        <View style={styles.pillContainer}>
                                            {group.times.map((t: any, i: number) => (
                                                <View key={i} style={styles.pill}>
                                                    <Text style={styles.pillText}>{t.time}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                ))
                            ) : (
                                <Text style={styles.noScheduleText}>No schedule set</Text>
                            )}
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() =>
                            router.push(`/classes/editClass?classId=${selectedClass.id}`)
                        }
                    >
                        <Ionicons name="create-outline" size={16} color="#fff" />
                        <Text style={styles.editButtonText}>Edit Class</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.exportButton}
                        onPress={handleExportOverallReport}
                    >
                        <Ionicons name="document-text-outline" size={18} color="#F96C1B" />
                        <Text style={styles.exportButtonText}>Export Overall Report</Text>
                    </TouchableOpacity>

                    <View style={styles.inputBox}>
                        <TextInput
                            placeholder="Search by name or ID"
                            style={styles.input}
                            autoCapitalize="none"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    <ScrollView
                        style={[styles.listContainer]}
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                    >
                        {(selectedClass.students?.length || 0) === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="people-outline" size={48} color="#ccc" />
                                <Text style={styles.emptyStateText}>
                                    No students in this class
                                </Text>
                                <Text style={styles.emptyStateSubText}>
                                    Add students to get started with attendance tracking
                                </Text>
                            </View>
                        ) : (
                            (filteredStudents || selectedClass.students).map((student, index) => {
                                const stats = getStudentStats(student.student_id);
                                const isRegistered = isStudentFaceRegistered(student.student_id);
                                const studentImage = studentImages[student.student_id] || student.imageUri;

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={styles.studentCard}
                                        onPress={() =>
                                            router.push({
                                                pathname: "/classes/studentDetails",
                                                params: {
                                                    studentId: student.student_id,
                                                    classId: String(selectedClass.id),
                                                },
                                            })
                                        }
                                    >
                                        {/* Profile Image */}
                                        {studentImage ? (
                                            <Image
                                                source={{ uri: studentImage }}
                                                style={styles.avatarImage}
                                                onError={() => {
                                                    console.log(`Failed to load image for ${student.student_id}`);
                                                }}
                                            />
                                        ) : (
                                            <View style={styles.avatar}>
                                                <Text style={styles.avatarText}>
                                                    {student.name?.charAt(0)?.toUpperCase()}
                                                </Text>
                                            </View>
                                        )}

                                        <View style={styles.studentInfo}>
                                            <View style={styles.nameRow}>
                                                <Text style={styles.studentName}>{student.name}</Text>
                                                {isRegistered && (
                                                    <Ionicons
                                                        name="checkmark-circle"
                                                        size={16}
                                                        color="#4CAF50"
                                                    />
                                                )}
                                            </View>
                                            <Text style={styles.studentId}>{student.student_id}</Text>

                                            <Text
                                                style={[
                                                    styles.attendanceText,
                                                    {
                                                        color:
                                                            stats.percentage >= 80
                                                                ? "#16a34a"
                                                                : stats.percentage >= 60
                                                                    ? "#f59e0b"
                                                                    : "#dc2626",
                                                    }
                                                ]}
                                            >
                                                {stats.percentage}% Attendance ({stats.present}/{stats.total} sessions)
                                            </Text>

                                            {isRegistering === student.student_id ? (
                                                <View style={[styles.registerFaceButton, styles.registeringButton]}>
                                                    <ActivityIndicator size="small" color="#fff" />
                                                    <Text style={styles.registerFaceText}>Registering...</Text>
                                                </View>
                                            ) : (
                                                <TouchableOpacity
                                                    style={[
                                                        styles.registerFaceButton,
                                                        isRegistered && styles.updateFaceButton,
                                                    ]}
                                                    onPress={() => handleRegisterFace(student)}
                                                    disabled={isRegistering !== null}
                                                >
                                                    <Ionicons
                                                        name={isRegistered ? "sync-outline" : "camera-outline"}
                                                        size={14}
                                                        color="#fff"
                                                    />
                                                    <Text style={styles.registerFaceText}>
                                                        {isRegistered ? "Update Face" : "Register Face"}
                                                    </Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </ScrollView>
                </View >
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F3F4F6",
        paddingHorizontal: 20,
        paddingBottom: 50,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 50,
        marginBottom: 20,
    },
    card: {
        backgroundColor: "white",
        borderRadius: 12,
        padding: 25,
        marginBottom: 15,
        marginHorizontal: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    classTitle: {
        color: "#F96C1B",
        fontWeight: "bold",
        marginBottom: 5,
        fontSize: 18,
    },
    text: {
        fontSize: 13,
        color: "#555",
        fontWeight: "600",
    },
    sessionInfo: {
        marginTop: 5,
    },
    inputBox: {
        alignItems: "center",
    },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 10,
        padding: 15,
        width: '100%',
        backgroundColor: "white",
    },
    listContainer: {
        marginTop: 20,
        paddingBottom: 20,
    },
    studentCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "white",
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 0.5,
        borderColor: "#949494",
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#F96C1B",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    avatarText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 18,
    },
    avatarImage: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
        borderWidth: 2,
        borderColor: "#E5E7EB",
    },
    studentInfo: {
        flex: 1,
    },
    nameRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    studentName: {
        fontWeight: "600",
        fontSize: 14,
        color: "#333",
    },
    studentId: {
        fontSize: 12,
        color: "#777",
        marginTop: 2,
    },
    attendanceText: {
        fontSize: 12,
        marginTop: 4,
        fontWeight: "600",
    },
    scheduleBox: {
        marginBottom: 15,
        marginTop: 20,
        borderTopWidth: 1,
        borderStyle: "dashed",
        borderColor: "#ccc",
    },
    scheduleTitle: {
        fontWeight: "700",
        marginBottom: 20,
        marginTop: 15,
        color: "#F96C1B",
    },
    noScheduleText: {
        fontSize: 13,
        color: "#888",
    },
    editButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F96C1B",
        paddingVertical: 12,
        borderRadius: 10,
        marginTop: 10,
        marginBottom: 15,
        gap: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    editButtonText: {
        color: "#fff",
        fontWeight: "600",
    },
    exportButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fff",
        paddingVertical: 14,
        borderRadius: 10,
        marginBottom: 25,
        gap: 8,
        borderWidth: 2,
        borderColor: "#F96C1B",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    exportButtonText: {
        color: "#F96C1B",
        fontWeight: "600",
        fontSize: 15,
    },
    scheduleRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
        borderLeftWidth: 3,
        borderColor: '#F96C1B',
    },
    dayLabel: {
        width: 90,
        fontWeight: "600",
        color: "#333",
        textAlignVertical: "center",
        marginLeft: 5,
    },
    pillContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    pill: {
        backgroundColor: "#F96C1B",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
    },
    pillText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600",
    },
    registerFaceButton: {
        marginTop: 8,
        backgroundColor: "#F96C1B",
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 8,
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    registerFaceText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600",
    },
    updateFaceButton: {
        marginTop: 8,
        backgroundColor: "#4CAF50",
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 8,
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
    },
    emptyStateText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#666",
        marginTop: 10,
    },
    emptyStateSubText: {
        fontSize: 12,
        color: "#999",
        marginTop: 5,
        textAlign: "center",
    },
    registeringButton: {
        backgroundColor: "#94a3b8",
        opacity: 0.8,
    },
});