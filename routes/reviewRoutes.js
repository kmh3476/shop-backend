import express from "express";
import Review from "../models/Review.js";

const router = express.Router();

/* --------------------------------------------------------
 ✅ (1) 특정 상품 리뷰 불러오기
-------------------------------------------------------- */
router.get("/:productId", async (req, res) => {
  try {
    const reviews = await Review.find({ productId: req.params.productId }).sort({
      createdAt: -1,
    });
    res.json(reviews);
  } catch (err) {
    console.error("❌ 리뷰 불러오기 실패:", err);
    res.status(500).json({ message: "리뷰 불러오기 실패" });
  }
});

/* --------------------------------------------------------
 ✅ (2) 리뷰 추가
-------------------------------------------------------- */
router.post("/", async (req, res) => {
  try {
    console.log("📥 리뷰 등록 요청:", req.body);

    const { productId, name, rating, comment } = req.body;

    // ✅ 필수값 검증
    if (!productId || !name || !rating || !comment) {
      console.warn("⚠️ 리뷰 요청 누락 필드:", req.body);
      return res
        .status(400)
        .json({ message: "productId, name, rating, comment는 필수입니다." });
    }

    // ✅ DB에 저장
    const newReview = new Review({
      productId,
      name,
      rating,
      comment,
    });

    const saved = await newReview.save();
    console.log("✅ 리뷰 저장 성공:", saved);
    res.status(201).json(saved);
  } catch (err) {
    console.error("❌ 리뷰 저장 실패:", err);
    res.status(500).json({ message: "리뷰 저장 실패", error: err.message });
  }
});

export default router;
