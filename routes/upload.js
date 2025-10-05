import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// 🔹 Cloudinary 환경변수
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 🔹 multer-storage-cloudinary 설정
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "shop-products", // Cloudinary 폴더명
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});

const upload = multer({ storage });

// 🔹 실제 업로드 엔드포인트
router.post("/", upload.single("image"), (req, res) => {
  if (!req.file || !req.file.path) {
    return res.status(400).json({ error: "업로드 실패" });
  }
  res.json({ imageUrl: req.file.path });
});

export default router;
