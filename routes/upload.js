import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import dotenv from "dotenv";

dotenv.config(); // 🔹 env 파일 읽기

console.log("🔹 CLOUD_NAME:", process.env.CLOUD_NAME);
console.log("🔹 CLOUD_API_KEY:", process.env.CLOUD_API_KEY);
console.log("🔹 CLOUD_API_SECRET:", process.env.CLOUD_API_SECRET);

// 🔹 Cloudinary 환경변수 설정
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "shop_uploads",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});

const upload = multer({ storage });
const router = express.Router();

router.post("/", (req, res) => {
  console.log("📤 업로드 요청 도착");
  upload.single("image")(req, res, (err) => {
    if (err) {
      console.error("❌ MULTER ERROR:", err);
      return res.status(500).json({
        error: "Multer error",
        details: JSON.stringify(err, Object.getOwnPropertyNames(err)),
      });
    }
    if (!req.file) {
      console.error("❌ req.file 없음");
      return res.status(400).json({ error: "파일 없음" });
    }

    console.log("✅ 업로드 성공:", req.file.path);
    res.json({ imageUrl: req.file.path });
  });
});

export default router;
