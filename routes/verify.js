import express from "express";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();
const codes = {}; // 메모리 저장 (실서비스에서는 Redis 권장)

// ✅ 인증 코드 발송
router.post("/email", async (req, res) => {
  const { email } = req.body;
  const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6자리 코드
  codes[email] = code;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.MAIL_USER,
    to: email,
    subject: "Shop 회원가입 이메일 인증코드",
    text: `인증코드: ${code}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ message: "인증코드를 발송했습니다." });
  } catch (error) {
    console.error("메일 발송 오류:", error);
    res.status(500).json({ message: "메일 발송 실패" });
  }
});

// ✅ 인증 코드 검증
router.post("/email/verify", (req, res) => {
  const { email, code } = req.body;
  if (codes[email] && codes[email] === code) {
    delete codes[email];
    return res.json({ message: "인증 성공" });
  }
  res.status(400).json({ message: "인증코드가 일치하지 않습니다." });
});

export default router;
