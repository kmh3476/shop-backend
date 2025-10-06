// 📁 server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import uploadRouter from "./routes/upload.js";
import productRoutes from "./routes/productRoutes.js";

dotenv.config();
const app = express();

// ✅ 허용할 Origin 목록
const allowedOrigins = [
  "http://localhost:5173",             // 로컬 개발용
  "https://project-onyou.vercel.app",  // 실제 Vercel 프론트엔드 주소
];

// ✅ CORS 설정 (Render/Vercel 완전 대응)
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // 서버 내부 요청(Postman 등)은 허용

      // ✅ Render의 프록시 헤더나 URL 변형도 허용
      const cleanOrigin = origin.replace(/^https?:\/\//, "");
      const isAllowed = allowedOrigins.some((allowed) =>
        cleanOrigin.includes(allowed.replace(/^https?:\/\//, ""))
      );

      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`🚫 CORS 차단된 요청: ${origin}`);
        callback(new Error("CORS 정책에 의해 차단된 요청입니다."));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ preflight 요청 허용
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

// ✅ Render용 포트 설정
const PORT = process.env.PORT || 4000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
