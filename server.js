import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import productRoutes from "./routes/productRoutes.js";
import uploadRouter from "./routes/upload.js";

dotenv.config();
const app = express();

// ✅ 1. CORS 설정 — 실제 프론트엔드 주소 허용
app.use(
  cors({
    origin: [
      "http://localhost:5173", // 로컬 개발용
      "https://project-onyou.vercel.app", // Vercel에 배포된 프론트엔드 주소 (변경해도 됨)
    ],
    methods: ["GET", "POST", "DELETE", "PUT"],
    allowedHeaders: ["Content-Type"],
  })
);

// ✅ 2. JSON 파싱
app.use(express.json());

// ✅ 3. MongoDB 연결
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000, // 연결 대기시간 설정
  })
  .then(() => console.log("✅ MongoDB 연결 성공"))
  .catch((err) => console.error("❌ MongoDB 연결 실패:", err.message));

// ✅ 4. 기본 라우트
app.get("/", (req, res) => {
  res.send("🛍️ Shop backend API running...");
});

// ✅ 5. API 라우트
app.use("/api/products", productRoutes);
app.use("/api/upload", uploadRouter);

// ✅ 6. Render용 포트 환경 설정
const PORT = process.env.PORT || 4000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
