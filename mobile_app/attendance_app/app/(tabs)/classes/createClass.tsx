import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Platform,
    Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import Papa from "papaparse";
import { addClass } from "../../../data/store";

export default function CreateClass() {
    type Student = {
        student_id: string;
        name: string;
        email?: string;
        department?: string;
        faceRegistered?: boolean;
    };

    const router = useRouter();
    const [programme, setProgramme] = useState("");
    const [students, setStudents] = useState<Student[]>([]);
    const [schedule, setSchedule] = useState<{ day: string; time: string }[]>([]);
    const [day, setDay] = useState("");
    const [time, setTime] = useState("");
    const [step, setStep] = useState(1);

    const handleCSVUpload = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: "*/*",
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            const file = result.assets[0];

            const fileName = file.name || '';
            if (!fileName.toLowerCase().endsWith('.csv')) {
                Alert.alert("Invalid File", "Please upload a CSV file (.csv)");
                return;
            }

            // Fetch file content
            const response = await fetch(file.uri);
            const text = await response.text();

            if (!text || text.trim().length === 0) {
                Alert.alert("Empty File", "The CSV file is empty");
                return;
            }

            // Parse CSV
            Papa.parse(text, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    // Validate CSV structure
                    if (!results.data || results.data.length === 0) {
                        Alert.alert("Error", "No data found in CSV file");
                        return;
                    }

                    const firstRow = results.data[0] as any;
                    const requiredColumns = ['student_id', 'name', 'email'];
                    const missingColumns = requiredColumns.filter(
                        col => !(col in firstRow)
                    );

                    if (missingColumns.length > 0) {
                        Alert.alert(
                            "Invalid Format",
                            `Missing required columns: ${missingColumns.join(', ')}\n\n` +
                            "Your CSV must have all three columns:\n" +
                            "student_id, name, email"
                        );
                        return;
                    }

                    const invalidRows: number[] = [];
                    const formatted: Student[] = [];

                    (results.data as any[]).forEach((row: any, index: number) => {
                        const studentId = row.student_id?.trim();
                        const studentName = row.name?.trim();
                        const studentEmail = row.email?.trim(); 

                        if (!studentId || !studentName || !studentEmail) {
                            invalidRows.push(index + 2); 
                            return;
                        }

                        formatted.push({
                            student_id: studentId,
                            name: studentName,
                            email: studentEmail,  
                            department: programme || "",
                            faceRegistered: false,
                        });
                    });

                    if (invalidRows.length > 0) {
                        console.warn(`Skipped rows ${invalidRows.join(', ')} - missing required fields (need student_id, name, AND email)`);
                    }

                    if (formatted.length === 0) {
                        Alert.alert(
                            "No Valid Data",
                            "No valid student records found. Each row must have:\n" +
                            "student_id, name, and email"
                        );
                        return;
                    }

                    setStudents(formatted);

                    let message = `Loaded ${formatted.length} students`;
                    if (invalidRows.length > 0) {
                        message += `\n⚠️ Skipped ${invalidRows.length} row(s) with missing data`;
                    }
                    Alert.alert("Success", message);
                },
                error: (error: any) => {
                    console.log("CSV Parse Error:", error);
                    Alert.alert(
                        "Parse Error",
                        "Failed to parse CSV file. Please check the file format."
                    );
                },
            });
        } catch (error) {
            console.log("CSV Upload Error:", error);
            Alert.alert(
                "Error",
                "Failed to read CSV file. Please make sure it's a valid CSV."
            );
        }
    };

    const addSchedule = () => {
        if (!day || !time) {
            Alert.alert("Error", "Please enter both day and time");
            return;
        }

        setSchedule([
            ...schedule,
            { day: day.toLowerCase().trim(), time },
        ]);
        setDay("");
        setTime("");
    };

    const removeSchedule = (index: number) => {
        const updated = schedule.filter((_, i) => i !== index);
        setSchedule(updated);
    };

    const handleCreateClass = () => {
        if (!programme) {
            Alert.alert("Error", "Please enter a department name");
            return;
        }
        if (students.length === 0) {
            Alert.alert("Error", "Please add at least one student");
            return;
        }
        if (schedule.length === 0) {
            Alert.alert("Error", "Please add at least one schedule");
            return;
        }

        const newClass = {
            id: Date.now(),
            name: programme,
            students: students,
            totalStudents: students.length,
            lastSession: "N/A",
            schedule: schedule,
        };

        addClass(newClass);
        router.replace("/(tabs)/classList");
    };

    useFocusEffect(
        React.useCallback(() => {
            setProgramme("");
            setStudents([]);
            setSchedule([]);
            setDay("");
            setTime("");

            return () => {
                setProgramme("");
                setStudents([]);
                setSchedule([]);
                setDay("");
                setTime("");
            };
        }, [])
    );

    return (
        <View style={styles.container}>
            {/* Progress Steps */}
            <View style={styles.progressContainer}>
                <View style={styles.progressSteps}>
                    <View style={[styles.progressStep, step >= 1 && styles.progressStepActive]}>
                        <Text style={[styles.progressNumber, step >= 1 && styles.progressNumberActive]}>1</Text>
                    </View>
                    <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />
                    <View style={[styles.progressStep, step >= 2 && styles.progressStepActive]}>
                        <Text style={[styles.progressNumber, step >= 2 && styles.progressNumberActive]}>2</Text>
                    </View>
                    <View style={[styles.progressLine, step >= 3 && styles.progressLineActive]} />
                    <View style={[styles.progressStep, step >= 3 && styles.progressStepActive]}>
                        <Text style={[styles.progressNumber, step >= 3 && styles.progressNumberActive]}>3</Text>
                    </View>
                </View>
                <Text style={styles.progressLabel}>
                    {step === 1 ? "Class Info" : step === 2 ? "Students" : "Review"}
                </Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="arrow-back" size={24} color="#F96C1B" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Create New Class</Text>
                </View>

                {step === 1 && (
                    <>
                        {/* Class Info Card */}
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Ionicons name="information-circle-outline" size={24} color="#F96C1B" />
                                <Text style={styles.cardTitle}>Class Information</Text>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Department Name</Text>
                                <TextInput
                                    style={styles.input}
                                    value={programme}
                                    onChangeText={setProgramme}
                                    placeholder="Enter department name"
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Schedule</Text>
                                <View style={styles.scheduleInputRow}>
                                    <TextInput
                                        placeholder="Day (e.g. Monday)"
                                        value={day}
                                        onChangeText={setDay}
                                        style={[styles.input, styles.scheduleInput]}
                                        placeholderTextColor="#9CA3AF"
                                    />
                                    <TextInput
                                        placeholder="Time (e.g. 10:00 AM)"
                                        value={time}
                                        onChangeText={setTime}
                                        style={[styles.input, styles.scheduleInput]}
                                        placeholderTextColor="#9CA3AF"
                                    />
                                </View>
                                <TouchableOpacity style={styles.addScheduleBtn} onPress={addSchedule}>
                                    <Ionicons name="add-circle-outline" size={20} color="white" />
                                    <Text style={styles.addScheduleBtnText}>Add Schedule</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Schedule List */}
                            {schedule.length > 0 && (
                                <View style={styles.scheduleList}>
                                    <Text style={styles.scheduleListTitle}>Added Schedules</Text>
                                    {schedule.map((s, index) => (
                                        <View key={index} style={styles.scheduleItem}>
                                            <View style={styles.scheduleItemInfo}>
                                                <Ionicons name="time-outline" size={16} color="#F96C1B" />
                                                <Text style={styles.scheduleItemText}>
                                                    {s.day.charAt(0).toUpperCase() + s.day.slice(1)} • {s.time}
                                                </Text>
                                            </View>
                                            <TouchableOpacity
                                                onPress={() => removeSchedule(index)}
                                                style={styles.removeBtn}
                                            >
                                                <Ionicons name="close-circle" size={20} color="#EF4444" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>

                        <TouchableOpacity
                            style={styles.nextButton}
                            onPress={() => setStep(2)}
                        >
                            <Text style={styles.nextButtonText}>Next: Add Students</Text>
                            <Ionicons name="arrow-forward" size={20} color="white" />
                        </TouchableOpacity>
                    </>
                )}

                {step === 2 && (
                    <>
                        {/* Student Upload Card */}
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Ionicons name="people-outline" size={24} color="#F96C1B" />
                                <Text style={styles.cardTitle}>Student List</Text>
                            </View>

                            {/* Upload Area */}
                            <TouchableOpacity style={styles.uploadArea} onPress={handleCSVUpload}>
                                <View style={styles.uploadIcon}>
                                    <Ionicons name="cloud-upload-outline" size={40} color="#F96C1B" />
                                </View>
                                <Text style={styles.uploadTitle}>Upload CSV File</Text>
                                <Text style={styles.uploadSubtitle}>
                                    Click to browse or drag and drop your file here
                                </Text>
                                <View style={styles.supportedFormat}>
                                    <Ionicons name="document-text-outline" size={14} color="#6B7280" />
                                    <Text style={styles.supportedFormatText}>Supported: .csv</Text>
                                </View>
                            </TouchableOpacity>

                            {/* CSV Format Example */}
                            <View style={styles.formatGuide}>
                                <View style={styles.formatHeader}>
                                    <Ionicons name="help-circle-outline" size={18} color="#F96C1B" />
                                    <Text style={styles.formatTitle}>Required CSV Format</Text>
                                </View>
                                <View style={styles.tableContainer}>
                                    <View style={[styles.tableRow, styles.tableHeaderRow]}>
                                        <Text style={[styles.tableCell, styles.tableHeaderCell]}>student_id</Text>
                                        <Text style={[styles.tableCell, styles.tableHeaderCell]}>name</Text>
                                        <Text style={[styles.tableCell, styles.tableHeaderCell]}>email</Text>
                                    </View>
                                    <View style={styles.tableRow}>
                                        <Text style={styles.tableCell}>A001</Text>
                                        <Text style={styles.tableCell}>Adam</Text>
                                        <Text style={styles.tableCell}>adam@email.com</Text>
                                    </View>
                                    <View style={styles.tableRow}>
                                        <Text style={styles.tableCell}>A002</Text>
                                        <Text style={styles.tableCell}>Bob</Text>
                                        <Text style={styles.tableCell}>bob@email.com</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Student List Preview */}
                            {students.length > 0 && (
                                <View style={styles.studentPreview}>
                                    <Text style={styles.previewTitle}>
                                        Loaded Students ({students.length})
                                    </Text>
                                    <ScrollView
                                        style={styles.studentScrollList}
                                        nestedScrollEnabled={true}
                                    >
                                        {students.map((student, index) => (
                                            <View key={index} style={styles.studentRow}>
                                                <View style={styles.studentAvatar}>
                                                    <Text style={styles.studentAvatarText}>
                                                        {student.name.charAt(0)}
                                                    </Text>
                                                </View>
                                                <View style={styles.studentInfo}>
                                                    <Text style={styles.studentName}>{student.name}</Text>
                                                    <Text style={styles.studentId}>{student.student_id}</Text>
                                                </View>
                                                <Text style={styles.studentEmail}>{student.email}</Text>
                                            </View>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>

                        <View style={styles.navigationButtons}>
                            <TouchableOpacity
                                style={styles.backNextButton}
                                onPress={() => setStep(1)}
                            >
                                <Ionicons name="arrow-back" size={20} color="#F96C1B" />
                                <Text style={styles.backNextButtonText}>Back</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.nextButton}
                                onPress={() => setStep(3)}
                            >
                                <Text style={styles.nextButtonText}>Next: Review</Text>
                                <Ionicons name="arrow-forward" size={20} color="white" />
                            </TouchableOpacity>
                        </View>
                    </>
                )}

                {step === 3 && (
                    <>
                        {/* Review Card */}
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Ionicons name="checkmark-circle-outline" size={24} color="#F96C1B" />
                                <Text style={styles.cardTitle}>Review & Create</Text>
                            </View>

                            {/* Department Summary */}
                            <View style={styles.reviewSection}>
                                <Text style={styles.reviewSectionTitle}>Department</Text>
                                <View style={styles.reviewItem}>
                                    <Ionicons name="business-outline" size={20} color="#F96C1B" />
                                    <Text style={styles.reviewItemText}>{programme || "Not set"}</Text>
                                </View>
                            </View>

                            {/* Schedule Summary */}
                            <View style={styles.reviewSection}>
                                <Text style={styles.reviewSectionTitle}>Schedule ({schedule.length} sessions)</Text>
                                {schedule.map((s, index) => (
                                    <View key={index} style={styles.reviewItem}>
                                        <Ionicons name="calendar-outline" size={20} color="#F96C1B" />
                                        <Text style={styles.reviewItemText}>
                                            {s.day.charAt(0).toUpperCase() + s.day.slice(1)} at {s.time}
                                        </Text>
                                    </View>
                                ))}
                            </View>

                            {/* Students Summary */}
                            <View style={styles.reviewSection}>
                                <Text style={styles.reviewSectionTitle}>Students ({students.length})</Text>
                                <View style={styles.reviewStudentsPreview}>
                                    {students.slice(0, 5).map((student, index) => (
                                        <Text key={index} style={styles.reviewStudentName}>
                                            • {student.name}
                                        </Text>
                                    ))}
                                    {students.length > 5 && (
                                        <Text style={styles.reviewMoreStudents}>
                                            +{students.length - 5} more
                                        </Text>
                                    )}
                                </View>
                            </View>
                        </View>

                        {/* Create Button */}
                        <View style={styles.navigationButtons}>
                            <TouchableOpacity
                                style={styles.backNextButton}
                                onPress={() => setStep(2)}
                            >
                                <Ionicons name="arrow-back" size={20} color="#F96C1B" />
                                <Text style={styles.backNextButtonText}>Back</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.createClassButton,
                                (!programme || students.length === 0 || schedule.length === 0) &&
                                styles.createClassButtonDisabled
                                ]}
                                onPress={handleCreateClass}
                                disabled={!programme || students.length === 0 || schedule.length === 0}
                            >
                                <Ionicons name="add-circle" size={24} color="white" />
                                <Text style={styles.createClassButtonText}>Create Class</Text>
                            </TouchableOpacity>
                        </View>
                    </>
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
    scrollContent: {
        paddingBottom: 40,
    },

    // Progress Steps
    progressContainer: {
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 20 : 30,
        backgroundColor: "white",
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    progressSteps: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 15,
    },
    progressStep: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#E5E7EB",
        alignItems: "center",
        justifyContent: "center",
    },
    progressStepActive: {
        backgroundColor: "#F96C1B",
    },
    progressNumber: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#9CA3AF",
    },
    progressNumberActive: {
        color: "white",
    },
    progressLine: {
        flex: 1,
        height: 3,
        backgroundColor: "#E5E7EB",
        marginHorizontal: 10,
    },
    progressLineActive: {
        backgroundColor: "#F96C1B",
    },
    progressLabel: {
        textAlign: "center",
        fontSize: 13,
        color: "#6B7280",
        marginBottom: 10,
        fontWeight: "600",
    },

    // Header
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 30,
        paddingBottom: 20,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
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
        fontSize: 26,
        fontWeight: "bold",
        color: "#1A1A1A",
    },

    // Cards
    card: {
        backgroundColor: "white",
        borderRadius: 16,
        padding: 20,
        marginHorizontal: 20,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#1A1A1A",
        marginLeft: 10,
    },

    // Inputs
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: "#374151",
        marginBottom: 8,
    },
    input: {
        borderWidth: 1.5,
        borderColor: "#E5E7EB",
        borderRadius: 12,
        padding: 14,
        backgroundColor: "#F9FAFB",
        fontSize: 15,
        color: "#1F2937",
    },
    scheduleInputRow: {
        flexDirection: "row",
        gap: 10,
        marginBottom: 10,
    },
    scheduleInput: {
        flex: 1,
    },
    addScheduleBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F96C1B",
        padding: 12,
        borderRadius: 10,
        gap: 8,
    },
    addScheduleBtnText: {
        color: "white",
        fontWeight: "600",
        fontSize: 14,
    },

    // Schedule List
    scheduleList: {
        marginTop: 15,
    },
    scheduleListTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#6B7280",
        marginBottom: 10,
    },
    scheduleItem: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#FEF3E8",
        padding: 12,
        borderRadius: 10,
        marginBottom: 8,
    },
    scheduleItemInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    scheduleItemText: {
        fontSize: 14,
        color: "#F96C1B",
        fontWeight: "500",
    },
    removeBtn: {
        padding: 4,
    },

    // Upload Area
    uploadArea: {
        borderWidth: 2,
        borderStyle: "dashed",
        borderColor: "#F96C1B",
        borderRadius: 16,
        padding: 30,
        alignItems: "center",
        backgroundColor: "#FFF5F0",
        marginBottom: 20,
    },
    uploadIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "white",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 15,
    },
    uploadTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 5,
    },
    uploadSubtitle: {
        fontSize: 13,
        color: "#6B7280",
        marginBottom: 10,
    },
    supportedFormat: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: "#F3F4F6",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    supportedFormatText: {
        fontSize: 12,
        color: "#6B7280",
    },

    // Format Guide
    formatGuide: {
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
        paddingTop: 15,
    },
    formatHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 10,
    },
    formatTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#374151",
    },
    tableContainer: {
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 8,
        overflow: "hidden",
    },
    tableRow: {
        flexDirection: "row",
    },
    tableHeaderRow: {
        backgroundColor: "#FEF3E8",
    },
    tableCell: {
        flex: 1,
        padding: 10,
        borderWidth: 0.5,
        borderColor: "#E5E7EB",
        fontSize: 12,
        color: "#374151",
    },
    tableHeaderCell: {
        fontWeight: "700",
        color: "#F96C1B",
        fontSize: 11,
    },

    // Student Preview
    studentPreview: {
        marginTop: 15,
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
        paddingTop: 15,
    },
    previewTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#374151",
        marginBottom: 10,
    },
    studentScrollList: {
        maxHeight: 200,
    },
    studentRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    studentAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#FEF3E8",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    studentAvatarText: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#F96C1B",
    },
    studentInfo: {
        flex: 1,
    },
    studentName: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
    },
    studentId: {
        fontSize: 12,
        color: "#6B7280",
    },
    studentEmail: {
        fontSize: 12,
        color: "#6B7280",
    },

    // Review Section
    reviewSection: {
        marginBottom: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    reviewSectionTitle: {
        fontSize: 13,
        fontWeight: "700",
        color: "#6B7280",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    reviewItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 8,
        paddingLeft: 5,
    },
    reviewItemText: {
        fontSize: 15,
        color: "#1F2937",
        fontWeight: "500",
    },
    reviewStudentsPreview: {
        paddingLeft: 5,
    },
    reviewStudentName: {
        fontSize: 14,
        color: "#374151",
        marginBottom: 5,
    },
    reviewMoreStudents: {
        fontSize: 13,
        color: "#F96C1B",
        fontWeight: "600",
        marginTop: 5,
    },

    // Buttons
    navigationButtons: {
        flexDirection: "row",
        gap: 12,
        paddingHorizontal: 20,
        marginTop: 10,
    },
    nextButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F96C1B",
        padding: 16,
        borderRadius: 12,
        marginHorizontal: 20,
        gap: 8,
        marginTop: 10,
    },
    nextButtonText: {
        color: "white",
        fontWeight: "600",
        fontSize: 16,
    },
    backNextButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "white",
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: "#F96C1B",
        gap: 8,
    },
    backNextButtonText: {
        color: "#F96C1B",
        fontWeight: "600",
        fontSize: 16,
    },
    createClassButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#10B981",
        padding: 16,
        borderRadius: 12,
        gap: 8,
    },
    createClassButtonDisabled: {
        backgroundColor: "#9CA3AF",
    },
    createClassButtonText: {
        color: "white",
        fontWeight: "700",
        fontSize: 16,
    },
});