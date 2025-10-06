// 📁 routes/upload.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// ✅ Cloudinary 설정 (환경변수가 있으면 활성화)
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

// ✅ multer 기본 저장 설정 (로컬)
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const originalName = Buffer.from(file.originalname, "latin1").toString("utf8");
    const safeName = originalName.replace(/\s+/g, "_").replace(/[^\w가-힣._-]/g, "");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({ storage });

// ✅ 정적 파일 제공 (로컬 접근용)
router.use("/uploads", express.static(uploadDir));

// ✅ 단일 파일 업로드
router.post("/", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  try {
    let imageUrl;

    if (isCloudinaryEnabled) {
      // ☁️ Cloudinary 업로드
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "shop-products",
        use_filename: true,
        unique_filename: false,
        overwrite: true,
      });

      imageUrl = result.secure_url;

      // ✅ 로컬 파일 정리 (서버 디스크 절약)
      fs.unlink(req.file.path, (err) => {
        if (err) console.warn("⚠️ 로컬 임시 파일 삭제 실패:", err.message);
      });
    } else {
      // 💾 로컬 저장 모드
      const host = req.headers["x-forwarded-host"] || req.get("host");
      const protocol =
        req.headers["x-forwarded-proto"] ||
        (host?.includes("localhost") ? "http" : "https");

      imageUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    }

    console.log("✅ 업로드된 파일:", imageUrl);
    res.status(200).json({ imageUrl });
  } catch (error) {
    console.error("❌ 업로드 실패:", error.message);
    res.status(500).json({ message: "Image upload failed" });
  }
});

export default router;
