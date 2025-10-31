// 📁 routes/productRoutes.js
import express from "express";
import mongoose from "mongoose";
import Product from "../models/Product.js";

const router = express.Router();

/* ==========================================================
   ✅ 상품 전체 조회 (카테고리 필터 추가됨)
   /api/products?categoryName=recommend
   /api/products?isRecommended=true
========================================================== */
router.get("/", async (req, res) => {
  try {
    const { categoryName, isRecommended } = req.query; // ✅ 쿼리 파라미터 받기

    const filter = {};

    // ✅ categoryName으로 필터링 (ex: recommend, outer 등)
    if (categoryName) {
      filter.categoryName = categoryName;
    }

    // ✅ isRecommended=true인 상품만
    if (isRecommended === "true") {
      filter.isRecommended = true;
    }

    // 🔧 PageSetting 연결된 탭 정보도 같이 가져오도록 populate 추가
    const products = await Product.find(filter)
      .populate("categoryPage")
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (err) {
    console.error("❌ 상품 조회 실패:", err);
    res.status(500).json({ error: "상품 조회 실패" });
  }
});

/* ==========================================================
   ✅ 상품 상세 조회
========================================================== */
router.get("/:id", async (req, res) => {
  try {
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

/* ==========================================================
   ✅ 상품 추가 (여러 장 + 대표 이미지 + 탭 연결)
========================================================== */
router.post("/", async (req, res) => {
  try {
    const {
      name,
      price,
      description,
      imageUrl,
      images,
      mainImage,
      categoryPage, // ObjectId
    } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: "상품명과 가격은 필수입니다." });
    }

    const imageArray =
      Array.isArray(images) && images.length > 0
        ? images.filter(Boolean)
        : [imageUrl?.trim() || "https://placehold.co/250x200?text=No+Image"];

    const resolvedMain =
      mainImage && imageArray.includes(mainImage)
        ? mainImage
        : imageArray[0];

    const newProduct = new Product({
      name,
      price,
      description,
      image: resolvedMain,
      images: imageArray,
      mainImage: resolvedMain,
      categoryPage: categoryPage ? new mongoose.Types.ObjectId(categoryPage) : null,
    });

    // ✅ PageSetting.name → categoryName 자동 동기화
    if (categoryPage) {
      const PageSetting = mongoose.model("PageSetting");
      const page = await PageSetting.findById(categoryPage).lean();
      if (page && page.name) {
        newProduct.categoryName = page.name;
      }
    }

    const saved = await newProduct.save();
    const populated = await Product.findById(saved._id).populate("categoryPage");
    res.status(201).json(populated);
  } catch (err) {
    console.error("❌ 상품 추가 실패:", err);
    res.status(500).json({ error: "상품 추가 실패" });
  }
});

/* ==========================================================
   ✅ 상품 수정 (탭 변경 포함)
========================================================== */
router.put("/:id", async (req, res) => {
  try {
    const {
      name,
      price,
      description,
      imageUrl,
      images,
      mainImage,
      categoryPage,
    } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "상품을 찾을 수 없습니다." });
    }

    if (name) product.name = name;
    if (price) product.price = price;
    if (description) product.description = description;
    if (imageUrl) product.image = imageUrl;

    if (Array.isArray(images)) {
      const cleanImages = images.filter(Boolean);
      product.images =
        cleanImages.length > 0
          ? cleanImages
          : [product.image || "https://placehold.co/250x200?text=No+Image"];
    }

    if (mainImage && product.images.includes(mainImage)) {
      product.mainImage = mainImage;
    } else if (!product.mainImage || !product.images.includes(product.mainImage)) {
      product.mainImage = product.images[0];
    }

    if (categoryPage !== undefined) {
      product.categoryPage = categoryPage
        ? new mongoose.Types.ObjectId(categoryPage)
        : null;

      // ✅ categoryName도 자동 갱신
      if (categoryPage) {
        const PageSetting = mongoose.model("PageSetting");
        const page = await PageSetting.findById(categoryPage).lean();
        if (page && page.name) {
          product.categoryName = page.name;
        }
      } else {
        product.categoryName = "default";
      }
    }

    const updated = await product.save();
    const populated = await Product.findById(updated._id).populate("categoryPage");
    res.json(populated);
  } catch (err) {
    console.error("❌ 상품 수정 실패:", err);
    res.status(500).json({ error: "상품 수정 실패" });
  }
});

/* ==========================================================
   ✅ 상품 삭제
========================================================== */
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
