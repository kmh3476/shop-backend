  import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import productRoutes from "./routes/productRoutes.js";
app.use("/api", productRoutes);


dotenv.config();

const app = express();

// ✅ CORS 설정 (프론트 주소 허용)
app.use(cors({
  origin: "*",   // 배포 테스트용 전체 허용
  methods: ["GET", "POST", "DELETE"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

// DB 연결
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// 스키마 & 모델
const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  description: String,
});

const Product = mongoose.model("Product", productSchema);

// 라우트
app.get("/", (req, res) => {
  res.send("Shop backend API running...");
});

// 상품 목록 조회
app.get("/products", async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

// 상품 추가
app.post("/products", async (req, res) => {
  const { name, price, description } = req.body;
  const product = new Product({ name, price, description });
  await product.save();
  res.json(product);
});

// 상품 삭제
app.delete("/products/:id", async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ message: "삭제 완료" });
});

// 서버 실행
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
