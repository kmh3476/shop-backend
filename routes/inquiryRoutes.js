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
   → 일반 문의 및 일반 공지만 (productId 없는 데이터)
-------------------------------------------------------- */
router.get("/", async (req, res) => {
  try {
    console.log("📥 [GET /api/inquiries] 전체 문의 조회 요청 수신됨");

    const inquiries = await Inquiry.find({
      $or: [
        // ✅ 일반 공지 (isNotice:true, productId 없음)
        { isNotice: true, $or: [{ productId: { $exists: false } }, { productId: null }] },
        // ✅ 일반 문의 (isNotice:false, productId 없음)
        { isNotice: { $ne: true }, $or: [{ productId: { $exists: false } }, { productId: null }] },
      ],
    }).sort({ isNotice: -1, createdAt: -1 });

    console.log(`📦 [결과] 사용자 문의 + 공지 ${inquiries.length}건`);
    res.json(inquiries);
  } catch (err) {
    console.error("❌ 전체 문의 조회 실패:", err);
    res.status(500).json({ message: err.message });
  }
});

/* --------------------------------------------------------
 ✅ (2) 모든 문의글 + 공지글 조회 (/all 별칭)
   → 관리자용: 전체 데이터를 productId와 관계없이 반환
-------------------------------------------------------- */
router.get("/all", async (req, res) => {
  try {
    console.log("📥 [GET /api/inquiries/all] 전체 문의(All) 조회 요청 수신됨");
    const inquiries = await Inquiry.find().sort({ isNotice: -1, createdAt: -1 });
    console.log(`📦 [결과] 전체 문의/공지 ${inquiries.length}건`);
    res.json(inquiries);
  } catch (err) {
    console.error("❌ 전체(all) 조회 실패:", err);
    res.status(500).json({ message: err.message });
  }
});

/* --------------------------------------------------------
 ✅ (3) 특정 상품 문의 목록 (상품공지 포함)
-------------------------------------------------------- */
router.get("/:productId", async (req, res, next) => {
  const { productId } = req.params;
  console.log(`📥 [GET /api/inquiries/${productId}] 상품 문의 조회 요청`);

  // ✅ "notice"나 "all" 키워드는 상위 라우트로 넘김
  if (productId === "notice" || productId === "all") {
    console.log("➡️ 예약어(next) 라우트 이동:", productId);
    return next();
  }

  try {
    // ✅ 상품 문의 페이지 (특수 구분자)
    if (productId === "product-page") {
      const inquiries = await Inquiry.find({
        $or: [
          { isNotice: true, productId: "product-page" }, // 상품 공지
          { isNotice: { $ne: true }, productId: "product-page" }, // 상품 문의
        ],
      }).sort({ isNotice: -1, createdAt: -1 });

      console.log(`📦 [결과] 상품 문의 + 공지 ${inquiries.length}건`);
      return res.json(inquiries);
    }

    // ✅ 특정 상품별 문의 (ObjectId 검증)
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      console.warn("⚠️ 잘못된 상품 ID:", productId);
      return res.status(400).json({ message: "잘못된 상품 ID 형식입니다." });
    }

    const inquiries = await Inquiry.find({
      productId,
      isNotice: { $ne: true },
    }).sort({ createdAt: -1 });

    console.log(`📦 [결과] 상품별 문의 ${inquiries.length}건`);
    res.json(inquiries);
  } catch (err) {
    console.error("❌ 상품 문의 조회 실패:", err);
    res.status(500).json({ message: err.message });
  }
});

/* --------------------------------------------------------
 ✅ (4) 문의 등록 (로그인 필수 + 이메일 자동입력)
   → productId 정확히 전달되는지 로그로 검증
-------------------------------------------------------- */
router.post("/", protect, async (req, res) => {
  try {
    console.log("📩 [POST /api/inquiries] 문의 등록 요청 수신:", req.body);

    const user = req.user;
    const { question, answer, isPrivate, productId } = req.body;

    console.log("📦 요청 값:", {
      question,
      answer,
      isPrivate,
      productId,
      userEmail: user?.email,
    });

    if (!question || !answer) {
      return res.status(400).json({ message: "제목과 내용을 모두 입력해주세요." });
    }

    const email = user?.email || "";

    // ✅ productId가 정확히 넘어오는지 로그 확인
    console.log("🔍 전달된 productId =", productId);

    const newInquiry = new Inquiry({
      userName: email || "익명",
      question,
      answer,
      isPrivate: isPrivate || false,
      isNotice: false,
      // ✅ productId를 그대로 저장하되, 문자열일 경우 공백 제거
      productId: typeof productId === "string" && productId.trim() !== "" ? productId.trim() : undefined,
      email,
    });

    await newInquiry.save();

    // ✅ 문의 등록 후 확인 메일 전송
try {
  const lang = req.headers["x-app-language"] || "ko";
  const subject =
    lang === "th"
      ? "[OnYou] เราได้รับคำถามของคุณแล้ว"
      : lang === "en"
      ? "[OnYou] We've received your inquiry"
      : "[OnYou] 문의가 정상적으로 등록되었습니다.";

  const messageBody =
    lang === "th"
      ? `
        <div style="font-family:sans-serif;line-height:1.6">
          <h2>เราได้รับคำถามของคุณแล้ว</h2>
          <p>ทีมงานของเราจะตอบกลับโดยเร็วที่สุด</p>
          <p><strong>คำถาม:</strong> ${question}</p>
          <hr/>
          <p>ขอบคุณที่ติดต่อเรา<br/>ทีม OnYou</p>
        </div>
      `
      : lang === "en"
      ? `
        <div style="font-family:sans-serif;line-height:1.6">
          <h2>Your inquiry has been received</h2>
          <p>Our team will get back to you shortly.</p>
          <p><strong>Question:</strong> ${question}</p>
          <hr/>
          <p>Thank you for reaching out.<br/>- OnYou Support</p>
        </div>
      `
      : `
        <div style="font-family:sans-serif;line-height:1.6">
          <h2>문의가 정상적으로 등록되었습니다.</h2>
          <p>빠른 시일 내에 답변드리겠습니다.</p>
          <p><strong>문의 내용:</strong> ${question}</p>
          <hr/>
          <p>감사합니다.<br/>OnYou 고객센터</p>
        </div>
      `;

  if (email) {
    await resend.emails.send({
      from: "Onyou 고객센터 <no-reply@onyou.store>",
      to: email,
      subject,
      html: messageBody,
    });
    console.log("📤 문의 등록 확인 메일 전송 완료:", email);
  }
} catch (error) {
  console.error("❌ 문의 등록 확인 메일 전송 실패:", error);
}

    console.log("✅ 문의 등록 완료:", {
      _id: newInquiry._id,
      question: newInquiry.question,
      email: newInquiry.email,
      productId: newInquiry.productId || "(일반 문의)",
    });

    res.status(201).json(newInquiry);
  } catch (err) {
    console.error("❌ 문의 등록 실패:", err);
    res.status(400).json({ message: err.message });
  }
});
/* --------------------------------------------------------
 ✅ (5) 공지글 등록 (관리자 전용)
   → productId === 'product-page' → 상품공지
     나머지 → 사용자 문의용 공지
-------------------------------------------------------- */
router.post("/notice", protect, adminOnly, async (req, res) => {
  try {
    console.log("📢 [POST /api/inquiries/notice] 공지 등록 요청 수신:", req.body);

    const { question, answer, productId } = req.body;

    if (!question || !answer) {
      console.warn("⚠️ 공지 등록 실패 - 제목 또는 내용 누락");
      return res.status(400).json({ message: "공지 제목과 내용을 모두 입력해주세요." });
    }

    const newNotice = new Inquiry({
      userName: "관리자",
      question,
      answer,
      isNotice: true,
      isPrivate: false,
      productId: productId === "product-page" ? "product-page" : undefined,
    });

    await newNotice.save();

    console.log("✅ 공지 등록 완료:", {
      question: newNotice.question,
      productId: newNotice.productId || "(일반 공지)",
    });

    res.status(201).json({
      message:
        productId === "product-page"
          ? "✅ 상품 문의 공지가 등록되었습니다."
          : "✅ 일반 공지가 등록되었습니다.",
      notice: newNotice,
    });
  } catch (err) {
    console.error("❌ 공지 등록 실패:", err);
    res.status(400).json({ message: err.message });
  }
});

/* --------------------------------------------------------
 ✅ (6) 관리자 답변 등록 / 수정
-------------------------------------------------------- */
router.post("/:id/reply", protect, adminOnly, async (req, res) => {
  try {
    const { reply } = req.body;
    console.log(`📝 [POST /api/inquiries/${req.params.id}/reply] 답변 등록 요청`);

    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) {
      console.warn("⚠️ 존재하지 않는 문의글 ID:", req.params.id);
      return res.status(404).json({ message: "문의글을 찾을 수 없습니다." });
    }

    inquiry.reply = reply;
    inquiry.repliedAt = new Date();
    await inquiry.save();

    console.log("✅ 답변 저장 완료:", {
      id: inquiry._id,
      question: inquiry.question,
      email: inquiry.email,
    });

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
    console.log(`🗑️ [DELETE /api/inquiries/${req.params.id}] 문의 삭제 요청`);

    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) {
      console.warn("⚠️ 삭제 실패 - 문의 없음:", req.params.id);
      return res.status(404).json({ message: "문의글을 찾을 수 없습니다." });
    }

    const user = req.user;

    // ✅ 관리자 또는 본인 확인
    if (!user.isAdmin && inquiry.email !== user.email) {
      console.warn("⛔ 삭제 권한 없음:", user.email);
      return res.status(403).json({ message: "삭제 권한이 없습니다." });
    }

    await inquiry.deleteOne();

      console.log(`✅ 문의(${inquiry._id}) 삭제 완료 - ${inquiry.question}`);
    res.json({ message: "문의가 삭제되었습니다." });
  } catch (err) {
    console.error("❌ 문의 삭제 실패:", err);
    res.status(500).json({ message: err.message });
  }
});

/* --------------------------------------------------------
 ✅ 라우터 내보내기
-------------------------------------------------------- */
export default router;
