// 📁 routes/upload.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// ✅ 업로드 폴더 생성 (Render 등 서버 재시작 환경에서도 안전하게)
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("📁 uploads 폴더 생성됨:", uploadDir);
}

// ✅ multer 저장 설정
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    // 🔧 한글 깨짐 방지용 (latin1 → utf8 변환)
    const originalName = Buffer.from(file.originalname, "latin1").toString("utf8");

    // 🔧 공백, 특수문자 안전 처리
    const safeName = originalName.replace(/\s+/g, "_").replace(/[^\w가-힣._-]/g, "");

    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({ storage });

// ✅ 정적 파일 제공 (업로드된 이미지 접근 가능하게)
router.use("/uploads", express.static(uploadDir));

// ✅ 단일 파일 업로드 라우트
router.post("/", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  // ✅ Render / Vercel 대응용 안전한 URL 생성
  const host = req.headers["x-forwarded-host"] || req.get("host");
  const protocol =
    req.headers["x-forwarded-proto"] ||
    (host?.includes("localhost") ? "http" : "https");

  const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

  console.log("✅ 업로드된 파일:", fileUrl);
  res.status(200).json({ imageUrl: fileUrl });
});

// ✅ router를 default export
export default router;
