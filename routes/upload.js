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

// ✅ Cloudinary 활성 여부 확인
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

// ✅ multer 설정
const storage = multer.memoryStorage(); // ⚡ Render 호환: 메모리 기반
const upload = multer({ storage });

// ✅ 로컬 정적 파일 경로 제공
router.use("/uploads", express.static(uploadDir));

// ✅ 단일 파일 업로드 (Cloudinary + 로컬 자동 선택)
router.post("/", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  try {
    let imageUrl;

    if (isCloudinaryEnabled) {
      // ☁️ Cloudinary 업로드 (stream 기반 - Render 호환)
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
    }

    console.log("✅ 업로드 완료:", imageUrl);
    res.status(200).json({ imageUrl });
  } catch (error) {
    console.error("❌ 업로드 실패:", error.message);
    res.status(500).json({ message: "Image upload failed" });
  }
});

export default router;
