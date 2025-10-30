// 📁 C:\Users\Kn\Project\shop-backend\routes\reviewRoutes.js
import express from "express";
import mongoose from "mongoose";
import Review from "../models/Review.js";
import Product from "../models/Product.js";

const router = express.Router();

/* --------------------------------------------------------
 ✅ (1) 특정 상품 리뷰 불러오기
-------------------------------------------------------- */
router.get("/:productId", async (req, res) => {
  try {
    const { productId } = req.params;

    // ✅ 상품 ID 유효성 검사
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "잘못된 상품 ID 형식입니다." });
    }

    // ✅ 실제 상품 존재 여부 확인
    const productExists = await Product.exists({ _id: productId });
    if (!productExists) {
      return res.status(404).json({ message: "해당 상품을 찾을 수 없습니다." });
    }

    // ✅ 특정 상품의 리뷰만 가져오기
    const reviews = await Review.find({ productId }).sort({ createdAt: -1 });

    if (!reviews || reviews.length === 0) {
      console.warn(`⚠️ 리뷰 없음: productId=${productId}`);
      return res.status(200).json([]); // 빈 배열로 응답
    }

    res.json(reviews);
  } catch (err) {
    console.error("❌ 리뷰 불러오기 실패:", err);
    res.status(500).json({ message: "리뷰 불러오기 실패", error: err.message });
  }
});

/* --------------------------------------------------------
 ✅ (2) 리뷰 추가 (사용자 등록)
-------------------------------------------------------- */
router.post("/", async (req, res) => {
  try {
    console.log("📥 리뷰 등록 요청:", req.body);

    const { productId, name, rating, comment } = req.body;

    // ✅ 필수값 검증
    if (!productId || !rating || !comment) {
      console.warn("⚠️ 리뷰 요청 누락 필드:", req.body);
      return res.status(400).json({
        message: "productId, rating, comment는 필수 항목입니다.",
      });
    }

    // ✅ 상품 ID 유효성 검증
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "잘못된 상품 ID입니다." });
    }

    // ✅ 상품 존재 여부 확인
    const productExists = await Product.exists({ _id: productId });
    if (!productExists) {
      return res.status(404).json({ message: "존재하지 않는 상품입니다." });
    }

    // ✅ 사용자명 기본값 처리
    const userName = name?.trim() || "익명";

    // ✅ 평점 숫자 검증
    const numericRating = Number(rating);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: "평점은 1~5 사이의 숫자여야 합니다." });
    }

    // ✅ 리뷰 생성
    const newReview = new Review({
      productId,
      userName,
      rating: numericRating,
      comment: comment.trim(),
    });

    const saved = await newReview.save();
    console.log("✅ 리뷰 저장 성공:", saved);
    res.status(201).json(saved);
  } catch (err) {
    console.error("❌ 리뷰 저장 실패:", err);
    res.status(500).json({ message: "리뷰 저장 실패", error: err.message });
  }
});

/* --------------------------------------------------------
 ✅ (3) 리뷰 수정 (관리자용 또는 사용자 요청 시)
-------------------------------------------------------- */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (!rating && !comment) {
      return res.status(400).json({ message: "수정할 내용이 없습니다." });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ message: "리뷰를 찾을 수 없습니다." });
    }

    if (rating) {
      const numericRating = Number(rating);
      if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
        return res.status(400).json({ message: "평점은 1~5 사이의 숫자여야 합니다." });
      }
      review.rating = numericRating;
    }

    if (comment) {
      review.comment = comment.trim();
    }

    await review.save();
    res.json({ message: "리뷰가 수정되었습니다.", review });
  } catch (err) {
    console.error("❌ 리뷰 수정 실패:", err);
    res.status(500).json({ message: "리뷰 수정 실패", error: err.message });
  }
});

/* --------------------------------------------------------
 ✅ (4) 리뷰 삭제 (관리자 전용 또는 본인 확인 후)
-------------------------------------------------------- */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Review.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "리뷰를 찾을 수 없습니다." });
    }

    console.log("🗑 리뷰 삭제됨:", id);
    res.json({ message: "리뷰가 삭제되었습니다." });
  } catch (err) {
    console.error("❌ 리뷰 삭제 실패:", err);
    res.status(500).json({ message: "리뷰 삭제 실패", error: err.message });
  }
});

/* --------------------------------------------------------
 ✅ (5) 리뷰 전체 조회 (관리자용)
-------------------------------------------------------- */
router.get("/", async (req, res) => {
  try {
    // ✅ productId가 유효하지 않은 리뷰는 제외
    const reviews = await Review.find({
      productId: { $exists: true, $ne: null },
    }).sort({ createdAt: -1 });

    res.json(reviews);
  } catch (err) {
    console.error("❌ 전체 리뷰 조회 실패:", err);
    res.status(500).json({ message: "전체 리뷰 조회 실패", error: err.message });
  }
});

export default router;
