import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// 🔹 Cloudinary 설정
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

// 🔹 Multer + Cloudinary 스토리지 설정
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "shop-products",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});

const upload = multer({ storage });

// 🔹 업로드 엔드포인트
router.post("/", upload.single("image"), async (req, res) => {
  try {
    res.json({ imageUrl: req.file.path });
  } catch (err) {
    console.error("❌ 업로드 실패:", err);
    res.status(500).json({ error: "이미지 업로드 실패" });
  }
});

export default router;
