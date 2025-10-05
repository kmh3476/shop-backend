// ✅ 필요한 모듈 불러오기
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import productRoutes from "./routes/productRoutes.js";
import uploadRouter from "./routes/upload.js";

// ✅ 1. 환경 변수 로드 (.env)
dotenv.config();

// ✅ 2. Express 앱 생성
const app = express();

// ✅ 3. 환경 변수 로그 (확인용)
console.log("🔹 CLOUD_NAME:", process.env.CLOUD_NAME || "❌ 없음");
console.log("🔹 CLOUD_API_KEY:", process.env.CLOUD_API_KEY || "❌ 없음");
console.log("🔹 CLOUD_API_SECRET:", process.env.CLOUD_API_SECRET ? "✅ 있음" : "❌ 없음");
console.log("🔹 MONGO_URI:", process.env.MONGO_URI ? "✅ 있음" : "❌ 없음");

// ✅ 4. CORS 설정 (프론트엔드 주소만 허용 권장)
app.use(
  cors({
    origin: "*", // 개발용: 전체 허용. 배포 시엔 프론트 주소로 변경
    methods: ["GET", "POST", "DELETE", "PUT"],
    allowedHeaders: ["Content-Type"],
  })
);

// ✅ 5. JSON 파싱 (request body 읽기)
app.use(express.json());

// ✅ 6. MongoDB 연결
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB 연결 성공"))
  .catch((err) => console.error("❌ MongoDB 연결 실패:", err.message));

// ✅ 7. 기본 라우트
app.get("/", (req, res) => {
  res.send("🛍️ Shop backend API running...");
});

// ✅ 8. 상품 관련 라우트 등록
app.use("/api/products", productRoutes);

// ✅ 9. 이미지 업로드 라우트 등록 (Cloudinary)
app.use("/api/upload", uploadRouter);

// ✅ 10. 서버 실행
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
