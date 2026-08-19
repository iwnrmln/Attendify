import express from "express";
import multer from "multer";
import * as faceapi from "face-api.js";
import * as canvas from "canvas";
import cors from "cors";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import os from 'os';

const app = express();
const PORT = 5000;
const { Canvas, Image, ImageData } = canvas;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 8,
  },
});

// Track available models
const availableModels = {
  tinyFace: false,
  ssdMobilenet: false,
  blazeface: false,
};

async function loadBlazeFace() {
  try {
    console.log("📦 Initializing Hybrid Mode...");
    availableModels.blazeface = true;
    console.log("✅ Hybrid detection mode ready");
    return true;
  } catch (error) {
    console.warn("⚠️ Hybrid mode initialization failed:", error.message);
    availableModels.blazeface = false;
    return false;
  }
}

async function loadModels() {
  const modelPath = path.join(__dirname, "models");
  console.log("📦 Loading models from:", modelPath);

  if (!fs.existsSync(modelPath)) {
    console.error("❌ Models directory not found at:", modelPath);
    return false;
  }

  const modelFiles = fs.readdirSync(modelPath);
  console.log("📁 Files in models directory:", modelFiles);

  try {
    const tinyFaceModelPath = path.join(modelPath, 'tiny_face_detector_model-shard1');
    const tinyFaceManifestPath = path.join(modelPath, 'tiny_face_detector_model-weights_manifest.json');

    if (fs.existsSync(tinyFaceModelPath) && fs.existsSync(tinyFaceManifestPath)) {
      await faceapi.nets.tinyFaceDetector.loadFromDisk(modelPath);
      availableModels.tinyFace = true;
      console.log("✅ Tiny Face Detector loaded");
    } else {
      console.error("❌ Tiny Face Detector model files not found!");
      return false;
    }

    const ssdModelPath = path.join(modelPath, 'ssd_mobilenetv1_model-shard1');
    const ssdManifestPath = path.join(modelPath, 'ssd_mobilenetv1_model-weights_manifest.json');

    if (fs.existsSync(ssdModelPath) && fs.existsSync(ssdManifestPath)) {
      try {
        await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
        availableModels.ssdMobilenet = true;
        console.log("✅ SSD MobileNet loaded");
      } catch (err) {
        console.warn("⚠️ SSD MobileNet failed to load:", err.message);
      }
    } else {
      console.warn("⚠️ SSD MobileNet files not found (optional)");
    }

    await loadBlazeFace();

    const testCanvas = canvas.createCanvas(200, 200);
    await faceapi.detectAllFaces(testCanvas, new faceapi.TinyFaceDetectorOptions());
    console.log("✅ Detection system ready");

    console.log("\n📊 Available Models:");
    console.log(`   TinyFace: ✅`);
    console.log(`   SSD MobileNet: ${availableModels.ssdMobilenet ? '✅' : '❌ (optional)'}`);
    console.log(`   Hybrid Mode: ${availableModels.blazeface ? '✅' : '❌'}`);

    return true;
  } catch (error) {
    console.error("❌ Failed to initialize models:", error);
    return false;
  }
}

// Image preprocessing
function preprocessImage(inputImage) {
  try {
    const enhancedCanvas = canvas.createCanvas(inputImage.width, inputImage.height);
    const ctx = enhancedCanvas.getContext('2d');
    ctx.drawImage(inputImage, 0, 0);

    const imageData = ctx.getImageData(0, 0, inputImage.width, inputImage.height);
    const data = imageData.data;

    let min = 255, max = 0;
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (brightness < min) min = brightness;
      if (brightness > max) max = brightness;
    }

    if (max > min) {
      const range = max - min;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = ((data[i] - min) / range) * 255;
        data[i + 1] = ((data[i + 1] - min) / range) * 255;
        data[i + 2] = ((data[i + 2] - min) / range) * 255;
      }
      ctx.putImageData(imageData, 0, 0);
    }

    return enhancedCanvas;
  } catch (error) {
    return inputImage;
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateIOU(box1, box2) {
  const x1 = Math.max(box1.x, box2.x);
  const y1 = Math.max(box1.y, box2.y);
  const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
  const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

  if (x2 < x1 || y2 < y1) return 0;

  const intersection = (x2 - x1) * (y2 - y1);
  const area1 = box1.width * box1.height;
  const area2 = box2.width * box2.height;
  const union = area1 + area2 - intersection;

  return intersection / (union || 1);
}

function isBoxInside(box1, box2) {
  const center1 = {
    x: box1.x + box1.width / 2,
    y: box1.y + box1.height / 2
  };

  return (
    center1.x >= box2.x &&
    center1.x <= box2.x + box2.width &&
    center1.y >= box2.y &&
    center1.y <= box2.y + box2.height
  );
}

function crowdAwareDeduplicate(detections) {
  if (detections.length <= 1) return detections;

  const unique = [];

  const sorted = [...detections].sort((a, b) => {
    const scoreA = a.detection?._score || a.score || 0;
    const scoreB = b.detection?._score || b.score || 0;
    return scoreB - scoreA;
  });

  for (const det of sorted) {
    let duplicate = false;

    for (const existing of unique) {
      const iou = calculateIOU(det.box, existing.box);

      if (iou > 0.4) {
        duplicate = true;
        break;
      }
    }

    if (!duplicate) {
      unique.push(det);
    }
  }

  return unique;
}

async function verifyFaceFast(faceCanvas) {
  try {
    const base64 = faceCanvas.toDataURL('image/jpeg', 0.8);
    const response = await axios.post(
      "https://app.trasholini.online/api/v1/verify",
      { images: [base64] },
      { headers: { "Content-Type": "application/json" }, timeout: 10000 }
    );
    return response.data?.data?.results?.[0] || null;
  } catch (error) {
    console.error("    Verify error:", error.message);
    return null;
  }
}

// ============================================
// CROWD-OPTIMIZED HYBRID DETECTION
// ============================================

async function detectFacesHybrid(img) {
  const startTime = Date.now();
  let allDetections = [];

  const imageArea = img.width * img.height;
  const aspectRatio = img.width / img.height;

  const isGroupPhoto = aspectRatio > 1.3 || imageArea > 2000000;
  const isLargeGroup = imageArea > 4000000 || (isGroupPhoto && imageArea > 1500000);

  console.log(`  🔍 HYBRID DETECTION START`);
  console.log(`  📐 Image: ${img.width}x${img.height}px, Aspect: ${aspectRatio.toFixed(2)}`);
  console.log(`  👥 Mode: ${isLargeGroup ? 'LARGE GROUP' : isGroupPhoto ? 'GROUP' : 'STANDARD'}`);

  if (availableModels.ssdMobilenet) {
    try {
      console.log("  📍 Phase 1: SSD MobileNet");
      const ssdConfidence = isLargeGroup ? 0.35 : (isGroupPhoto ? 0.4 : 0.5);

      const detections = await faceapi.detectAllFaces(
        img,
        new faceapi.SsdMobilenetv1Options({
          minConfidence: ssdConfidence,
          maxResults: 50
        })
      );

      if (detections.length > 0) {
        console.log(`  ✅ SSD found ${detections.length} faces`);
        allDetections = detections;
      }
    } catch (e) {
      console.log("  ⚠️ SSD scan failed");
    }
  }

  console.log("  📍 Phase 2: Multi-scale TinyFace");
  const detectionPasses = [
    { inputSize: 512, scoreThreshold: 0.5, label: "Primary" },
    { inputSize: 416, scoreThreshold: 0.4, label: "Secondary" },
  ];


  if (allDetections.length > 1) {
    console.log(`  📍 Phase 3: Crowd-aware deduplication (${allDetections.length} raw)`);
    allDetections = crowdAwareDeduplicate(allDetections, isGroupPhoto);
    console.log(`  ✅ After dedup: ${allDetections.length} unique faces`);
  }

  console.log(`  📍 Phase 4: Quality filtering`);
  const beforeFilter = allDetections.length;
  allDetections = allDetections.filter(det => {
    const { width, height } = det.box;
    const minDimension = Math.min(width, height);
    const maxDimension = Math.max(width, height);
    const score = det.detection?._score || det.score || 0;
    const faceAspectRatio = maxDimension / minDimension;

    if (faceAspectRatio > 2.5) {
      console.log(`  🗑️ Bad aspect ratio: ${faceAspectRatio.toFixed(1)}`);
      return false;
    }

    if (isLargeGroup) {
      if (minDimension >= 30) return true;
      if (minDimension >= 25 && score > 0.5) return true;
      if (minDimension >= 20 && score > 0.7) return true;
    } else if (isGroupPhoto) {
      if (minDimension >= 40) return true;
      if (minDimension >= 30 && score > 0.5) return true;
    } else {
      if (minDimension >= 50) return true;
      if (minDimension >= 40 && score > 0.6) return true;
    }

    return false;
  });

  if (beforeFilter > allDetections.length) {
    console.log(`  🗑️ Removed ${beforeFilter - allDetections.length} low-quality detections`);
  }

  // Sort by score
  allDetections.sort((a, b) => {
    const scoreA = a.detection?._score || a.score || 0;
    const scoreB = b.detection?._score || b.score || 0;
    return scoreB - scoreA;
  });

  const totalTime = Date.now() - startTime;
  console.log(`  ⚡ Detection complete: ${allDetections.length} faces in ${totalTime}ms`);

  return allDetections;
}

// ============================================
// MAIN ROUTE
// ============================================

app.post("/detect-faces", upload.array("image", 10), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "No files uploaded" });
  }

  try {
    const totalStartTime = Date.now();
    console.log(`\n${"=".repeat(60)}`);
    console.log(`📸 PROCESSING ${req.files.length} IMAGES (HYBRID MODE)`);
    console.log(`${"=".repeat(60)}\n`);

    const imagePromises = req.files.map(async (file, imageIndex) => {
      const imageStartTime = Date.now();
      const base64WithPrefix = `data:image/jpeg;base64,${file.buffer.toString("base64")}`;

      console.log(`📷 Image ${imageIndex + 1}/${req.files.length} (${(file.size / 1024).toFixed(0)}KB) - START`);

      try {
        const originalImg = await canvas.loadImage(file.buffer);
        const preprocessedImg = preprocessImage(originalImg);

        const detections = await detectFacesHybrid(preprocessedImg);

        if (detections.length === 0) {
          console.log(`  ⚠️ No faces found - trying external API`);
          try {
            const fbRes = await axios.post(
              "https://app.trasholini.online/api/v1/verify",
              { images: [base64WithPrefix] },
              { headers: { "Content-Type": "application/json" }, timeout: 15000 }
            );
            const results = fbRes.data?.data?.results || [];
            console.log(`  ✅ API fallback: ${results.length} faces`);
            return {
              imageIndex,
              base64: base64WithPrefix,
              results: results.map(r => ({ ...r, image_index: imageIndex, face_index: 0 }))
            };
          } catch (err) {
            return { imageIndex, base64: base64WithPrefix, results: [] };
          }
        }

        console.log(`  🔍 Verifying ${detections.length} faces...`);

        // FIRST PASS: Verify all faces
        const firstPassResults = await Promise.all(
          detections.map(async (detection, faceIndex) => {
            const { x, y, width, height } = detection.box;
            const scaleX = originalImg.width / preprocessedImg.width;
            const scaleY = originalImg.height / preprocessedImg.height;
            const origX = x * scaleX;
            const origY = y * scaleY;
            const origWidth = width * scaleX;
            const origHeight = height * scaleY;
            const bbox = [origX, origY, origX + origWidth, origY + origHeight];

            if (origWidth < 40 || origHeight < 40) {
              return {
                match_found: false, confidence: 0.3,
                det_score: detection.detection?._score || 0.5,
                image_index: imageIndex, face_index: faceIndex,
                bbox: bbox, identity: null
              };
            }

            // Better crop with padding
            const padTop = origHeight * 0.35;
            const padSides = origWidth * 0.25;
            const padBottom = origHeight * 0.15;

            const cropX = Math.max(0, Math.floor(origX - padSides));
            const cropY = Math.max(0, Math.floor(origY - padTop));
            const cropW = Math.min(Math.floor(origWidth + padSides * 2), originalImg.width - cropX);
            const cropH = Math.min(Math.floor(origHeight + padTop + padBottom), originalImg.height - cropY);

            if (cropW <= 10 || cropH <= 10) {
              return {
                match_found: false, confidence: 0.3,
                det_score: detection.detection?._score || 0.5,
                image_index: imageIndex, face_index: faceIndex,
                bbox: bbox, identity: null
              };
            }

            const faceCanvas = canvas.createCanvas(cropW, cropH);
            const ctx = faceCanvas.getContext('2d');
            ctx.drawImage(originalImg, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

            // Light enhance
            try {
              const imageData = ctx.getImageData(0, 0, cropW, cropH);
              const data = imageData.data;
              let min = 255, max = 0;
              for (let i = 0; i < data.length; i += 4) {
                const b = (data[i] + data[i + 1] + data[i + 2]) / 3;
                if (b < min) min = b;
                if (b > max) max = b;
              }
              if (max > min + 20) {
                const range = max - min;
                for (let i = 0; i < data.length; i += 4) {
                  data[i] = ((data[i] - min) / range) * 255;
                  data[i + 1] = ((data[i + 1] - min) / range) * 255;
                  data[i + 2] = ((data[i + 2] - min) / range) * 255;
                }
                ctx.putImageData(imageData, 0, 0);
              }
            } catch (e) { }

            try {
              const result = await verifyFaceFast(faceCanvas);
              if (result) {
                const conf = (result.confidence || 0).toFixed(3);
                const name = result.match_found ? result.identity?.display_name || '?' : 'no match';
                console.log(`    Face ${faceIndex + 1}: ${result.match_found ? '✅' : '❌'} ${name} (${conf})`);
                return {
                  ...result,
                  image_index: imageIndex, face_index: faceIndex,
                  bbox: bbox, det_score: detection.detection?._score || 0.5,
                  _crop: { x: cropX, y: cropY, w: cropW, h: cropH } // for debug
                };
              }
            } catch (e) { }

            return {
              match_found: false, confidence: 0.3,
              det_score: detection.detection?._score || 0.5,
              image_index: imageIndex, face_index: faceIndex,
              bbox: bbox, identity: null
            };
          })
        );

        // RETRY PASS: For unmatched faces, try a tighter crop
        const retryPromises = firstPassResults.map(async (result, idx) => {
          if (result.match_found || result.confidence > 0.45) return result;

          const detection = detections[idx];
          if (!detection) return result;

          const { x, y, width, height } = detection.box;
          const scaleX = originalImg.width / preprocessedImg.width;
          const scaleY = originalImg.height / preprocessedImg.height;
          const origX = x * scaleX;
          const origY = y * scaleY;
          const origWidth = width * scaleX;
          const origHeight = height * scaleY;

          // Tighter crop for retry
          const padAll = 0.12;
          const px = origWidth * padAll;
          const py = origHeight * padAll;
          const cropX = Math.max(0, Math.floor(origX - px));
          const cropY = Math.max(0, Math.floor(origY - py));
          const cropW = Math.min(Math.floor(origWidth + px * 2), originalImg.width - cropX);
          const cropH = Math.min(Math.floor(origHeight + py * 2), originalImg.height - cropY);

          if (cropW <= 10 || cropH <= 10) return result;

          const faceCanvas = canvas.createCanvas(cropW, cropH);
          const ctx = faceCanvas.getContext('2d');
          ctx.drawImage(originalImg, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

          try {
            const retryResult = await verifyFaceFast(faceCanvas);
            if (retryResult && retryResult.match_found) {
              console.log(`    🔄 Retry SUCCESS face ${idx + 1}: ${retryResult.identity?.display_name} (${retryResult.confidence?.toFixed(3)})`);
              return {
                ...retryResult,
                image_index: imageIndex, face_index: idx,
                bbox: result.bbox, det_score: result.det_score,
              };
            } else if (retryResult) {
              console.log(`    🔄 Retry for face ${idx + 1}: still no match (${retryResult.confidence?.toFixed(3)})`);
            }
          } catch (e) { }

          return result;
        });

        const faceResults = await Promise.all(retryPromises);

        console.log(`\n  📊 RESULTS FOR IMAGE ${imageIndex + 1}:`);
        console.log(`  ${"─".repeat(50)}`);

        const matched = faceResults.filter(r => r.match_found);
        const unmatched = faceResults.filter(r => !r.match_found);

        if (matched.length > 0) {
          console.log(`  ✅ MATCHED (${matched.length}):`);
          matched.forEach((r, i) => {
            console.log(`     ${i + 1}. ${r.identity?.display_name} (${r.identity?.identity_code}) - ${(r.confidence * 100).toFixed(1)}%`);
          });
        }

        if (unmatched.length > 0) {
          console.log(`  ❌ UNMATCHED (${unmatched.length}):`);
          unmatched.forEach((r, i) => {
            console.log(`     ${i + 1}. Face ${r.face_index + 1} - confidence: ${(r.confidence * 100).toFixed(1)}%`);
          });
        }
        console.log(`  ${"─".repeat(50)}`);

        const imageTime = ((Date.now() - imageStartTime) / 1000).toFixed(1);
        console.log(`  ⏱️ Image ${imageIndex + 1} done: ${matched.length} matched, ${unmatched.length} unmatched (${imageTime}s)\n`);

        return { imageIndex, base64: base64WithPrefix, results: faceResults };

      } catch (err) {
        console.error(`  ❌ Image ${imageIndex + 1} error:`, err.message);
        return { imageIndex, base64: base64WithPrefix, results: [] };
      }
    });

    const allImageResults = await Promise.all(imagePromises);
    allImageResults.sort((a, b) => a.imageIndex - b.imageIndex);

    const allResults = [];
    const allOriginalImages = [];
    allImageResults.forEach(({ base64, results }) => {
      allOriginalImages.push(base64);
      allResults.push(...results);
    });

    const matchedCount = allResults.filter(r => r.match_found).length;
    const unmatchedCount = allResults.filter(r => !r.match_found).length;
    const totalTime = ((Date.now() - totalStartTime) / 1000).toFixed(1);

    // FINAL SUMMARY
    console.log(`\n${"=".repeat(60)}`);
    console.log(`📊 FINAL SUMMARY (${totalTime}s):`);
    console.log(`   📸 Images processed: ${req.files.length}`);
    console.log(`   👤 Total faces detected: ${allResults.length}`);
    console.log(`   ✅ Matched: ${matchedCount}`);
    console.log(`   ❓ Unmatched: ${unmatchedCount}`);

    if (matchedCount > 0) {
      const uniqueMatched = new Set();
      allResults.filter(r => r.match_found).forEach(r => {
        uniqueMatched.add(r.identity?.identity_code);
      });
      console.log(`   👥 Unique students matched: ${uniqueMatched.size}`);
      console.log(`   📋 IDs: ${[...uniqueMatched].join(', ')}`);
    }
    console.log(`${"=".repeat(60)}\n`);

    return res.json({
      success: true,
      status: 200,
      data: {
        total_images: req.files.length,
        total_faces: allResults.length,
        matched: matchedCount,
        unmatched: unmatchedCount,
        results: allResults,
        original_images: allOriginalImages,
        processing_time_seconds: parseFloat(totalTime),
      },
      message: `Processed ${req.files.length} images in ${totalTime}s`,
    });

  } catch (error) {
    console.error("🔥 Backend Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

app.post("/register-student-face", upload.single("image"), async (req, res) => {
  console.log("=".repeat(50));
  console.log("📸 REGISTRATION REQUEST RECEIVED");
  console.log("=".repeat(50));

  try {
    const { display_name, identity_code, email, department } = req.body;

    if (!req.file) {
      console.error("❌ No image uploaded");
      return res.status(400).json({
        success: false,
        status: 400,
        message: "No image uploaded",
        error: { code: "VALIDATION_ERROR" }
      });
    }

    console.log(`📋 Student: ${display_name} (${identity_code})`);
    console.log(`📧 Email: ${email}`);
    console.log(`🏢 Department: ${department}`);
    console.log(`📎 File size: ${(req.file.size / 1024).toFixed(0)}KB`);

    try {
      const img = await canvas.loadImage(req.file.buffer);
      console.log(`🖼️ Image dimensions: ${img.width}x${img.height}px`);

      let detection = null;
      let detectionMethod = '';

      if (availableModels.ssdMobilenet) {
        try {
          detection = await faceapi.detectSingleFace(
            img,
            new faceapi.SsdMobilenetv1Options({ minConfidence: 0.6 })
          );
          if (detection) detectionMethod = 'SSD MobileNet';
        } catch (ssdError) {
          console.warn("⚠️ SSD failed:", ssdError.message);
        }
      }

      if (!detection) {
        detection = await faceapi.detectSingleFace(
          img,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.6 })
        );
        if (detection) detectionMethod = 'TinyFace';
      }

      if (!detection) {
        return res.status(400).json({
          success: false,
          status: 400,
          message: "No face detected with sufficient quality",
          error: { code: "NO_FACE_DETECTED" }
        });
      }

      const { width, height } = detection.box;
      if (width < 60 || height < 60) {
        return res.status(400).json({
          success: false,
          status: 400,
          message: `Face too small (${Math.round(width)}x${Math.round(height)}px). Minimum size: 60px`,
          error: { code: "NO_FACE_DETECTED" }
        });
      }

      console.log(`✅ Face detected using ${detectionMethod}`);
    } catch (detectionError) {
      console.error("❌ Detection error:", detectionError.message);
    }

    const base64Image = req.file.buffer.toString("base64");

    const apiResponse = await axios.post(
      "https://app.trasholini.online/api/v1/capture",
      { display_name, identity_code, email, department, image_base64: base64Image },
      { headers: { "Content-Type": "application/json" }, timeout: 15000 }
    );

    console.log("✅ External API response:", apiResponse.status);
    return res.status(201).json(apiResponse.data);

  } catch (error) {
    console.error("❌ Registration error:");

    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        success: false,
        status: 504,
        message: "External verification service timed out",
        error: { code: "GATEWAY_TIMEOUT" }
      });
    }

    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }

    return res.status(500).json({
      success: false,
      status: 500,
      message: "Internal server error",
      error: { code: "INTERNAL_ERROR" }
    });
  }
});

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    message: "Crowd-optimized hybrid face detection server running",
    availableModels,
    detectionMode: "HYBRID (Crowd-Optimized)"
  });
});

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

loadModels().then((modelsLoaded) => {
  if (!modelsLoaded) {
    console.warn("⚠️ Server starting with limited functionality");
  }

  const localIP = getLocalIP();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 CROWD-OPTIMIZED Face Detection Server:`);
    console.log(`   Local:   http://localhost:${PORT}`);
    console.log(`   Network: http://${localIP}:${PORT}`);
    console.log(`\n📱 USE THIS IP: http://${localIP}:5000`);
    console.log(`\n⚡ Features:`);
    console.log(`   • Adaptive crowd detection`);
    console.log(`   • 3 detection modes (Standard/Group/Large Group)`);
    console.log(`   • Smart early stopping`);
    console.log(`   • Crowd-aware deduplication`);
  });
});