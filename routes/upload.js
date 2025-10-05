// routes/upload.js
import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import dotenv from "dotenv";

dotenv.config();

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

router.post("/", upload.single("image"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "파일 없음" });
    res.json({ imageUrl: req.file.path });
  } catch (err) {
    console.error("❌ 업로드 실패:", err);
    res.status(500).json({ error: "Multer error", details: err.message });
  }
});

export default router;
