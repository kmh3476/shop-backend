import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// ✅ 업로드 폴더 생성 (Render 등에서도 안전하게)
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// ✅ multer 저장 설정
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const safeName = file.originalname.replace(/\s+/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({ storage });

// ✅ POST /api/upload (단일 파일 업로드)
router.post("/", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  // ✅ Render는 항상 HTTPS를 사용하므로 강제로 https:// 붙이기
  const fileUrl = `https://${req.get("host")}/${req.file.path.replace(/\\/g, "/")}`;

  res.status(200).json({ imageUrl: fileUrl });
});

export default router;
