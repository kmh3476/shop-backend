import express from "express";
import Inquiry from "../models/Inquiry.js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const router = express.Router();

// ✅ 전체 문의 + 공지글 조회 (고객센터용)
router.get("/", async (req, res) => {
  try {
    const inquiries = await Inquiry.find().sort({ isNotice: -1, createdAt: -1 });
    res.json(inquiries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ 모든 문의글 + 공지글 조회 (/all 별칭)
router.get("/all", async (req, res) => {
  try {
    const inquiries = await Inquiry.find().sort({ isNotice: -1, createdAt: -1 });
    res.json(inquiries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ 특정 상품 문의 목록 (공지글 포함)
router.get("/:productId", async (req, res, next) => {
  if (req.params.productId === "notice" || req.params.productId === "all") {
    return next();
  }

  try {
    const inquiries = await Inquiry.find({
      $or: [
        { productId: req.params.productId },
        { isNotice: true },
      ],
    }).sort({ isNotice: -1, createdAt: -1 });

    res.json(inquiries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ 문의 등록 (일반 사용자)
router.post("/", async (req, res) => {
  try {
    const { email, question, answer, isPrivate, productId } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ message: "제목과 내용을 모두 입력해주세요." });
    }

    const newInquiry = new Inquiry({
      userName: email || "익명",
      question,
      answer,
      isPrivate: isPrivate || false,
      isNotice: false,
      productId: productId || undefined,
      email: email || "",
    });

    await newInquiry.save();

    // ✅ 문의 등록 후 이메일 발송
    if (email) {
      try {
        await resend.emails.send({
          from: "support@onyou.store", // ✅ 실제 Resend 인증된 도메인 사용
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

// ✅ 공지글 등록 (관리자 전용)
router.post("/notice", async (req, res) => {
  try {
    const { question, answer } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ message: "공지 제목과 내용을 모두 입력해주세요." });
    }

    const newNotice = new Inquiry({
      userName: "관리자",
      question,
      answer,
      isNotice: true,
      isPrivate: false,
    });

    await newNotice.save();

    res.status(201).json({
      message: "공지글이 등록되었습니다.",
      notice: newNotice,
    });
  } catch (err) {
    console.error("❌ 공지 등록 실패:", err);
    res.status(400).json({ message: err.message });
  }
});

// ✅ 관리자 답변 등록/수정
router.post("/:id/reply", async (req, res) => {
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

export default router;
