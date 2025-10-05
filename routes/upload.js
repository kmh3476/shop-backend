import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

const router = express.Router();

// ✅ Cloudinary 설정
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

// ✅ Multer + Cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "shop_images",
    allowed_formats: ["jpg", "png", "jpeg"],
  },
});

const upload = multer({ storage });

// ✅ 업로드 라우트
router.post("/upload", upload.single("image"), (req, res) => {
  try {
    return res.json({ imageUrl: req.file.path });
  } catch (err) {
    console.error("업로드 실패:", err);
    res.status(500).json({ error: "업로드 실패" });
  }
});

export default router;
