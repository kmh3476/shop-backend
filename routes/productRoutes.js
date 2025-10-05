import express from "express";
import Product from "../models/Product.js";

const router = express.Router();

// ✅ 상품 전체 조회
router.get("/", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    console.error("❌ 상품 조회 실패:", err);
    res.status(500).json({ error: "상품 조회 실패" });
  }
});

// ✅ 상품 추가
router.post("/", async (req, res) => {
  try {
    const { name, price, description, imageUrl } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: "상품명과 가격은 필수입니다." });
    }

    const newProduct = new Product({
      name,
      price,
      description,
      imageUrl,
    });

    await newProduct.save();
    res.json(newProduct);
  } catch (err) {
    console.error("❌ 상품 추가 실패:", err);
    res.status(500).json({ error: "상품 추가 실패" });
  }
});

// ✅ 상품 수정
router.put("/:id", async (req, res) => {
  try {
    const { name, price, description, imageUrl } = req.body;

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { name, price, description, imageUrl },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ error: "상품을 찾을 수 없습니다." });
    }

    res.json(updatedProduct);
  } catch (err) {
    console.error("❌ 상품 수정 실패:", err);
    res.status(500).json({ error: "상품 수정 실패" });
  }
});

// ✅ 상품 삭제
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "상품을 찾을 수 없습니다." });
    }
    res.json({ message: "삭제 완료" });
  } catch (err) {
    console.error("❌ 상품 삭제 실패:", err);
    res.status(500).json({ error: "상품 삭제 실패" });
  }
});

export default router;
