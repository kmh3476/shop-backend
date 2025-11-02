// 📁 C:\Users\Kn\Project\shop-backend\routes\inquiryRoutes.js
import express from "express";
import mongoose from "mongoose";
import Inquiry from "../models/Inquiry.js";
import { Resend } from "resend";
import { protect, adminOnly } from "../middleware/authMiddleware.js"; // ✅ 관리자 권한 가져오기

const resend = new Resend(process.env.RESEND_API_KEY);
const router = express.Router();

/* --------------------------------------------------------
 ✅ (1) 전체 문의 + 공지글 조회 (고객센터용)
-------------------------------------------------------- */
router.get("/", async (req, res) => {
  try {
    const inquiries = await Inquiry.find().sort({ isNotice: -1, createdAt: -1 });
    res.json(inquiries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* --------------------------------------------------------
 ✅ (2) 모든 문의글 + 공지글 조회 (/all 별칭)
-------------------------------------------------------- */
router.get("/all", async (req, res) => {
  try {
    const inquiries = await Inquiry.find().sort({ isNotice: -1, createdAt: -1 });
    res.json(inquiries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* --------------------------------------------------------
 ✅ (3) 특정 상품 문의 목록 (공지글 제외)
-------------------------------------------------------- */
router.get("/:productId", async (req, res, next) => {
  const { productId } = req.params;

  // ✅ "notice"나 "all" 키워드는 상위 라우트로 넘김
  if (productId === "notice" || productId === "all") {
    return next();
  }

  try {
    // ✅ productId 유효성 검사
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "잘못된 상품 ID 형식입니다." });
    }

    // ✅ 해당 상품의 문의만 조회 (공지글 제외)
    const inquiries = await Inquiry.find({
      productId,
      isNotice: { $ne: true },
    }).sort({ createdAt: -1 });

    res.json(inquiries);
  } catch (err) {
    console.error("❌ 상품 문의 불러오기 실패:", err);
    res.status(500).json({ message: err.message });
  }
});

/* --------------------------------------------------------
 ✅ (4) 문의 등록 (로그인 필수 + 이메일 자동입력)
-------------------------------------------------------- */
router.post("/", protect, async (req, res) => {
  try {
    const user = req.user;
    const { question, answer, isPrivate, productId } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ message: "제목과 내용을 모두 입력해주세요." });
    }

    // ✅ 로그인된 유저의 이메일 자동 입력
    const email = user?.email || "";

    const newInquiry = new Inquiry({
      userName: email || "익명",
      question,
      answer,
      isPrivate: isPrivate || false,
      isNotice: false,
      productId: productId || undefined,
      email,
    });

    await newInquiry.save();

    // ✅ 문의 등록 후 이메일 발송 (선택적)
    if (email) {
      try {
        await resend.emails.send({
          from: "support@onyou.store",
          to: email,
          subject: "[OnYou] 문의가 접수되었습니다.",
          html: `
            <div style="font-family:sans-serif;line-height:1.6;color:#333">
              <h2 style="color:#111">문의가 정상적으로 접수되었습니다.</h2>
              <p>고객님의 문의가 아래와 같이 등록되었습니다.</p>
              <hr style="border:none;border-top:1px solid #ddd;margin:10px 0"/>
              <p><strong>제목:</strong> ${question}</p>
              <p><strong>내용:</strong><br/>${answer}</p>
              <hr style="border:none;border-top:1px solid #ddd;margin:10px 0"/>
              <p>관리자가 확인 후 이메일로 답변드리겠습니다.</p>
              <p>감사합니다.<br/><strong>OnYou 고객센터</strong></p>
            </div>
          `,
        });
        console.log("📧 문의 확인 메일 전송 완료:", email);
      } catch (mailErr) {
        console.error("📧 이메일 발송 실패:", mailErr);
      }
    }

    res.status(201).json(newInquiry);
  } catch (err) {
    console.error("❌ 문의 등록 실패:", err);
    res.status(400).json({ message: err.message });
  }
});
// 📁 inquiryRoutes.js

/* --------------------------------------------------------
 ✅ (5) 공지글 등록 (관리자 전용)
-------------------------------------------------------- */
router.post("/notice", protect, adminOnly, async (req, res) => {
  try {
    const { question, answer, productId } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ message: "공지 제목과 내용을 모두 입력해주세요." });
    }

    // ✅ productId: 상품문의용은 "product-page", 일반 공지는 null
    const newNotice = new Inquiry({
      userName: "관리자",
      question,
      answer,
      isNotice: true,
      isPrivate: false,
      productId: productId === "product-page" ? "product-page" : null,
    });

    await newNotice.save();

    res.status(201).json({
      message: productId === "product-page"
        ? "상품문의 공지가 등록되었습니다."
        : "일반 공지가 등록되었습니다.",
      notice: newNotice,
    });
  } catch (err) {
    console.error("❌ 공지 등록 실패:", err);
    res.status(400).json({ message: err.message });
  }
});



/* --------------------------------------------------------
 ✅ (6) 관리자 답변 등록/수정
-------------------------------------------------------- */
router.post("/:id/reply", protect, adminOnly, async (req, res) => {
  try {
    const { reply } = req.body;
    const inquiry = await Inquiry.findById(req.params.id);

    if (!inquiry) {
      return res.status(404).json({ message: "문의글을 찾을 수 없습니다." });
    }

    inquiry.reply = reply;
    inquiry.repliedAt = new Date();

    await inquiry.save();

    // ✅ 답변 이메일 발송
    if (inquiry.email) {
      try {
        await resend.emails.send({
          from: "support@onyou.store",
          to: inquiry.email,
          subject: "[OnYou] 문의하신 내용에 대한 답변입니다.",
          html: `
            <div style="font-family:sans-serif;line-height:1.6;color:#333">
              <h2>문의하신 내용에 대한 답변입니다.</h2>
              <p><strong>문의 제목:</strong> ${inquiry.question}</p>
              <p><strong>답변 내용:</strong><br/>${reply}</p>
              <hr style="border:none;border-top:1px solid #ddd;margin:10px 0"/>
              <p>감사합니다.<br/><strong>OnYou 고객센터</strong></p>
            </div>
          `,
        });
        console.log("📧 답변 메일 발송 완료:", inquiry.email);
      } catch (err) {
        console.error("📧 답변 메일 발송 실패:", err);
      }
    }

    res.status(200).json({ message: "답변이 저장되었습니다.", inquiry });
  } catch (err) {
    console.error("❌ 답변 등록 실패:", err);
    res.status(500).json({ message: err.message });
  }
});

/* --------------------------------------------------------
 ✅ (7) 문의 삭제 (본인 또는 관리자만 가능)
-------------------------------------------------------- */
router.delete("/:id", protect, async (req, res) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) {
      return res.status(404).json({ message: "문의글을 찾을 수 없습니다." });
    }

    const user = req.user;

    // ✅ 본인 확인 또는 관리자 권한 확인
    if (
      !user.isAdmin &&
      (!inquiry.email || inquiry.email !== user.email)
    ) {
      return res
        .status(403)
        .json({ message: "삭제 권한이 없습니다." });
    }

    await inquiry.deleteOne();

    res.json({ message: "문의가 삭제되었습니다." });
  } catch (err) {
    console.error("❌ 문의 삭제 실패:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
