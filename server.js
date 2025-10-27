// 📁 server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

// ✅ 라우트 불러오기
import uploadRouter from "./routes/upload.js";
import productRoutes from "./routes/productRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import inquiryRoutes from "./routes/inquiryRoutes.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import verifyRoutes from "./routes/verify.js";
import supportRoutes from "./routes/support.js"; // ✅ 고객센터 문의 라우트

import { protect, adminOnly } from "./middleware/authMiddleware.js";

dotenv.config();
const app = express();

/* -------------------- ✅ 프록시 환경 설정 (Render, Vercel 등) -------------------- */
// ⚠️ express-rate-limit 오류 해결 & 클라이언트 IP 인식 가능하게
app.set("trust proxy", 1);

/* -------------------- ✅ CORS 설정 -------------------- */
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : [
      "http://localhost:5173",
      "https://project-onyou.vercel.app", // ✅ Vercel 프론트엔드
      "https://shop-backend-1-dfsl.onrender.com", // ✅ Render 백엔드
      "https://onyou.store", // ✅ 실제 도메인
    ];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // SSR, Postman 등 허용
      const allowed = allowedOrigins.some((o) => {
        const base = o.replace(/https?:\/\//, "");
        return origin.includes(base);
      });
      if (allowed) callback(null, true);
      else {
        console.warn(`🚫 차단된 CORS 요청: ${origin}`);
        callback(new Error("CORS 정책에 의해 차단된 요청입니다."));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ preflight 요청 허용
app.options("*", cors());

/* -------------------- ✅ JSON & URL 파싱 -------------------- */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* -------------------- ✅ MongoDB 연결 -------------------- */
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
  })
  .then(() => console.log("✅ MongoDB 연결 성공"))
  .catch((err) => console.error("❌ MongoDB 연결 실패:", err.message));

/* -------------------- ✅ 정적 파일 경로 -------------------- */
const __dirname = path.resolve();
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* -------------------- ✅ 기본 라우트 -------------------- */
app.get("/", (req, res) => {
  res.send("🛍️ Shop backend API running...");
});

/* -------------------- ✅ 실제 API 라우트 -------------------- */
app.use("/api/upload", uploadRouter);
app.use("/api/products", productRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/inquiries", inquiryRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/verify", verifyRoutes);
app.use("/api/support", supportRoutes); // ✅ 고객센터 문의 라우트
app.use("/api/admin", protect, adminOnly, adminRoutes);

/* -------------------- ✅ 프론트엔드 URL 자동 안내 라우트 -------------------- */
// 👉 프론트에서 /auth/login 같은 경로를 잘못 쏘면 안내해주기
app.use("/auth", (req, res) => {
  res.status(400).json({
    success: false,
    message:
      "❌ 요청 경로가 잘못되었습니다. '/auth' 대신 '/api/auth'를 사용하세요.",
    correctEndpoint: "/api/auth/login",
  });
});

/* -------------------- ✅ 에러 처리 미들웨어 -------------------- */
app.use((err, req, res, next) => {
  console.error("🔥 서버 에러 발생:", err.message);

  // ✅ CORS 차단 감지
  if (err.message.includes("CORS")) {
    return res.status(403).json({
      success: false,
      message: "CORS 정책에 의해 차단된 요청입니다.",
    });
  }

  // ✅ express-rate-limit 관련 에러 감지
  if (err.code === "ERR_ERL_UNEXPECTED_X_FORWARDED_FOR") {
    console.error(
      "⚠️ 프록시 설정이 없어서 express-rate-limit가 클라이언트 IP를 읽지 못했습니다. app.set('trust proxy', 1)을 추가하세요."
    );
    return res.status(400).json({
      success: false,
      message: "서버 IP 설정 오류 (trust proxy 설정 필요).",
    });
  }

  // ✅ 기본 오류 처리
  res.status(500).json({
    success: false,
    message: "서버 내부 오류가 발생했습니다.",
    error: err.message,
  });
});

/* -------------------- ✅ 서버 실행 -------------------- */
const PORT = process.env.PORT || 4000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Auth endpoint: /api/auth/login`);
});
