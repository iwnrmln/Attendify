import React, { useState, useRef } from "react";
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    useWindowDimensions,
    Alert,
    TextInput,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktop = width > 768;
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const justRegistered = useRef(false);
    const { login, register, logout, user } = useAuth();

    React.useEffect(() => {
        if (user) {
            router.replace("/home");
        }
    }, [user]);

    const handleSubmit = async () => {
        if (!email || !password) {
            Alert.alert("Error", "Please enter email and password");
            return;
        }

        setIsLoading(true);

        try {
            if (isLogin) {
                await login(email, password);
            } else {
                await register(email, password);
                await logout();
                Alert.alert("Success", "Account created successfully! Please log in.");
                setEmail("");
                setPassword("");
                setIsLogin(true);
            }
        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={[styles.wrapper, isDesktop && styles.desktopWrapper]}>
                        <View style={styles.headerSection}>
                            <View style={styles.logoContainer}>
                                <Ionicons name="school" size={40} color="#F96C1B" />
                            </View>
                            <Text style={styles.titleText}>Attendify</Text>
                            <Text style={styles.subtitleText}>
                                KMUTT Facial Attendance System
                            </Text>
                        </View>

                        <View style={styles.loginCard}>
                            <Text style={styles.loginTitle}>
                                {isLogin ? "Welcome Back" : "Create Account"}
                            </Text>
                            <Text style={styles.loginSubtitle}>
                                {isLogin ? "Sign in to continue" : "Register to get started"}
                            </Text>

                            {/* Email Input */}
                            <View style={styles.inputContainer}>
                                <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Email"
                                    placeholderTextColor="#9CA3AF"
                                    
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    editable={!isLoading}
                                />
                            </View>

                            {/* Password Input */}
                            <View style={styles.inputContainer}>
                                <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Password (min 6 characters)"
                                    placeholderTextColor="#9CA3AF"
                                    secureTextEntry
                                    value={password}
                                    onChangeText={setPassword}
                                    editable={!isLoading}
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                                onPress={handleSubmit}
                                disabled={isLoading}
                                activeOpacity={0.8}
                            >
                                {isLoading ? (
                                    <>
                                        <ActivityIndicator color="white" size="small" />
                                        <Text style={styles.loginButtonText}>
                                            {isLogin ? "Logging in..." : "Creating account..."}
                                        </Text>
                                    </>
                                ) : (
                                    <>
                                        <Ionicons
                                            name={isLogin ? "log-in-outline" : "person-add-outline"}
                                            size={22}
                                            color="white"
                                        />
                                        <Text style={styles.loginButtonText}>
                                            {isLogin ? "Login" : "Register"}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.switchButton}
                                onPress={() => setIsLogin(!isLogin)}
                                disabled={isLoading}
                            >
                                <Text style={styles.switchButtonText}>
                                    {isLogin ? "Need an account? Register" : "Already have an account? Login"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F96C1B",
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: "center",
    },
    wrapper: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: "center",
    },
    desktopWrapper: {
        maxWidth: 450,
        alignSelf: "center",
        width: "100%",
    },
    headerSection: {
        alignItems: "center",
        marginBottom: 30,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#FFF5F0",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 15,
    },
    titleText: {
        fontSize: 32,
        fontWeight: "bold",
        color: "#FFF5F0",
    },
    subtitleText: {
        fontSize: 14,
        color: "#FFF5F0",
        marginTop: 4,
        opacity: 0.9,
    },
    loginCard: {
        backgroundColor: "white",
        borderRadius: 20,
        padding: 32,
    },
    loginTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#1A1A1A",
        textAlign: "center",
        marginBottom: 8,
    },
    loginSubtitle: {
        fontSize: 14,
        color: "#9CA3AF",
        textAlign: "center",
        marginBottom: 32,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
        paddingHorizontal: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    input: {
        flex: 1,
        paddingVertical: 14,
        paddingLeft: 12,
        fontSize: 16,
        color: "#1F2937",
    },
    loginButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F96C1B",
        paddingVertical: 16,
        borderRadius: 12,
        gap: 10,
        marginTop: 8,
    },
    loginButtonDisabled: {
        opacity: 0.6,
    },
    loginButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "600",
    },
    switchButton: {
        marginTop: 16,
        alignItems: "center",
    },
    switchButtonText: {
        color: "#F96C1B",
        fontSize: 14,
        fontWeight: "500",
    },
});