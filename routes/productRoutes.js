import express from "express";
import Product from "./models/Product.js"; // 상품 모델 (mongoose)
const router = express.Router();

// ✅ 상품 전체 목록 조회
router.get("/products", async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

// ✅ 상품 추가
router.post("/products", async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ✅ 상품 수정
router.put("/products/:id", async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ✅ 상품 삭제 (원하면)
router.delete("/products/:id", async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
