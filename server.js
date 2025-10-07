// 📁 server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import uploadRouter from "./routes/upload.js";
import productRoutes from "./routes/productRoutes.js";

// ✅ 새로 추가된 라우트
import reviewRoutes from "./routes/reviewRoutes.js";
import inquiryRoutes from "./routes/inquiryRoutes.js";

dotenv.config();
const app = express();

// ✅ 허용할 Origin 목록
const allowedOrigins = [
  "http://localhost:5173",            // 로컬 개발용
  "https://project-onyou.vercel.app", // Vercel 배포 프론트엔드
];

// ✅ CORS 설정 (Render + Vercel 완전 대응)
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // Postman 등 내부 요청 허용
      if (allowedOrigins.includes(origin)) return callback(null, true);

      // ✅ https:// 뒤에 www가 붙거나 슬래시가 붙는 경우도 허용
      const normalized = origin.replace(/\/$/, "");
      const allowed = allowedOrigins.some((o) => normalized.includes(o.replace(/https?:\/\//, "")));

      if (allowed) callback(null, true);
      else {
        console.warn(`🚫 차단된 CORS 요청: ${origin}`);
        callback(new Error("CORS 정책에 의해 차단된 요청입니다."));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ preflight 요청 처리
app.options("*", cors());

// ✅ JSON 파싱
app.use(express.json({ limit: "10mb" }));

// ✅ MongoDB 연결
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
  })
  .then(() => console.log("✅ MongoDB 연결 성공"))
  .catch((err) => console.error("❌ MongoDB 연결 실패:", err.message));

// ✅ 업로드 폴더 정적 제공
const __dirname = path.resolve();
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ 기본 라우트
app.get("/", (req, res) => {
  res.send("🛍️ Shop backend API running...");
});

// ✅ 실제 API 라우트
app.use("/api/upload", uploadRouter);
app.use("/api/products", productRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/inquiries", inquiryRoutes);

// ✅ Render용 포트 설정
const PORT = process.env.PORT || 4000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
