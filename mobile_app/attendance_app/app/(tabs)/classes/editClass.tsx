import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    FlatList,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getClasses, updateClasses, Class } from "../../../data/store";

export default function EditClass() {
    const router = useRouter();
    const params = useLocalSearchParams<{ classId?: string }>();

    const [selectedClass, setSelectedClass] = useState<Class | null>(null);
    const [newStudentName, setNewStudentName] = useState("");
    const [newStudentId, setNewStudentId] = useState("");
    const [newDay, setNewDay] = useState("");
    const [newTime, setNewTime] = useState("");
    const [hasChanges, setHasChanges] = useState(false);

    // LOAD CLASS
    useFocusEffect(
        useCallback(() => {
            const loadClass = async () => {
                const classes = await getClasses();
                const found = classes.find(
                    (c) => c.id === Number(params.classId)
                );

                if (found) {
                    setSelectedClass({
                        ...found,
                        students: found.students || [],
                        schedule: found.schedule || [],
                    });
                }
            };

            loadClass();
        }, [params.classId])
    );

    // SAVE
    const saveClassChanges = async (updatedClass: Class) => {
        const classes = await getClasses();
        const updatedClasses = classes.map((c) =>
            c.id === updatedClass.id ? updatedClass : c
        );
        await updateClasses(updatedClasses);
        setSelectedClass(updatedClass);
        setHasChanges(true);
    };

    // ADD STUDENT
    const addStudent = async () => {
        if (!newStudentName || !newStudentId || !selectedClass) return;

        const exists = selectedClass.students.some(
            (s) => String(s.student_id).trim().toLowerCase() === String(newStudentId).trim().toLowerCase()
        );

        if (exists) {
            Alert.alert("Duplicate", "A student with this ID already exists.");
            return;
        }

        const updatedClass = {
            ...selectedClass,
            students: [
                ...selectedClass.students,
                {
                    name: newStudentName.trim(),
                    student_id: newStudentId.trim(),
                    faceRegistered: false,
                },
            ],
            totalStudents: selectedClass.students.length + 1,
        };

        await saveClassChanges(updatedClass);
        setNewStudentName("");
        setNewStudentId("");
        Alert.alert("Success", `${newStudentName} added successfully`);
    };

    // REMOVE STUDENT
    const removeStudent = async (index: number) => {
        if (!selectedClass) return;

        const studentName = selectedClass.students[index].name;

        Alert.alert(
            "Remove Student",
            `Are you sure you want to remove ${studentName}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        const updatedStudents = selectedClass.students.filter(
                            (_, i) => i !== index
                        );

                        const updatedClass = {
                            ...selectedClass,
                            students: updatedStudents,
                            totalStudents: updatedStudents.length,
                        };

                        await saveClassChanges(updatedClass);
                    }
                }
            ]
        );
    };

    // ADD SCHEDULE
    const addSchedule = async () => {
        if (!newDay || !newTime || !selectedClass) return;

        const updatedClass = {
            ...selectedClass,
            schedule: [
                ...(selectedClass.schedule || []),
                {
                    day: newDay.toLowerCase().trim(),
                    time: newTime.trim(),
                },
            ],
        };

        await saveClassChanges(updatedClass);
        setNewDay("");
        setNewTime("");
    };

    // REMOVE SCHEDULE
    const removeSchedule = async (index: number) => {
        if (!selectedClass) return;

        const updatedSchedule = (selectedClass.schedule || []).filter(
            (_, i) => i !== index
        );

        const updatedClass = {
            ...selectedClass,
            schedule: updatedSchedule,
        };

        await saveClassChanges(updatedClass);
    };

    // NAVIGATE BACK WITH REFRESH
    const handleSaveAndGoBack = () => {
        router.push({
            pathname: "/classes/studentList",
            params: {
                classId: params.classId,
                refresh: Date.now().toString()
            }
        });
    };

    if (!selectedClass) {
        return (
            <View style={styles.center}>
                <Text>Loading class...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView 
                contentContainerStyle={{ paddingBottom: 30 }}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
            >
                {/* HEADER */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleSaveAndGoBack}>
                        <Ionicons name="arrow-back" size={24} color="#F96C1B" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Edit Class</Text>
                </View>

                {/* CLASS NAME */}
                <Text style={styles.className}>{selectedClass.name}</Text>

                {/* STUDENTS */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>👨‍🎓 Student List ({selectedClass.students.length})</Text>

                    {selectedClass.students.length === 0 ? (
                        <Text style={styles.emptyText}>No students added yet</Text>
                    ) : (
                        <FlatList
                            data={selectedClass.students}
                            keyExtractor={(item, index) => `${item.student_id}-${index}`}
                            renderItem={({ item, index }) => (
                                <View style={styles.row}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.studentName}>{item.name}</Text>
                                        <Text style={styles.studentId}>{item.student_id}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => removeStudent(index)}>
                                        <Text style={styles.remove}>Remove</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                            nestedScrollEnabled={true}
                            scrollEnabled={false}
                        />
                    )}

                    <View style={styles.inputTitleBox}>
                        <Text style={styles.inputTitle}>Add New Student</Text>
                        <TextInput
                            placeholder="Student Name"
                            value={newStudentName}
                            onChangeText={setNewStudentName}
                            style={styles.addInput}
                        />
                        <TextInput
                            placeholder="Student ID"
                            value={newStudentId}
                            onChangeText={setNewStudentId}
                            style={styles.addInput}
                        />
                        <TouchableOpacity onPress={addStudent} style={styles.addButton}>
                            <Text style={styles.addButtonText}>+ Add Student</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* SCHEDULE */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>📅 Academic Schedule</Text>

                    {(selectedClass.schedule || []).length === 0 ? (
                        <Text style={styles.emptyText}>No schedule set</Text>
                    ) : (
                        selectedClass.schedule?.map((s, index) => (
                            <View key={index} style={styles.row}>
                                <Text style={{ textTransform: 'capitalize' }}>
                                    {s.day} at {s.time}
                                </Text>
                                <TouchableOpacity onPress={() => removeSchedule(index)}>
                                    <Text style={styles.remove}>Remove</Text>
                                </TouchableOpacity>
                            </View>
                        ))
                    )}

                    <View style={styles.inputTitleBox}>
                        <Text style={styles.inputTitle}>Add Class Schedule</Text>
                        <TextInput
                            placeholder="Day (e.g. Monday)"
                            value={newDay}
                            onChangeText={setNewDay}
                            style={styles.addInput}
                        />
                        <TextInput
                            placeholder="Time (e.g. 10:00 AM)"
                            value={newTime}
                            onChangeText={setNewTime}
                            style={styles.addInput}
                        />
                        <TouchableOpacity onPress={addSchedule} style={styles.addButton}>
                            <Text style={styles.addButtonText}>+ Add Schedule</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* SAVE BUTTON */}
                <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSaveAndGoBack}
                >
                    <Ionicons name="checkmark-circle-outline" size={20} color="white" />
                    <Text style={styles.saveButtonText}>Save & Go Back</Text>
                </TouchableOpacity>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F3F4F6",
        paddingHorizontal: 15,
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    header: {
        marginTop: 50,
        marginBottom: 20,
        flexDirection: "row",
        alignItems: "center",
    },
    title: {
        marginLeft: 10,
        fontSize: 18,
        fontWeight: "bold",
        color: "#F96C1B",
    },
    className: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#F96C1B",
        marginBottom: 15,
    },
    card: {
        backgroundColor: "white",
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    sectionTitle: {
        fontWeight: "700",
        fontSize: 16,
        marginBottom: 20,
        color: "#F96C1B",
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 12,
        borderRadius: 10,
        backgroundColor: "#F9FAFB",
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#eee",
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
    emptyText: {
        textAlign: "center",
        color: "#999",
        paddingVertical: 20,
    },
    remove: {
        color: "#fff",
        backgroundColor: "#EF4444",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        fontSize: 12,
        fontWeight: "600",
        overflow: "hidden",
    },
    saveButton: {
        backgroundColor: "#F96C1B",
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 20,
        flexDirection: "row",
        justifyContent: "center",
        gap: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    saveButtonText: {
        color: "white",
        fontWeight: "700",
        fontSize: 16,
    },
    inputTitle: {
        color: "#F96C1B",
        fontWeight: "600",
        marginBottom: 10,
    },
    inputTitleBox: {
        alignItems: "center",
        justifyContent: "center",
        marginTop: 20,
        borderTopWidth: 1,
        borderTopColor: "#eee",
        paddingTop: 20,
    },
    addInput: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 10,
        padding: 12,
        marginTop: 10,
        backgroundColor: "#fff",
        width: "100%",
    },
    addButton: {
        marginTop: 12,
        backgroundColor: "#F96C1B",
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        width: "100%",
    },
    addButtonText: {
        color: "#fff",
        textAlign: "center",
        fontWeight: "600",
    },
});