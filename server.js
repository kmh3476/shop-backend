import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import productRoutes from "./routes/productRoutes.js";
import uploadRouter from "./routes/upload.js";

// ✅ 1. 환경 변수 먼저 불러오기
dotenv.config();

// ✅ 2. Express 앱 생성
const app = express();

// ✅ 3. CORS 설정 (프론트엔드 전체 허용)
app.use(
  cors({
    origin: "*", // 필요 시 "http://localhost:3000"으로 제한 가능
    methods: ["GET", "POST", "DELETE", "PUT"],
    allowedHeaders: ["Content-Type"],
  })
);

// ✅ 4. JSON 파싱
app.use(express.json());

// ✅ 5. MongoDB 연결
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB 연결 성공"))
  .catch((err) => console.error("❌ MongoDB 연결 실패:", err));

// ✅ 6. 스키마 & 모델
const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  description: String,
  imageUrl: String, // 🔹 이미지 URL 추가
});

const Product = mongoose.model("Product", productSchema);

// ✅ 7. 라우트
app.get("/", (req, res) => {
  res.send("Shop backend API running...");
});

// 상품 목록 조회
app.get("/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    console.error("❌ 상품 조회 실패:", err);
    res.status(500).json({ error: "상품 조회 실패" });
  }
});

// 상품 추가
app.post("/products", async (req, res) => {
  try {
    const { name, price, description, imageUrl } = req.body;
    const product = new Product({ name, price, description, imageUrl });
    await product.save();
    res.json(product);
  } catch (err) {
    console.error("❌ 상품 추가 실패:", err);
    res.status(500).json({ error: "상품 추가 실패" });
  }
});

// 상품 삭제
app.delete("/products/:id", async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "삭제 완료" });
  } catch (err) {
    console.error("❌ 상품 삭제 실패:", err);
    res.status(500).json({ error: "상품 삭제 실패" });
  }
});

// ✅ 8. 모듈 라우터 연결 (Cloudinary 업로드 등)
app.use("/api", productRoutes);
app.use("/api/upload", uploadRouter);

// ✅ 9. 서버 실행
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
