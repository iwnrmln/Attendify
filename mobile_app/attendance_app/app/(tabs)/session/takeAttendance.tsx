import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Image,
    Alert,
    Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useLocalSearchParams } from "expo-router";
import { getClasses, addSession, Class, Student } from "../../../data/store";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";

export default function TakeAttendance() {
    const router = useRouter();
    const [images, setImages] = useState<string[]>([]);
    const [moduleName, setModuleName] = useState("");
    const params = useLocalSearchParams<{
        classId?: string;
        className?: string;
    }>();
    const [className, setClassName] = useState<string>("");
    const [selectedClass, setSelectedClass] = useState<Class | null>(null);
    const total = selectedClass?.students.length || 0;
    const [loading, setLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState("");

    useEffect(() => {
        const loadClass = async () => {
            const classes = await getClasses();
            const found = classes.find(
                (c) => c.id === Number(params.classId)
            );
            if (found) {
                setSelectedClass(found);
                setClassName(found.name);
            }
        };
        loadClass();
    }, [params.classId]);

    const today = new Date();
    const formattedDate = today.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
    const formattedTime = today.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
    });

    const isFormValid = moduleName.trim() !== "" && images.length > 0;

    const unmirrorImage = async (imageUri: string) => {
        try {
            const manipResult = await ImageManipulator.manipulateAsync(
                imageUri,
                [{ flip: ImageManipulator.FlipType.Horizontal }],
                { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
            );
            return manipResult.uri;
        } catch (error) {
            console.error("Failed to unmirror image:", error);
            return imageUri; 
        }
    };

    const fixImageOrientation = async (imageUri: string) => {
        try {
            const manipResult = await ImageManipulator.manipulateAsync(
                imageUri,
                [], 
                { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
            );
            return manipResult.uri;
        } catch (error) {
            console.error("Failed to fix image orientation:", error);
            return imageUri;
        }
    };

    const handleImageCapture = async (result: ImagePicker.ImagePickerResult, isFrontCamera: boolean = false) => {
        if (!result.canceled && result.assets[0]) {
            let imageUri = result.assets[0].uri;

            // Process image based on camera type
            imageUri = await processImageForFaceDetection(imageUri, isFrontCamera);

            setImages((prev) => [...prev, imageUri]);
        }
    };

    // Modified takePhoto function
    const takePhoto = async () => {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) return;

        const result = await ImagePicker.launchCameraAsync({
            quality: 0.9, 
            allowsEditing: false,
            aspect: [4, 3],
            cameraType: ImagePicker.CameraType.back, 
            exif: true, 
        });

        if (!result.canceled) {
            const isFrontCamera = false;
            await handleImageCapture(result, isFrontCamera);
        }
    };

    // Modified pickImages function  
    const pickImages = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) return;

        const result = await ImagePicker.launchImageLibraryAsync({
            allowsMultipleSelection: true,
            quality: 0.7,
        });

        if (!result.canceled) {
            // Process each selected image
            const processedImages = await Promise.all(
                result.assets.map(async (asset) => {
                    return await fixImageOrientation(asset.uri);
                })
            );

            setImages((prev) => [...prev, ...processedImages]);
        }
    };

    const removeImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index));
    };

    // Compress images before upload
    const compressImages = async (imageUris: string[]) => {
        const compressedImages = [];
        for (const uri of imageUris) {
            try {
                const result = await ImageManipulator.manipulateAsync(
                    uri,
                    [{ resize: { width: 1280 } }],  // Smaller size = faster upload/processing
                    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
                );
                compressedImages.push(result.uri);
            } catch (error) {
                compressedImages.push(uri);
            }
        }
        return compressedImages;
    };

    const processImageForFaceDetection = async (imageUri: string, isFrontCamera: boolean = false) => {
        try {
            let processedUri = imageUri;
            processedUri = await fixImageOrientation(processedUri);

            // Only unmirror if front camera was used
            if (isFrontCamera) {
                processedUri = await unmirrorImage(processedUri);
            }

            // Enhance contrast slightly for better detection
            const enhancedUri = await ImageManipulator.manipulateAsync(
                processedUri,
                [], 
                { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
            );

            return enhancedUri.uri;
        } catch (error) {
            console.error("Failed to process image:", error);
            return imageUri;
        }
    };

    const normalizeBbox = (bbox: number[], imageWidth: number, imageHeight: number) => {
        if (!bbox || bbox.length !== 4) return null;

        let [x1, y1, x2, y2] = bbox;

        const maxCoord = Math.max(Math.abs(x1), Math.abs(y1), Math.abs(x2), Math.abs(y2));

        if (maxCoord <= 1.0) {
            if (x2 < 0 || y2 < 0) {
                return null;
            }

            if (x2 < x1 || y2 < y1) {
                const centerX = x1;
                const centerY = y1;
                const width = x2;
                const height = y2;

                x1 = centerX - width / 2;
                y1 = centerY - height / 2;
                x2 = centerX + width / 2;
                y2 = centerY + height / 2;
            }

            x1 = Math.round(x1 * imageWidth);
            y1 = Math.round(y1 * imageHeight);
            x2 = Math.round(x2 * imageWidth);
            y2 = Math.round(y2 * imageHeight);
        }

        if (x1 > x2) [x1, x2] = [x2, x1];
        if (y1 > y2) [y1, y2] = [y2, y1];

        if (x1 >= imageWidth || y1 >= imageHeight || x2 <= 0 || y2 <= 0) {
            return null;
        }

        x1 = Math.max(0, x1);
        y1 = Math.max(0, y1);
        x2 = Math.min(imageWidth, x2);
        y2 = Math.min(imageHeight, y2);

        if (x2 - x1 < 5 || y2 - y1 < 5) {
            return null;
        }

        return { x1, y1, x2, y2 };
    };

    const cropFaceFromBase64 = async (base64Image: string, bbox: number[]) => {
        try {
            if (!bbox || bbox.length !== 4) return null;

            let cleanBase64 = base64Image;
            if (cleanBase64.includes(',')) {
                cleanBase64 = cleanBase64.split(',')[1];
            }

            const tempDir = FileSystem.cacheDirectory + 'face_crops/';
            const dirInfo = await FileSystem.getInfoAsync(tempDir);
            if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
            }

            const tempFile = tempDir + `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;

            await FileSystem.writeAsStringAsync(tempFile, cleanBase64, {
                encoding: FileSystem.EncodingType.Base64,
            });

            // Get image dimensions without compression
            const imageInfo = await new Promise<{ width: number; height: number }>((resolve, reject) => {
                Image.getSize(
                    tempFile,
                    (width, height) => resolve({ width, height }),
                    (error) => reject(error)
                );
            });

            const normalizedBbox = normalizeBbox(bbox, imageInfo.width, imageInfo.height);
            if (!normalizedBbox) {
                await FileSystem.deleteAsync(tempFile, { idempotent: true });
                return null;
            }

            let { x1, y1, x2, y2 } = normalizedBbox;

            // Validate bounds
            if (x1 >= imageInfo.width || y1 >= imageInfo.height || x2 <= 0 || y2 <= 0) {
                await FileSystem.deleteAsync(tempFile, { idempotent: true });
                return null;
            }

            x1 = Math.max(0, Math.min(x1, imageInfo.width));
            y1 = Math.max(0, Math.min(y1, imageInfo.height));
            x2 = Math.max(0, Math.min(x2, imageInfo.width));
            y2 = Math.max(0, Math.min(y2, imageInfo.height));

            const faceWidth = x2 - x1;
            const faceHeight = y2 - y1;

            if (faceWidth <= 0 || faceHeight <= 0) {
                await FileSystem.deleteAsync(tempFile, { idempotent: true });
                return null;
            }

            // Add padding and ensure crop dimensions are valid
            const paddingX = Math.max(0, faceWidth * 0.15);
            const paddingY = Math.max(0, faceHeight * 0.15);

            let cropX = Math.max(0, Math.floor(x1 - paddingX));
            let cropY = Math.max(0, Math.floor(y1 - paddingY));
            let cropW = Math.floor(faceWidth + paddingX * 2);
            let cropH = Math.floor(faceHeight + paddingY * 2);

            // Ensure crop stays within image bounds
            if (cropX + cropW > imageInfo.width) cropW = imageInfo.width - cropX;
            if (cropY + cropH > imageInfo.height) cropH = imageInfo.height - cropY;

            // Ensure minimum crop size
            if (cropW < 30 || cropH < 30) {
                cropX = Math.max(0, Math.floor(x1));
                cropY = Math.max(0, Math.floor(y1));
                cropW = Math.min(faceWidth, imageInfo.width - cropX);
                cropH = Math.min(faceHeight, imageInfo.height - cropY);

                if (cropW < 10 || cropH < 10) {
                    await FileSystem.deleteAsync(tempFile, { idempotent: true });
                    return null;
                }
            }

            const croppedImage = await ImageManipulator.manipulateAsync(
                tempFile,
                [{ crop: { originX: cropX, originY: cropY, width: cropW, height: cropH } }],
                { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
            );

            await FileSystem.deleteAsync(tempFile, { idempotent: true }).catch(() => { });

            return { uri: croppedImage.uri, base64: null };
        } catch (error) {
            console.error("Failed to crop face:", error);
            return null;
        }
    };

    const handleProcessAttendance = async () => {
        if (!selectedClass || images.length === 0) return;

        if (images.length > 8) {
            Alert.alert(
                "Too Many Images",
                "Please select maximum 8 images for better performance. Current selection: " + images.length,
                [{ text: "OK" }]
            );
            return;
        }

        setLoading(true);
        setLoadingStep("Compressing images...");

        try {
            const compressedImages = await compressImages(images);
            setLoadingStep("Preparing upload...");

            const formData = new FormData();
            for (const img of compressedImages) {
                formData.append("image", {
                    uri: img,
                    name: "photo.jpg",
                    type: "image/jpeg",
                } as any);
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
            }, 180000);

            setLoadingStep("Uploading and processing faces...");
            console.log("📤 Sending request to server...");

            const res = await fetch("http://10.4.148.17:5000/detect-faces", {
                method: "POST",
                body: formData,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!res.ok) {
                throw new Error(`Server error: ${res.status}`);
            }

            setLoadingStep("Processing results...");
            const apiResponse = await res.json();
            const data = apiResponse?.data || {};
            const serverResults = data?.results || [];
            const originalImages = data?.original_images || [];

            const totalFacesDetected = data?.total_faces || serverResults.length;
            const serverMatched = data?.matched || 0;
            const serverUnmatched = data?.unmatched || 0;

            console.log(`📊 Server results: ${totalFacesDetected} total faces, ${serverMatched} matched, ${serverUnmatched} unmatched`);

            const validStudentIds = new Set(
                selectedClass.students.map(s => String(s.student_id).trim().toLowerCase())
            );

            const knownResults = serverResults.filter((r: any) => {
                const isHighConfidence = (r.confidence || 0) >= 0.60;
                const hasIdentity = r.identity?.identity_code;

                if (!hasIdentity) return false;

                const studentId = String(r.identity.identity_code).trim().toLowerCase();
                const isValidStudent = validStudentIds.has(studentId);

                if (isValidStudent && isHighConfidence && !r.match_found) {
                    console.log(`🔶 NEAR-MATCH: ${r.identity.display_name} (${(r.confidence * 100).toFixed(1)}%) - accepting`);
                }

                return isValidStudent && (r.match_found || isHighConfidence);
            });

            const unknownResults = serverResults.filter((r: any) => !r.match_found);

            console.log(`📊 After filtering: ${knownResults.length} known, ${unknownResults.length} unknown`);

            if (knownResults.length === 0 && serverResults.some((r: any) => r.match_found)) {
                console.warn("⚠️ Faces matched but none belong to this class!");
                serverResults.filter((r: any) => r.match_found).forEach((r: any) => {
                    console.log(`   Matched: ${r.identity?.display_name} (${r.identity?.identity_code})`);
                });
                console.log("   Valid IDs:", [...validStudentIds]);
            }

            setLoadingStep("Processing unknown faces...");

            // Unknown students
            const unknownStudents = unknownResults.map((r: any) => ({
                name: "Unknown",
                student_id: `unknown_${r.image_index}_${r.face_index}`,
                status: "Unknown" as const,
                confidence: r.confidence,
                detectionScore: r.det_score,
                image_index: r.image_index,
                face_index: r.face_index,
                bbox: r.bbox,
                original_image_index: r.image_index,
            }));

            // Process known students with face cropping
            const uniqueStudentsMap = new Map();
            let duplicateCount = 0;

            const duplicateFacesData: any[] = [];

            for (const r of knownResults) {
                if (r.match_found === true && r.identity?.identity_code) {
                    const studentId = String(r.identity.identity_code).trim();
                    const confidence = r.confidence || 0;

                    let faceImage = null;
                    try {
                        if (r.bbox && originalImages[r.image_index]) {
                            const cropped = await cropFaceFromBase64(
                                originalImages[r.image_index],
                                r.bbox
                            );
                            faceImage = cropped?.uri || cropped?.base64;
                        }
                    } catch (cropError) {
                        console.log(`⚠️ Failed to crop face for ${studentId}:`, cropError);
                    }

                    if (uniqueStudentsMap.has(studentId)) {
                        duplicateCount++;
                        continue;

                    } else {
                        uniqueStudentsMap.set(studentId, {
                            name: r.identity.display_name || "Unknown",
                            student_id: studentId,
                            status: "Present",
                            confidence: confidence,
                            detectionScore: r.det_score,
                            face_image: faceImage,
                        });
                    }
                }
            }

            const uniquePresentStudents = Array.from(uniqueStudentsMap.values());

            console.log(`📊 Final: ${uniquePresentStudents.length} unique present students (${duplicateCount} duplicates removed)`);

            // Find absent students
            const presentIds = new Set(
                uniquePresentStudents.map(s => String(s.student_id).trim().toLowerCase())
            );

            const absentStudents = selectedClass.students
                .filter(s => !presentIds.has(String(s.student_id).trim().toLowerCase()))
                .map(s => ({
                    name: s.name,
                    student_id: s.student_id,
                    status: "Absent" as const,
                }));

            const finalResults = [
                ...uniquePresentStudents,
                ...absentStudents,
                ...unknownStudents,
            ];

            const session = {
                id: Date.now(),
                classId: selectedClass.id,
                className: selectedClass.name,
                moduleName: moduleName,
                date: formattedDate,
                time: formattedTime,
                totalStudents: total,
                presentCount: uniquePresentStudents.length,
                absentCount: absentStudents.length,
                unknownStudents: unknownStudents.length,
                totalFacesDetected: totalFacesDetected,  // 🔥 Use server count
                uniqueFacesDetected: uniquePresentStudents.length + unknownStudents.length,
                duplicateFaces: duplicateCount,
                duplicateFacesData: duplicateFacesData,
                results: finalResults,
                images: images,
                image: images[0],
            };

            console.log("📊 Session saved:", {
                totalFaces: session.totalFacesDetected,
                present: session.presentCount,
                absent: session.absentCount,
                unknown: session.unknownStudents,
                duplicates: session.duplicateFaces,
            });

            await addSession(session);

            router.replace({
                pathname: "/session/attendanceResults",
                params: { sessionId: session.id.toString() },
            });

        } catch (error: any) {
            console.error("Error processing attendance:", error);

            let errorMessage = "Failed to process attendance. Please try again.";

            if (error.name === 'AbortError') {
                errorMessage = "Request timed out. The server is taking too long to respond.\n\nSuggestions:\n• Try with fewer images (max 5-6)\n• Check your network connection\n• Ensure the server is responding";
            } else if (error.message?.includes('Network request failed')) {
                errorMessage = "Unable to connect to server. Please check:\n• Your phone and computer are on the same network\n• The server is running (node face.js)\n• The IP address is correct\n• Firewall isn't blocking the connection";
            } else if (error.message?.includes('500')) {
                errorMessage = "Server error occurred. Please check if the face detection server is running properly.";
            } else {
                errorMessage = `Error: ${error.message || "Unknown error occurred"}`;
            }

            Alert.alert("Error", errorMessage);
        } finally {
            setLoading(false);
            setLoadingStep("");
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
                        onPress={() => router.push("/(tabs)/classes/classSelection")}
                    >
                        <Ionicons name="arrow-back" size={24} color="#F96C1B" />
                    </TouchableOpacity>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>Take Attendance</Text>
                        <Text style={styles.headerSubtitle}>
                            {selectedClass ? `${selectedClass.students.length} students` : 'Loading...'}
                        </Text>
                    </View>
                </View>

                {/* Class Info Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={styles.cardIconContainer}>
                            <Ionicons name="school-outline" size={20} color="#F96C1B" />
                        </View>
                        <Text style={styles.cardTitle}>Class Information</Text>
                    </View>

                    <View style={styles.infoGrid}>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Programme</Text>
                            <View style={styles.infoValueContainer}>
                                <Ionicons name="book-outline" size={16} color="#9CA3AF" />
                                <Text style={styles.infoValue}>{className || "Not selected"}</Text>
                            </View>
                        </View>

                        <View style={styles.infoDivider} />

                        <View style={styles.infoRow}>
                            <View style={[styles.infoItem, { flex: 1 }]}>
                                <Text style={styles.infoLabel}>Date</Text>
                                <View style={styles.infoValueContainer}>
                                    <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
                                    <Text style={styles.infoValue}>{formattedDate}</Text>
                                </View>
                            </View>
                            <View style={styles.infoVerticalDivider} />
                            <View style={[styles.infoItem, { flex: 1 }]}>
                                <Text style={styles.infoLabel}>Time</Text>
                                <View style={styles.infoValueContainer}>
                                    <Ionicons name="time-outline" size={16} color="#9CA3AF" />
                                    <Text style={styles.infoValue}>{formattedTime}</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.infoDivider} />

                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Module Name</Text>
                            <TextInput
                                style={styles.moduleInput}
                                value={moduleName}
                                onChangeText={setModuleName}
                                placeholder="Enter module name"
                                placeholderTextColor="#D1D5DB"
                            />
                        </View>
                    </View>
                </View>

                {/* Upload Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={styles.cardIconContainer}>
                            <Ionicons name="images-outline" size={20} color="#F96C1B" />
                        </View>
                        <Text style={styles.cardTitle}>Upload Photos</Text>
                        {images.length > 0 && (
                            <View style={styles.photoCountBadge}>
                                <Text style={styles.photoCountText}>{images.length}</Text>
                            </View>
                        )}
                    </View>

                    {/* Upload Area */}
                    <TouchableOpacity style={styles.uploadArea} onPress={pickImages}>
                        <View style={styles.uploadIconContainer}>
                            <Ionicons name="cloud-upload-outline" size={40} color="#F96C1B" />
                        </View>
                        <Text style={styles.uploadTitle}>Upload Classroom Images</Text>
                        <Text style={styles.uploadSubtitle}>
                            Tap to select multiple photos from gallery (max 8)
                        </Text>
                    </TouchableOpacity>

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                        <TouchableOpacity style={styles.galleryButton} onPress={pickImages}>
                            <Ionicons name="images-outline" size={20} color="white" />
                            <Text style={styles.actionButtonText}>Gallery</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.cameraButton} onPress={takePhoto}>
                            <Ionicons name="camera-outline" size={20} color="white" />
                            <Text style={styles.actionButtonText}>Camera</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Image Preview */}
                    {images.length > 0 && (
                        <View style={styles.previewSection}>
                            <Text style={styles.previewTitle}>
                                Selected Photos ({images.length}/8)
                            </Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.previewScroll}
                            >
                                {images.map((uri, index) => (
                                    <View key={index} style={styles.previewItem}>
                                        <Image source={{ uri }} style={styles.previewImage} />
                                        <TouchableOpacity
                                            style={styles.removeButton}
                                            onPress={() => removeImage(index)}
                                        >
                                            <Ionicons name="close-circle" size={22} color="#EF4444" />
                                        </TouchableOpacity>
                                        <View style={styles.imageIndexBadge}>
                                            <Text style={styles.imageIndexText}>{index + 1}</Text>
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    )}
                </View>

                {/* Loading Indicator */}
                {loading && (
                    <View style={styles.loadingCard}>
                        <View style={styles.loadingContent}>
                            <View style={styles.loadingSpinner}>
                                <Ionicons name="sync-outline" size={24} color="#F96C1B" />
                            </View>
                            <View style={styles.loadingTextContainer}>
                                <Text style={styles.loadingTitle}>Processing Images</Text>
                                <Text style={styles.loadingSubtitle}>
                                    {loadingStep || "Detecting and verifying faces..."}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.loadingBar}>
                            <View style={[styles.loadingBarFill, { width: "60%" }]} />
                        </View>
                    </View>
                )}

                {/* Submit Button */}
                <TouchableOpacity
                    style={[
                        styles.submitButton,
                        (!isFormValid || images.length > 8) && styles.submitButtonDisabled,
                        loading && styles.submitButtonLoading
                    ]}
                    disabled={!isFormValid || loading || images.length > 8}
                    onPress={handleProcessAttendance}
                >
                    <Ionicons
                        name={loading ? "sync-outline" : "checkmark-circle-outline"}
                        size={22}
                        color="white"
                    />
                    <Text style={styles.submitButtonText}>
                        {loading ? "Processing..." : "Process Attendance"}
                    </Text>
                </TouchableOpacity>

                {images.length > 8 && (
                    <Text style={styles.warningText}>
                        Please reduce the number of images to 8 or less
                    </Text>
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
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 10,
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
        fontSize: 22,
        fontWeight: "bold",
        color: "#1A1A1A",
    },
    headerSubtitle: {
        fontSize: 13,
        color: "#6B7280",
        marginTop: 2,
    },

    card: {
        backgroundColor: "white",
        borderRadius: 16,
        marginHorizontal: 20,
        marginTop: 20,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
        gap: 10,
    },
    cardIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: "#FFF5F0",
        alignItems: "center",
        justifyContent: "center",
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: "bold",
        color: "#1A1A1A",
        flex: 1,
    },
    photoCountBadge: {
        backgroundColor: "#F96C1B",
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    photoCountText: {
        color: "white",
        fontSize: 12,
        fontWeight: "bold",
    },

    infoGrid: {
        gap: 15,
    },
    infoItem: {
        gap: 6,
    },
    infoRow: {
        flexDirection: "row",
        gap: 15,
    },
    infoLabel: {
        fontSize: 12,
        fontWeight: "600",
        color: "#6B7280",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    infoValueContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "#F9FAFB",
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    infoValue: {
        fontSize: 15,
        color: "#1F2937",
        fontWeight: "500",
    },
    infoDivider: {
        height: 1,
        backgroundColor: "#F3F4F6",
    },
    infoVerticalDivider: {
        width: 1,
        backgroundColor: "#F3F4F6",
    },
    moduleInput: {
        backgroundColor: "#F9FAFB",
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: "#1F2937",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },

    uploadArea: {
        borderWidth: 2,
        borderColor: "#FED7AA",
        borderStyle: "dashed",
        borderRadius: 16,
        padding: 30,
        alignItems: "center",
        backgroundColor: "#FFF7ED",
        marginBottom: 15,
    },
    uploadIconContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: "white",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 15,
        shadowColor: "#F96C1B",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    uploadTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 4,
    },
    uploadSubtitle: {
        fontSize: 13,
        color: "#9CA3AF",
    },

    actionButtons: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 20,
    },
    galleryButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F96C1B",
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
        shadowColor: "#F96C1B",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    cameraButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#1F2937",
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    actionButtonText: {
        color: "white",
        fontSize: 15,
        fontWeight: "600",
    },

    previewSection: {
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
        paddingTop: 15,
    },
    previewTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#6B7280",
        marginBottom: 12,
    },
    previewScroll: {
        gap: 10,
    },
    previewItem: {
        width: 100,
        height: 100,
        borderRadius: 12,
        marginRight: 10,
        position: "relative",
    },
    previewImage: {
        width: "100%",
        height: "100%",
        borderRadius: 12,
    },
    removeButton: {
        position: "absolute",
        top: -8,
        right: -8,
        backgroundColor: "white",
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    imageIndexBadge: {
        position: "absolute",
        bottom: 8,
        left: 8,
        backgroundColor: "rgba(0,0,0,0.6)",
        borderRadius: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    imageIndexText: {
        color: "white",
        fontSize: 10,
        fontWeight: "bold",
    },

    loadingCard: {
        backgroundColor: "white",
        borderRadius: 16,
        marginHorizontal: 20,
        marginTop: 20,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    loadingContent: {
        flexDirection: "row",
        alignItems: "center",
        gap: 15,
        marginBottom: 15,
    },
    loadingSpinner: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#FFF5F0",
        alignItems: "center",
        justifyContent: "center",
    },
    loadingTextContainer: {
        flex: 1,
    },
    loadingTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
    },
    loadingSubtitle: {
        fontSize: 13,
        color: "#6B7280",
        marginTop: 2,
    },
    loadingBar: {
        height: 4,
        backgroundColor: "#F3F4F6",
        borderRadius: 2,
        overflow: "hidden",
    },
    loadingBarFill: {
        width: "60%",
        height: "100%",
        backgroundColor: "#F96C1B",
        borderRadius: 2,
    },

    submitButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F96C1B",
        marginHorizontal: 20,
        marginTop: 25,
        paddingVertical: 18,
        borderRadius: 14,
        gap: 10,
        shadowColor: "#F96C1B",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    submitButtonDisabled: {
        backgroundColor: "#FCA5A5",
        shadowOpacity: 0,
    },
    submitButtonLoading: {
        backgroundColor: "#FB923C",
    },
    submitButtonText: {
        color: "white",
        fontSize: 17,
        fontWeight: "700",
    },
    warningText: {
        color: "#EF4444",
        fontSize: 12,
        textAlign: "center",
        marginTop: 10,
        marginHorizontal: 20,
    },
});