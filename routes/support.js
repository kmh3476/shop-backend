// 📁 server/routes/support.js
import express from "express";
import { Resend } from "resend";

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

// ✅ HTML escape (XSS 방지용)
function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ✅ 고객센터 문의 이메일 전송
router.post("/", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: "모든 필드를 입력해주세요." });
    }

    // subject가 없을 경우 자동 생성
    const safeSubject = subject?.trim() || "고객 문의";

    // HTML escape 처리
    const safeName = escapeHTML(name);
    const safeEmail = escapeHTML(email);
    const safeMessage = escapeHTML(message);

    // ✅ 1️⃣ 관리자에게 이메일 전송
    const adminEmail = process.env.SUPPORT_EMAIL || "support@onyou.store";

    const adminMail = await resend.emails.send({
      from: "Onyou 고객센터 <no-reply@onyou.store>",
      to: adminEmail,
      subject: `[고객문의] ${safeSubject}`,
      html: `
        <h2>📩 새로운 고객 문의가 접수되었습니다.</h2>
        <p><strong>보낸 사람:</strong> ${safeName} (${safeEmail})</p>
        <p><strong>제목:</strong> ${safeSubject}</p>
        <p><strong>내용:</strong></p>
        <div style="padding:10px;border:1px solid #ddd;border-radius:6px;background:#f9f9f9;">
          ${safeMessage.replace(/\n/g, "<br>")}
        </div>
        <br/>
        <p style="font-size:12px;color:#777;">관리자용 자동 알림 메일입니다.</p>
      `,
    });

    if (!adminMail || adminMail.error) {
      console.error("❌ 관리자 이메일 전송 실패:", adminMail.error);
      throw new Error("관리자 이메일 전송 실패");
    }

    // ✅ 2️⃣ 사용자에게 자동 회신 이메일 전송
    const userMail = await resend.emails.send({
      from: "Onyou 고객센터 <no-reply@onyou.store>",
      to: safeEmail,
      subject: "문의가 정상적으로 접수되었습니다.",
      html: `
        <h3>안녕하세요, ${safeName}님.</h3>
        <p>문의해주셔서 감사합니다. 아래와 같은 내용으로 문의가 접수되었습니다.</p>
        <div style="padding:10px;border:1px solid #ddd;border-radius:6px;background:#f9f9f9;margin-top:10px;">
          <p><strong>제목:</strong> ${safeSubject}</p>
          <p><strong>내용:</strong></p>
          <p>${safeMessage.replace(/\n/g, "<br>")}</p>
        </div>
        <p style="margin-top:16px;">담당자가 확인 후 최대한 빠르게 회신드리겠습니다.</p>
        <p style="font-size:12px;color:#777;">이 메일은 자동 발송 메일입니다. 직접 회신하지 마세요.</p>
      `,
    });

    if (!userMail || userMail.error) {
      console.error("⚠️ 사용자 자동 회신 메일 실패:", userMail.error);
    }

    console.log(`✅ 고객 문의 접수됨: ${safeEmail}, 제목: ${safeSubject}`);

    res.json({
      success: true,
      message: "문의가 정상적으로 접수되었습니다. 이메일을 확인해주세요.",
    });
  } catch (err) {
    console.error("📧 고객센터 메일 전송 오류:", err);
    res.status(500).json({
      success: false,
      message: "문의 전송 실패: " + (err.message || "Resend 오류"),
    });
  }
});

export default router;
