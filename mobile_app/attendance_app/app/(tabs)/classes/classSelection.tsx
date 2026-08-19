import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getClasses, Class } from "../../../data/store";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

export default function ClassSelection() {
    const router = useRouter();
    const [classes, setClasses] = useState<Class[]>([]);

    useFocusEffect(
        useCallback(() => {
            const loadClasses = async () => {
                const data = await getClasses();
                setClasses(data);
            };

            loadClasses();
        }, [])
    );

    // Empty State
    if (classes.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color="#F96C1B" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Please select a class:</Text>
                </View>

                <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>No classes found</Text>

                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => router.push("/classes/createClass")}
                    >
                        <Text style={styles.buttonText}>Register Class Now</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#F96C1B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Please select a class:</Text>
            </View>

            <FlatList
                data={classes}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.card}
                        onPress={() =>
                            router.push({
                                pathname: "/(tabs)/session/takeAttendance",
                                params: {
                                    classId: item.id,
                                    className: item.name,
                                },
                            })
                        }
                    >
                        <Text style={styles.cardTitle}>{item.name}</Text>
                        <Text style={styles.cardSub}>
                            Students: {item.totalStudents}
                        </Text>
                    </TouchableOpacity>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: "#F5F5F5",
    },

    header: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 50,
        marginBottom: 30,
    },

    headerTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#F96C1B",
        marginLeft: 15,
        
    },
    card: {
        backgroundColor: "#FFF",
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        elevation: 2,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: "#FF6B00",
    },
    cardSub: {
        marginTop: 4,
        fontSize: 12,
        color: "#555",
    },
    emptyBox: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    emptyText: {
        marginBottom: 20,
        fontSize: 14,
        color: "#777",
    },
    button: {
        backgroundColor: "#FF6B00",
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 20,
    },
    buttonText: {
        color: "#FFF",
        fontWeight: "600",
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "white",
    },
});