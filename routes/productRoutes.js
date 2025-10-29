// 📁 routes/productRoutes.js
import express from "express";
import mongoose from "mongoose"; // ✅ 추가
import Product from "../models/Product.js";

const router = express.Router();

// ✅ 상품 전체 조회
router.get("/", async (req, res) => {
  try {
    // 🔧 PageSetting 연결된 탭 정보도 같이 가져오도록 populate 추가
    const products = await Product.find()
      .populate("categoryPage")
      .sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    console.error("❌ 상품 조회 실패:", err);
    res.status(500).json({ error: "상품 조회 실패" });
  }
});

// ✅ 상품 상세 조회 (상세페이지용)
router.get("/:id", async (req, res) => {
  try {
    // 🔧 상세에서도 탭 정보 표시 가능하도록 populate
    const product = await Product.findById(req.params.id).populate("categoryPage");
    if (!product) {
      return res.status(404).json({ error: "상품을 찾을 수 없습니다." });
    }
    res.json(product);
  } catch (err) {
    console.error("❌ 상품 상세 조회 실패:", err);
    res.status(500).json({ error: "상품 상세 조회 실패" });
  }
});

// ✅ 상품 추가 (여러 장 + 대표 이미지 + 탭(categoryPage))
router.post("/", async (req, res) => {
  try {
    const {
      name,
      price,
      description,
      imageUrl,
      images,
      mainImage,
      categoryPage, // 🔧 탭 선택 추가
    } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: "상품명과 가격은 필수입니다." });
    }

    // ✅ 이미지 정리
    const imageArray =
      Array.isArray(images) && images.length > 0
        ? images.filter(Boolean)
        : [imageUrl?.trim() || "https://placehold.co/250x200?text=No+Image"];

    // ✅ 대표 이미지(mainImage)가 유효하지 않으면 첫 번째 이미지로 대체
    const resolvedMain =
      mainImage && imageArray.includes(mainImage)
        ? mainImage
        : imageArray[0];

    // 🔧 categoryPage ObjectId 변환하여 저장
    const newProduct = new Product({
      name,
      price,
      description,
      image: resolvedMain, // 단일 이미지 필드(호환용)
      images: imageArray,
      mainImage: resolvedMain, // ✅ 대표 이미지 필드 저장
      categoryPage: categoryPage
        ? new mongoose.Types.ObjectId(categoryPage)
        : null, // ✅ 문자열 → ObjectId 변환
    });

    const saved = await newProduct.save();
    // 🔧 저장 후 populate된 버전 응답
    const populated = await Product.findById(saved._id).populate("categoryPage");
    res.status(201).json(populated);
  } catch (err) {
    console.error("❌ 상품 추가 실패:", err);
    res.status(500).json({ error: "상품 추가 실패" });
  }
});

// ✅ 상품 수정 (여러 장 + 대표 이미지 + 탭 변경 가능)
router.put("/:id", async (req, res) => {
  try {
    const {
      name,
      price,
      description,
      imageUrl,
      images,
      mainImage,
      categoryPage, // 🔧 탭 수정 추가
    } = req.body;

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
      const cleanImages = images.filter(Boolean);
      product.images =
        cleanImages.length > 0
          ? cleanImages
          : [product.image || "https://placehold.co/250x200?text=No+Image"];
    }

    // ✅ 대표 이미지 변경 (없으면 첫 번째 이미지로 대체)
    if (mainImage && product.images.includes(mainImage)) {
      product.mainImage = mainImage;
    } else if (!product.mainImage || !product.images.includes(product.mainImage)) {
      product.mainImage = product.images[0];
    }

    // 🔧 categoryPage(탭) 수정 가능하게 ObjectId 변환
    if (categoryPage !== undefined) {
      product.categoryPage = categoryPage
        ? new mongoose.Types.ObjectId(categoryPage)
        : null;
    }

    const updated = await product.save();
    // 🔧 populate된 상태로 응답
    const populated = await Product.findById(updated._id).populate("categoryPage");
    res.json(populated);
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
