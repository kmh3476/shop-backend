// 📁 server/routes/support.js
import express from "express";
import { Resend } from "resend";
import rateLimit from "express-rate-limit";
import Support from "../models/Support.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js"; // ✅ 추가

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

/* -------------------- ✅ 환경 변수 검증 -------------------- */
if (!process.env.RESEND_API_KEY)
  console.warn("⚠️ RESEND_API_KEY가 설정되어 있지 않습니다.");
if (!process.env.SUPPORT_EMAIL)
  console.warn("⚠️ SUPPORT_EMAIL이 설정되어 있지 않습니다. 기본 support@onyou.store 사용.");

/* -------------------- ✅ rate-limit 설정 -------------------- */
const supportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { success: false, message: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
});
router.use(supportLimiter);

/* -------------------- ✅ HTML escape (XSS 방지) -------------------- */
function escapeHTML(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* -------------------- ✅ 이메일 유효성 검사 -------------------- */
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/* -------------------- ✅ 문의 등록 -------------------- */
router.post("/", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!email || !message)
      return res.status(400).json({ message: "이메일과 내용을 입력해주세요." });
    if (!isValidEmail(email))
      return res.status(400).json({ message: "유효한 이메일 주소가 아닙니다." });

    const safeSubject = subject?.trim() || "고객 문의";
    const safeName = escapeHTML(name?.trim() || "고객");
    const safeEmail = escapeHTML(email.trim());
    const safeMessage = escapeHTML(message.trim());
    const adminEmail = process.env.SUPPORT_EMAIL || "support@onyou.store";

    // ✅ 관리자에게 이메일 발송
    await resend.emails.send({
      from: "Onyou 고객센터 <no-reply@onyou.store>",
      to: adminEmail,
      subject: `[고객문의] ${safeSubject}`,
      html: `
        <h2>📩 새로운 고객 문의가 접수되었습니다.</h2>
        <p><strong>보낸 사람:</strong> ${safeName} (${safeEmail})</p>
        <p><strong>제목:</strong> ${safeSubject}</p>
        <p><strong>내용:</strong></p>
        <div style="padding:10px;border:1px solid #ddd;background:#f9f9f9;">
          ${safeMessage.replace(/\n/g, "<br>")}
        </div>
      `,
    });

    // ✅ 사용자 자동 회신
    await resend.emails.send({
      from: "Onyou 고객센터 <no-reply@onyou.store>",
      to: safeEmail,
      subject: "문의가 정상적으로 접수되었습니다.",
      html: `
        <h3>안녕하세요, ${safeName}님.</h3>
        <p>문의해주셔서 감사합니다. 아래 내용으로 접수되었습니다.</p>
        <div style="padding:10px;border:1px solid #ddd;background:#f9f9f9;margin-top:10px;">
          <p><strong>제목:</strong> ${safeSubject}</p>
          <p><strong>내용:</strong></p>
          <p>${safeMessage.replace(/\n/g, "<br>")}</p>
        </div>
        <p style="margin-top:16px;">담당자가 확인 후 빠르게 회신드리겠습니다.</p>
      `,
    });

    // ✅ DB 저장
    const newSupport = await Support.create({
      name: safeName,
      email: safeEmail,
      subject: safeSubject,
      message: safeMessage,
      isRead: false, // 새 문의는 기본적으로 읽지 않음
    });

    res.json({
      success: true,
      message: "문의가 접수되었습니다. 이메일을 확인해주세요.",
      data: newSupport,
    });
  } catch (err) {
    console.error("📧 문의 전송 오류:", err);
    res.status(500).json({
      success: false,
      message: "문의 전송 실패: " + (err.message || "Resend 오류"),
    });
  }
});

/* -------------------- ✅ (관리자 전용) 문의 전체 조회 -------------------- */
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const supports = await Support.find().sort({ createdAt: -1 });
    res.json(supports);
  } catch (err) {
    res.status(500).json({ message: "조회 실패: " + err.message });
  }
});

/* -------------------- ✅ (관리자 전용) 특정 문의 조회 -------------------- */
router.get("/:id", protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const inquiry = await Support.findById(id);
    if (!inquiry)
      return res.status(404).json({ message: "문의 내역을 찾을 수 없습니다." });

    // ✅ 읽음 처리
    if (!inquiry.isRead) {
      inquiry.isRead = true;
      await inquiry.save();
    }

    res.json(inquiry);
  } catch (err) {
    res.status(500).json({ message: "조회 실패: " + err.message });
  }
});

/* -------------------- ✅ (관리자 전용) 답변 전송 -------------------- */
router.post("/:id/reply", protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;

    if (!reply)
      return res.status(400).json({ message: "답변 내용을 입력해주세요." });

    const inquiry = await Support.findById(id);
    if (!inquiry)
      return res.status(404).json({ message: "문의 내역을 찾을 수 없습니다." });

    await resend.emails.send({
      from: "Onyou 고객센터 <no-reply@onyou.store>",
      to: inquiry.email,
      subject: `[답변] ${inquiry.subject}`,
      html: `
        <h3>안녕하세요, ${inquiry.name}님.</h3>
        <p>문의하신 내용에 대한 답변입니다:</p>
        <blockquote style="border-left:3px solid #ccc;padding-left:10px;color:#555;">
          ${inquiry.message.replace(/\n/g, "<br>")}
        </blockquote>
        <hr/>
        <p><strong>관리자 답변:</strong></p>
        <p>${escapeHTML(reply).replace(/\n/g, "<br>")}</p>
      `,
    });

    inquiry.reply = reply;
    inquiry.repliedAt = new Date();
    inquiry.isRead = true; // ✅ 답변 시 읽음 처리
    await inquiry.save();

    res.json({ success: true, message: "답변이 성공적으로 전송되었습니다." });
  } catch (err) {
    console.error("📧 답변 전송 오류:", err);
    res.status(500).json({ message: "답변 전송 실패: " + err.message });
  }
});

export default router;
