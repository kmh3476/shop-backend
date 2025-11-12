// 📁 server/routes/support.js
import express from "express";
import { Resend } from "resend";
import rateLimit from "express-rate-limit";
import Support from "../models/Support.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

/* -------------------- ✅ 환경 변수 검증 -------------------- */
if (!process.env.RESEND_API_KEY)
  console.warn("⚠️ RESEND_API_KEY가 설정되어 있지 않습니다.");
if (!process.env.SUPPORT_EMAIL)
  console.warn("⚠️ SUPPORT_EMAIL이 설정되어 있지 않습니다. 기본 support@onyou.store 사용.");

/* ===========================================================
 🈶 다국어 템플릿 추가
=========================================================== */
const EMAIL_TEMPLATES = {
  ko: {
    subject_admin: (subject) => `[고객문의] ${subject}`,
    subject_user: "문의가 정상적으로 접수되었습니다.",
    admin_body: (name, email, subject, message) => `
      <h2>📩 새로운 고객 문의가 접수되었습니다.</h2>
      <p><strong>보낸 사람:</strong> ${name} (${email})</p>
      <p><strong>제목:</strong> ${subject}</p>
      <p><strong>내용:</strong></p>
      <div style="padding:10px;border:1px solid #ddd;background:#f9f9f9;">${message.replace(/\n/g, "<br>")}</div>
    `,
    user_body: (name, subject, message) => `
      <h3>안녕하세요, ${name}님.</h3>
      <p>문의해주셔서 감사합니다. 아래 내용으로 접수되었습니다.</p>
      <div style="padding:10px;border:1px solid #ddd;background:#f9f9f9;margin-top:10px;">
        <p><strong>제목:</strong> ${subject}</p>
        <p><strong>내용:</strong></p>
        <p>${message.replace(/\n/g, "<br>")}</p>
      </div>
      <p style="margin-top:16px;">담당자가 확인 후 빠르게 회신드리겠습니다.</p>
    `,
  },
  en: {
    subject_admin: (subject) => `[Customer Inquiry] ${subject}`,
    subject_user: "Your inquiry has been received successfully.",
    admin_body: (name, email, subject, message) => `
      <h2>📩 A new customer inquiry has been received.</h2>
      <p><strong>From:</strong> ${name} (${email})</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong></p>
      <div style="padding:10px;border:1px solid #ddd;background:#f9f9f9;">${message.replace(/\n/g, "<br>")}</div>
    `,
    user_body: (name, subject, message) => `
      <h3>Hello ${name},</h3>
      <p>Thank you for contacting us. We have received your message as below:</p>
      <div style="padding:10px;border:1px solid #ddd;background:#f9f9f9;margin-top:10px;">
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, "<br>")}</p>
      </div>
      <p style="margin-top:16px;">Our team will get back to you as soon as possible.</p>
    `,
  },
  th: {
    subject_admin: (subject) => `[แบบฟอร์มสอบถามลูกค้า] ${subject}`,
    subject_user: "เราได้รับคำถามของคุณแล้ว",
    admin_body: (name, email, subject, message) => `
      <h2>📩 มีคำถามใหม่จากลูกค้า</h2>
      <p><strong>จาก:</strong> ${name} (${email})</p>
      <p><strong>หัวข้อ:</strong> ${subject}</p>
      <p><strong>รายละเอียด:</strong></p>
      <div style="padding:10px;border:1px solid #ddd;background:#f9f9f9;">${message.replace(/\n/g, "<br>")}</div>
    `,
    user_body: (name, subject, message) => `
      <h3>สวัสดีคุณ ${name}</h3>
      <p>ขอบคุณสำหรับการติดต่อ เราได้รับคำถามของคุณเรียบร้อยแล้ว</p>
      <div style="padding:10px;border:1px solid #ddd;background:#f9f9f9;margin-top:10px;">
        <p><strong>หัวข้อ:</strong> ${subject}</p>
        <p><strong>รายละเอียด:</strong></p>
        <p>${message.replace(/\n/g, "<br>")}</p>
      </div>
      <p style="margin-top:16px;">ทีมงานของเราจะติดต่อกลับโดยเร็วที่สุด</p>
    `,
  },
};

/* -------------------- ✅ 언어 감지 함수 -------------------- */
function getLang(req) {
  const appLang = req.headers["x-app-language"];
  if (appLang && ["ko", "en", "th"].includes(appLang)) return appLang;
  const acceptLang = req.headers["accept-language"];
  if (!acceptLang) return "ko";
  const lang = acceptLang.split(",")[0].split("-")[0];
  return ["ko", "en", "th"].includes(lang) ? lang : "ko";
}
/* ===========================================================
 📮 문의 등록 (고객 → 관리자)
=========================================================== */
router.post("/send", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    const lang = getLang(req); // ✅ 언어 감지
    console.log("🌍 Detected language:", lang);

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "필수 항목이 누락되었습니다.",
      });
    }

    // ✅ DB 저장
    const inquiry = await Support.create({
      name,
      email,
      subject,
      message,
      lang,
      status: "pending",
      createdAt: new Date(),
    });

    console.log("📩 문의 DB 저장 완료:", inquiry._id);

    /* ==========================
       ✉️ 관리자용 이메일 전송
    ========================== */
    try {
      const adminEmail = process.env.SUPPORT_EMAIL || "support@onyou.store";
      const template = EMAIL_TEMPLATES[lang] || EMAIL_TEMPLATES.ko;

      console.log("📤 관리자에게 메일 전송 중...");

      const adminResult = await resend.emails.send({
        from: "Onyou 고객센터 <no-reply@onyou.store>",
        to: adminEmail,
        subject: template.subject_admin(subject),
        html: template.admin_body(name, email, subject, message),
      });

      console.log("✅ 관리자 메일 전송 성공:", adminResult?.id || "(no id)");
    } catch (err) {
      console.error("❌ 관리자 메일 전송 실패:", err.message);
    }

    /* ==========================
       📧 사용자용 이메일 전송
    ========================== */
    try {
      const template = EMAIL_TEMPLATES[lang] || EMAIL_TEMPLATES.ko;

      console.log("📤 사용자 확인 메일 전송 중...");

      const userResult = await resend.emails.send({
        from: "Onyou 고객센터 <no-reply@onyou.store>",
        to: email,
        subject: template.subject_user,
        html: template.user_body(name, subject, message),
      });

      console.log("✅ 사용자 메일 전송 성공:", userResult?.id || "(no id)");
    } catch (err) {
      console.error("❌ 사용자 메일 전송 실패:", err.message);
    }

    /* ==========================
       🟢 응답 반환
    ========================== */
    res.status(200).json({
      success: true,
      message:
        lang === "ko"
          ? "문의가 정상적으로 등록되었습니다."
          : lang === "en"
          ? "Your inquiry has been submitted successfully."
          : "แบบฟอร์มของคุณถูกส่งเรียบร้อยแล้ว",
      inquiry,
    });
  } catch (error) {
    console.error("문의 등록 처리 중 오류:", error);
    res.status(500).json({
      success: false,
      message: "서버 오류가 발생했습니다.",
      error: error.message,
    });
  }
});

/* ===========================================================
 🔁 문의 목록 조회 (관리자)
=========================================================== */
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const list = await Support.find().sort({ createdAt: -1 });
    res.json({ success: true, replies: list });
  } catch (err) {
    console.error("문의 목록 조회 오류:", err);
    res.status(500).json({ success: false, message: "서버 오류" });
  }
});

/* ===========================================================
 ✏️ 관리자 답변 (Resend 메일 정상 작동 확인됨)
=========================================================== */
router.post("/reply/:id", protect, adminOnly, async (req, res) => {
  try {
    const { reply } = req.body;
    const support = await Support.findById(req.params.id);
    if (!support) return res.status(404).json({ success: false, message: "문의 내역을 찾을 수 없습니다." });

    // DB 업데이트
    support.adminReply = reply;
    support.status = "answered";
    await support.save();

    const lang = support.lang || "ko";
    const template = EMAIL_TEMPLATES[lang] || EMAIL_TEMPLATES.ko;

    // 사용자에게 메일 발송
    const result = await resend.emails.send({
      from: "Onyou 고객센터 <no-reply@onyou.store>",
      to: support.email,
      subject:
        lang === "ko"
          ? "문의하신 내용에 대한 답변입니다."
          : lang === "en"
          ? "Response to your inquiry"
          : "คำตอบสำหรับคำถามของคุณ",
      html: `
        <h3>📬 ${template.subject_user}</h3>
        <p>${reply.replace(/\n/g, "<br>")}</p>
        <hr />
        <p style="font-size:12px;color:#999;">이메일을 통한 자동 발송입니다.</p>
      `,
    });

    console.log("✅ 답변 메일 전송 성공:", result?.id || "(no id)");
    res.json({ success: true, message: "답변이 전송되었습니다.", support });
  } catch (error) {
    console.error("답변 처리 오류:", error);
    res.status(500).json({ success: false, message: "서버 오류" });
  }
});
/* ===========================================================
 🗑️ 문의 삭제 (관리자)
=========================================================== */
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const support = await Support.findById(req.params.id);
    if (!support) {
      console.warn("⚠️ 삭제 시도: 존재하지 않는 문의 ID:", req.params.id);
      return res.status(404).json({
        success: false,
        message: "문의 내역을 찾을 수 없습니다.",
      });
    }

    await support.deleteOne();
    console.log("🗑️ 문의 삭제 완료:", req.params.id);

    res.json({
      success: true,
      message: "문의가 삭제되었습니다.",
    });
  } catch (error) {
    console.error("❌ 문의 삭제 중 오류:", error);
    res.status(500).json({
      success: false,
      message: "서버 오류가 발생했습니다.",
      error: error.message,
    });
  }
});

/* ===========================================================
 ⏱️ Rate Limiter (문의 남용 방지)
=========================================================== */
const contactLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 3, // 1분당 최대 3회
  message: {
    success: false,
    message: "너무 많은 요청입니다. 잠시 후 다시 시도해주세요.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ✅ limiter를 문의 등록에 적용
router.post("/send", contactLimiter, async (req, res, next) => {
  next();
});

/* ===========================================================
 🔍 상태 체크용 (Render 헬스체크 및 로그 테스트)
=========================================================== */
router.get("/health", (req, res) => {
  try {
    const lang = getLang(req);
    const msg =
      lang === "ko"
        ? "서버가 정상 작동 중입니다."
        : lang === "en"
        ? "Server is running normally."
        : "เซิร์ฟเวอร์ทำงานได้ตามปกติ";

    console.log("✅ [HEALTH CHECK]", new Date().toISOString(), "언어:", lang);
    res.json({ success: true, message: msg });
  } catch (error) {
    console.error("❌ 헬스체크 오류:", error);
    res.status(500).json({ success: false, message: "서버 상태 점검 실패" });
  }
});

/* ===========================================================
 🚀 디버그용 - 이메일 테스트 엔드포인트
=========================================================== */
router.post("/test-mail", async (req, res) => {
  try {
    const lang = getLang(req);
    const template = EMAIL_TEMPLATES[lang] || EMAIL_TEMPLATES.ko;
    const testAddress = req.body?.to || process.env.SUPPORT_EMAIL;

    console.log("📤 테스트 메일 전송 대상:", testAddress);

    const result = await resend.emails.send({
      from: "Onyou 고객센터 <no-reply@onyou.store>",
      to: testAddress,
      subject: template.subject_user,
      html: template.user_body("테스트 사용자", "테스트 메일", "이 메일은 테스트용입니다."),
    });

    console.log("✅ 테스트 메일 전송 성공:", result?.id || "(no id)");

    res.json({
      success: true,
      message:
        lang === "ko"
          ? "테스트 메일이 전송되었습니다."
          : lang === "en"
          ? "Test mail sent successfully."
          : "ส่งอีเมลทดสอบเรียบร้อยแล้ว",
      result,
    });
  } catch (error) {
    console.error("❌ 테스트 메일 전송 실패:", error);
    res.status(500).json({
      success: false,
      message: "테스트 메일 전송 실패",
      error: error.message,
    });
  }
});

/* ===========================================================
 ✅ 기본 내보내기
=========================================================== */
export default router;
