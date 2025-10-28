import express from "express";
import Inquiry from "../models/Inquiry.js";

const router = express.Router();

// ✅ 전체 문의 + 공지글 조회 (고객센터용)
router.get("/", async (req, res) => {
  try {
    const inquiries = await Inquiry.find()
      .sort({ isNotice: -1, createdAt: -1 }); // 공지글이 위로 오게 정렬
    res.json(inquiries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ 모든 문의글 + 공지글 조회 (/all 별칭)
router.get("/all", async (req, res) => {
  try {
    const inquiries = await Inquiry.find()
      .sort({ isNotice: -1, createdAt: -1 }); // 공지글이 위로 오게 정렬
    res.json(inquiries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ 특정 상품 문의 목록 (공지글 포함)
router.get("/:productId", async (req, res, next) => {
  // ⚠️ "/notice" 요청이 여기로 잘못 들어오지 않게 예외처리 추가
  if (req.params.productId === "notice" || req.params.productId === "all") {
    return next();
  }

  try {
    const inquiries = await Inquiry.find({
      $or: [
        { productId: req.params.productId },
        { isNotice: true }, // ✅ 공지글도 함께 표시
      ],
    }).sort({ isNotice: -1, createdAt: -1 }); // 공지글이 위로 오게 정렬

    res.json(inquiries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ 문의 등록 (일반 사용자)
router.post("/", async (req, res) => {
  try {
    const newInquiry = new Inquiry(req.body);
    await newInquiry.save();
    res.status(201).json(newInquiry);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ✅ 공지글 등록 (관리자 전용)
router.post("/notice", async (req, res) => {
  try {
    // 관리자 인증 미들웨어(authMiddleware)를 나중에 연결 가능
    const { question, answer } = req.body;

    const newNotice = new Inquiry({
      userName: "관리자",
      question,
      answer: answer || "",
      isNotice: true,
      isPrivate: false,
    });

    await newNotice.save();
    res.status(201).json({
      message: "공지글이 등록되었습니다.",
      notice: newNotice,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
