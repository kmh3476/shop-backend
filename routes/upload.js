// 📁 server.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

// Express 앱 생성
const app = express();

// ✅ JSON 파서 및 인코딩 설정 (한글 깨짐 방지)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  next();
});

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
app.use("/uploads", express.static(uploadDir));

// ✅ 단일 파일 업로드 라우트
app.post("/api/upload", upload.single("image"), (req, res) => {
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

// ✅ 예시: 상품 관련 라우트 (이미 존재한다면 그대로 유지)
import productRoutes from "./routes/productRoutes.js";
app.use("/api/products", productRoutes);

// ✅ 서버 실행 (Render/Vercel 환경에서는 자동 포트 사용)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
