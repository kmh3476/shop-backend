import express from "express";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { v2 as cloudinary } from "cloudinary";

const router = express.Router();

// ✅ Cloudinary 설정
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

// ✅ Multer + Cloudinary 스토리지 설정
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "shop-images",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});

const upload = multer({ storage });

// ✅ 업로드 라우트
router.post("/", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "이미지 업로드 실패 (파일 없음)" });
    }

    console.log("📸 업로드 성공:", req.file.path);
    return res.json({ imageUrl: req.file.path });
  } catch (err) {
    console.error("❌ 업로드 실패:", err);
    return res.status(500).json({ message: "업로드 실패", error: err.message });
  }
});

export default router;
