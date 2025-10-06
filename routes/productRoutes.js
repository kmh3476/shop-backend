import express from "express";
import Product from "../models/Product.js";

const router = express.Router();

// ✅ 상품 전체 조회
router.get("/", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    console.error("❌ 상품 조회 실패:", err);
    res.status(500).json({ error: "상품 조회 실패" });
  }
});

// ✅ 상품 추가 (이미지 URL 포함)
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
      // 이미지 없을 때 기본 이미지 URL 적용
      image:
        imageUrl?.trim() ||
        "https://placehold.co/250x200?text=No+Image",
    });

    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (err) {
    console.error("❌ 상품 추가 실패:", err);
    res.status(500).json({ error: "상품 추가 실패" });
  }
});

// ✅ 상품 수정 (이미지 변경 가능)
router.put("/:id", async (req, res) => {
  try {
    const { name, price, description, imageUrl } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "상품을 찾을 수 없습니다." });
    }

    // 전달된 데이터만 업데이트
    product.name = name || product.name;
    product.price = price || product.price;
    product.description = description || product.description;

    // imageUrl이 있으면 교체, 없으면 기존 이미지 유지
    if (imageUrl) product.image = imageUrl;

    const updated = await product.save();
    res.json(updated);
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
