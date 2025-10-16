// 📁 server/routes/support.js
import express from "express";
import { Resend } from "resend";

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

// ✅ 고객센터 문의 이메일 전송
router.post("/", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: "모든 필드를 입력해주세요." });
    }

    // ✅ 1️⃣ 관리자에게 이메일 전송
    await resend.emails.send({
      from: "Onyou 고객센터 <no-reply@onyou.store>",
      to: "support@onyou.store", // ✅ 관리자 수신 이메일
      subject: `[고객문의] ${subject}`,
      html: `
        <h2>📩 새로운 고객 문의가 접수되었습니다.</h2>
        <p><strong>보낸 사람:</strong> ${name} (${email})</p>
        <p><strong>제목:</strong> ${subject}</p>
        <p><strong>내용:</strong></p>
        <div style="padding:10px;border:1px solid #ddd;border-radius:6px;background:#f9f9f9;">
          ${message.replace(/\n/g, "<br>")}
        </div>
        <br/>
        <p style="font-size:12px;color:#777;">관리자용 자동 알림 메일입니다.</p>
      `,
    });

    // ✅ 2️⃣ 사용자에게 자동 회신 이메일 전송
    await resend.emails.send({
      from: "Onyou 고객센터 <no-reply@onyou.store>",
      to: email,
      subject: "문의가 정상적으로 접수되었습니다.",
      html: `
        <h3>안녕하세요, ${name}님.</h3>
        <p>문의해주셔서 감사합니다. 아래와 같은 내용으로 문의가 접수되었습니다.</p>
        <div style="padding:10px;border:1px solid #ddd;border-radius:6px;background:#f9f9f9;margin-top:10px;">
          <p><strong>제목:</strong> ${subject}</p>
          <p><strong>내용:</strong></p>
          <p>${message.replace(/\n/g, "<br>")}</p>
        </div>
        <p>담당자가 확인 후 최대한 빠르게 회신드리겠습니다.</p>
        <p style="font-size:12px;color:#777;">이 메일은 자동 발송 메일입니다. 직접 회신하지 마세요.</p>
      `,
    });

    console.log(`✅ 고객 문의 접수됨: ${email}, 제목: ${subject}`);

    res.json({
      success: true,
      message: "문의가 정상적으로 접수되었습니다. 이메일을 확인해주세요.",
    });
  } catch (err) {
    console.error("📧 고객센터 메일 전송 오류:", err);
    res
      .status(500)
      .json({ message: "문의 전송 실패: " + (err.message || "Resend 오류") });
  }
});

export default router;
