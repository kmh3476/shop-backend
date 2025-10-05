import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import productRoutes from "./routes/productRoutes.js";
import uploadRouter from "./routes/upload.js";

dotenv.config();
console.log("🔹 CLOUD_NAME:", process.env.CLOUD_NAME);
console.log("🔹 CLOUD_API_KEY:", process.env.CLOUD_API_KEY);
console.log("🔹 CLOUD_API_SECRET:", process.env.CLOUD_API_SECRET);
const app = express();

// ✅ CORS 설정
app.use(
  cors({
    origin: "*", // 필요시 프론트 주소로 변경
    methods: ["GET", "POST", "DELETE", "PUT"],
    allowedHeaders: ["Content-Type"],
  })
);

// ✅ JSON 파싱
app.use(express.json());

// ✅ MongoDB 연결
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB 연결 성공"))
  .catch((err) => console.error("❌ MongoDB 연결 실패:", err));

// ✅ 라우트 등록
app.get("/", (req, res) => res.send("Shop backend API running..."));

// 상품 관련 라우트 (CRUD)
app.use("/api/products", productRoutes);

// Cloudinary 업로드 라우트
app.use("/api/upload", uploadRouter);

// ✅ 서버 실행
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
