// 📁 routes/upload.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import streamifier from "streamifier";

dotenv.config();
const router = express.Router();

// ✅ Cloudinary 설정
const isCloudinaryEnabled =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

if (isCloudinaryEnabled) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log("☁️ Cloudinary 업로드 활성화됨");
} else {
  console.log("💾 로컬 업로드 모드 (Cloudinary 비활성)");
}

// ✅ 로컬 업로드 폴더 생성
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("📁 uploads 폴더 생성됨:", uploadDir);
}

// ✅ multer 메모리 저장 (Render 호환)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ 정적 경로 제공
router.use("/uploads", express.static(uploadDir));

/* --------------------------------------------------------
 ✅ (1) 여러 장 업로드 (Cloudinary + 로컬 완전 지원)
-------------------------------------------------------- */
router.post("/multi", upload.array("image", 10), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "No files uploaded" });
  }

  try {
    const imageUrls = [];

    for (const file of req.files) {
      let imageUrl;

      if (isCloudinaryEnabled) {
        // ☁️ Cloudinary 업로드 (stream 방식, await 보장)
        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "shop-products" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          streamifier.createReadStream(file.buffer).pipe(stream);
        });

        imageUrl = result.secure_url;
        console.log("✅ Cloudinary 업로드 성공:", imageUrl);
      } else {
        // 💾 로컬 업로드
        const filename = `${Date.now()}-${file.originalname
          .replace(/\s+/g, "_")
          .replace(/[^\w가-힣._-]/g, "")}`;
        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, file.buffer);

        const host = req.headers["x-forwarded-host"] || req.get("host");
        const protocol =
          req.headers["x-forwarded-proto"] ||
          (host?.includes("localhost") ? "http" : "https");

        imageUrl = `${protocol}://${host}/uploads/${filename}`;
        console.log("💾 로컬 업로드 성공:", imageUrl);
      }

      imageUrls.push(imageUrl);
    }

    console.log(`✅ 총 ${imageUrls.length}개 이미지 업로드 완료`);
    res.status(200).json({ imageUrls });
  } catch (error) {
    console.error("❌ 다중 업로드 실패:", error);
    res.status(500).json({ message: "Multi image upload failed" });
  }
});

/* --------------------------------------------------------
 ✅ (2) 단일 업로드 (호환용)
-------------------------------------------------------- */
router.post("/", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  try {
    let imageUrl;

    if (isCloudinaryEnabled) {
      // ☁️ Cloudinary 업로드 (stream 방식)
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "shop-products" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });

      imageUrl = result.secure_url;
      console.log("✅ 단일 Cloudinary 업로드 완료:", imageUrl);
    } else {
      // 💾 로컬 업로드
      const filename = `${Date.now()}-${req.file.originalname
        .replace(/\s+/g, "_")
        .replace(/[^\w가-힣._-]/g, "")}`;
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, req.file.buffer);

      const host = req.headers["x-forwarded-host"] || req.get("host");
      const protocol =
        req.headers["x-forwarded-proto"] ||
        (host?.includes("localhost") ? "http" : "https");

      imageUrl = `${protocol}://${host}/uploads/${filename}`;
      console.log("✅ 단일 로컬 업로드 완료:", imageUrl);
    }

    res.status(200).json({ imageUrl });
  } catch (error) {
    console.error("❌ 단일 업로드 실패:", error);
    res.status(500).json({ message: "Image upload failed" });
  }
});

export default router;
