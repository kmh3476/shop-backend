// 📁 server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import morgan from "morgan";
import fileUpload from "express-fileupload"; // ✅ Cloudinary 파일 업로드 지원용 추가
import cloudinary from "cloudinary"; // ✅ Cloudinary 라이브러리 추가

// ✅ 라우트 불러오기
import uploadRouter from "./routes/upload.js";
import productRoutes from "./routes/productRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import inquiryRoutes from "./routes/inquiryRoutes.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import verifyRoutes from "./routes/verify.js";
import supportRoutes from "./routes/support.js";
import pageSettingRoutes from "./routes/pageSettingRoutes.js";
import languageRoutes from "./routes/languageRoutes.js";

import { protect, adminOnly } from "./middleware/authMiddleware.js";

dotenv.config();
const app = express();

/* -------------------- ✅ Cloudinary 설정 -------------------- */
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
console.log("☁️ Cloudinary 설정 완료");

/* -------------------- ✅ 프록시 환경 설정 -------------------- */
app.set("trust proxy", 1);

/* -------------------- ✅ CORS 설정 (Render 호환 완성본) -------------------- */
const allowedOrigins = [
  "http://localhost:5173", // ✅ 로컬 개발용
  "https://onyou.store",
  "https://www.onyou.store", // ✅ 실제 도메인
  "https://project-onyou.vercel.app", // ✅ 구 배포 주소
  "https://shop-frontend-cz3y-kmh3476s-projects.vercel.app", // ✅ 현재 Vercel Production
  "https://shop-frontend-cz3y-cej5x6lt6-kmh3476s-projects.vercel.app", // ✅ Preview 배포
  "https://shop-backend-1-dfsl.onrender.com" // ✅ 백엔드 자체 주소 (API 테스트용)
];

// ✅ CORS 미들웨어 (중복 제거, 완전 통합)
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("🚫 차단된 CORS 요청:", origin);
        callback(new Error("CORS 정책에 의해 차단된 요청입니다."));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-App-Language", // ✅ 반드시 추가!
    ],
  })
);


// ✅ OPTIONS(Preflight) 요청 자동 응답
app.options("*", cors());

/* -------------------- ✅ 요청 로그 -------------------- */
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
} else {
  app.use(
    morgan("tiny", {
      skip: (req, res) => res.statusCode < 400,
    })
  );
}

/* -------------------- ✅ 요청 본문 파서 및 파일 업로드 허용 -------------------- */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
  })
);

/* -------------------- ✅ MongoDB 연결 -------------------- */
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
  })
  .then(() => console.log("✅ MongoDB 연결 성공"))
  .catch((err) => {
    console.error("❌ MongoDB 연결 실패:", err.message);
    process.exit(1);
  });

/* -------------------- ✅ 정적 파일 경로 -------------------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* -------------------- ✅ 기본 라우트 -------------------- */
app.get("/", (req, res) => {
  res.status(200).json({
    message: "🛍️ Shop backend API running...",
    status: "OK",
    version: "1.0.0",
    endpoints: {
      products: "/api/products",
      reviews: "/api/reviews",
      inquiries: "/api/inquiries",
      auth: "/api/auth/login",
      support: "/api/support",
      upload: "/api/upload",
    },
  });
});

/* -------------------- ✅ 업로드 라우트: Cloudinary (보강) -------------------- */
app.post("/api/upload", async (req, res) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).json({ message: "이미지 파일이 없습니다." });
    }

    const file = req.files.image.tempFilePath;

    // ✅ 업로드 Preset 적용 (Unsigned preset: onyou_uploads)
    const result = await cloudinary.v2.uploader.upload(file, {
      upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET || "onyou_uploads",
      folder: "products/",
      resource_type: "image",
    });

    console.log("✅ Cloudinary 업로드 성공:", result.secure_url);
    res.json({ imageUrl: result.secure_url });
  } catch (err) {
    console.error("❌ Cloudinary 업로드 실패:", err);
    res.status(500).json({
      message: "이미지 업로드 실패",
      error: err.message,
    });
  }
});
/* -------------------- ✅ 실제 API 라우트 -------------------- */
app.use("/api/products", productRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/inquiries", inquiryRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/verify", verifyRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/admin", protect, adminOnly, adminRoutes);
app.use("/api/pages", pageSettingRoutes);

// ✅ 다국어 관리 라우트 추가
app.use("/api/language", languageRoutes);

/* -------------------- ✅ 호환용 구버전 라우트 -------------------- */
app.use("/pages", pageSettingRoutes);
app.use("/products", productRoutes);

/* -------------------- ✅ /auth 오용 경고 -------------------- */
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
  console.error("🔥 서버 에러 발생:", err.stack || err.message);

  // ✅ CORS 차단 감지
  if (err.message.includes("CORS")) {
    return res.status(403).json({
      success: false,
      message: "CORS 정책에 의해 차단된 요청입니다.",
      origin: req.headers.origin || "unknown",
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

  // ✅ mongoose validation 에러 처리
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: "입력값 검증 오류",
      errors,
    });
  }

  // ✅ CastError (ObjectId 형식 오류)
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "잘못된 ID 형식입니다.",
      invalidField: err.path,
    });
  }

  // ✅ 기본 오류 처리
  res.status(500).json({
    success: false,
    message: "서버 내부 오류가 발생했습니다.",
    error:
      process.env.NODE_ENV === "production" ? undefined : err.message,
  });
});

/* -------------------- ✅ 서버 실행 -------------------- */
const PORT = process.env.PORT || 4000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🌐 CORS 허용 도메인 목록:`);

  allowedOrigins.forEach((o) => console.log("  •", o));

  // ✅ Cloudinary 설정 로그
  if (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_UPLOAD_PRESET
  ) {
    console.log(
      `☁️ Cloudinary 연결됨 → ${process.env.CLOUDINARY_CLOUD_NAME}/${process.env.CLOUDINARY_UPLOAD_PRESET}`
    );
  } else {
    console.warn("⚠️ Cloudinary 환경 변수가 누락되었습니다.");
  }

  // ✅ MongoDB 연결 여부 체크
  if (!mongoose.connection.readyState) {
    console.warn("⚠️ MongoDB 연결이 아직 완료되지 않았습니다.");
  } else {
    console.log("✅ MongoDB 연결 확인 완료");
  }

  // ✅ 서버 시작 후 CORS 테스트용
  console.log(
    "🧩 CORS 테스트 → OPTIONS /api/inquiries (Preflight 요청)이 204로 응답되어야 정상 작동합니다."
  );
});

/* -------------------- ✅ 프로세스 예외 처리 -------------------- */
process.on("uncaughtException", (err) => {
  console.error("🚨 예기치 못한 예외 발생:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("⚠️ 처리되지 않은 Promise 거부:", reason);
});

/* -------------------- ✅ graceful 종료 -------------------- */
process.on("SIGTERM", () => {
  console.log("🛑 서버 종료 신호 감지 (SIGTERM)");
  mongoose.connection.close(() => {
    console.log("🔌 MongoDB 연결 종료");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("🛑 Ctrl + C 감지 → 서버 종료 중...");
  mongoose.connection.close(() => {
    console.log("🔌 MongoDB 연결 종료");
    process.exit(0);
  });
});
