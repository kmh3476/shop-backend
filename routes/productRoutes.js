// 📁 routes/productRoutes.js
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

// ✅ 상품 상세 조회 (상세페이지용)
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "상품을 찾을 수 없습니다." });
    }
    res.json(product);
  } catch (err) {
    console.error("❌ 상품 상세 조회 실패:", err);
    res.status(500).json({ error: "상품 상세 조회 실패" });
  }
});

// ✅ 상품 추가 (여러 장 + 대표 이미지 포함)
router.post("/", async (req, res) => {
  try {
    const { name, price, description, imageUrl, images, mainImage } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: "상품명과 가격은 필수입니다." });
    }

    // ✅ 이미지 정리
    const imageArray =
      Array.isArray(images) && images.length > 0
        ? images
        : [imageUrl?.trim() || "https://placehold.co/250x200?text=No+Image"];

    const newProduct = new Product({
      name,
      price,
      description,
      image: imageUrl?.trim() || imageArray[0],
      images: imageArray,
      // ✅ 대표 이미지(mainImage) 지정 (없으면 첫 번째 이미지)
      mainImage: mainImage?.trim() || imageArray[0],
    });

    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (err) {
    console.error("❌ 상품 추가 실패:", err);
    res.status(500).json({ error: "상품 추가 실패" });
  }
});

// ✅ 상품 수정 (여러 장 + 대표 이미지 변경 가능)
router.put("/:id", async (req, res) => {
  try {
    const { name, price, description, imageUrl, images, mainImage } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ error: "상품을 찾을 수 없습니다." });
    }

    // ✅ 필드 업데이트
    if (name) product.name = name;
    if (price) product.price = price;
    if (description) product.description = description;
    if (imageUrl) product.image = imageUrl;

    // ✅ 여러 장 이미지
    if (Array.isArray(images)) {
      product.images =
        images.length > 0
          ? images
          : [product.image || "https://placehold.co/250x200?text=No+Image"];
    }

    // ✅ 대표 이미지 변경
    if (mainImage) {
      product.mainImage = mainImage;
    } else if (!product.mainImage && product.images?.length > 0) {
      // 대표 이미지가 비어있으면 자동으로 첫 이미지 설정
      product.mainImage = product.images[0];
    }

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
