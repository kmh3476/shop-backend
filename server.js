import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import productRoutes from "./routes/productRoutes.js";
import uploadRouter from "./routes/upload.js";

dotenv.config();
const app = express();

// ✅ CORS 설정 (로컬 + 배포 환경 모두 허용)
const allowedOrigins = [
  "http://localhost:5173",             // 로컬 개발용
  "https://project-onyou.vercel.app",  // Vercel 프론트엔드 (명훈님 실제 배포 주소로 변경!)
];

app.use(
  cors({
    origin: function (origin, callback) {
      // origin이 undefined면 (예: Postman, 같은 서버 요청) 허용
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("CORS 정책에 의해 차단된 요청입니다."));
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
app.use(express.json());

// ✅ MongoDB 연결
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
  })
  .then(() => console.log("✅ MongoDB 연결 성공"))
  .catch((err) => console.error("❌ MongoDB 연결 실패:", err.message));

// ✅ 기본 라우트
app.get("/", (req, res) => {
  res.send("🛍️ Shop backend API running...");
});

// ✅ 실제 API 라우트
app.use("/api/products", productRoutes);
app.use("/api/upload", uploadRouter);

// ✅ Render용 포트 설정
const PORT = process.env.PORT || 4000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
