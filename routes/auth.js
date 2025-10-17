// 📁 server/routes/auth.js
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Resend } from "resend";
import User from "../models/User.js";

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);
const emailVerificationCodes = new Map();

/* -------------------- ✅ 아이디/닉네임/이메일 중복 확인 -------------------- */
router.post("/check-id", async (req, res) => {
  try {
    const { userId, nickname, email } = req.body;

    if (userId) {
      const exists = await User.findOne({ userId });
      return res.json({ exists: !!exists });
    }
    if (nickname) {
      const exists = await User.findOne({ nickname });
      return res.json({ exists: !!exists });
    }
    if (email) {
      const exists = await User.findOne({ email });
      return res.json({ exists: !!exists });
    }

    res.status(400).json({ message: "확인할 값이 없습니다." });
  } catch (err) {
    console.error("중복 확인 오류:", err);
    res.status(500).json({ message: "서버 오류" });
  }
});

/* -------------------- ✅ 이메일 인증 코드 전송 -------------------- */
router.post("/send-email-code", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ message: "이메일을 입력해주세요." });

    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ message: "이미 가입된 이메일입니다." });

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    emailVerificationCodes.set(email, {
      code,
      expires: Date.now() + 10 * 60 * 1000,
    });

    // 자동 삭제
    setTimeout(() => emailVerificationCodes.delete(email), 10 * 60 * 1000);

    const { error } = await resend.emails.send({
      from: process.env.EMAIL_SENDER,
      to: [email],
      subject: "📧 이메일 인증 코드",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6">
          <h2>Shop Onyou 이메일 인증</h2>
          <p>안녕하세요! 아래 인증 코드를 입력해 이메일 인증을 완료해주세요.</p>
          <div style="font-size:22px;font-weight:bold;color:#007bff;">${code}</div>
          <p>이 코드는 10분 동안만 유효합니다.<br/>감사합니다.<br/>- Onyou 팀</p>
        </div>
      `,
    });

    if (error) throw new Error(error.message);

    console.log(`✅ 인증 코드 전송됨: ${email}, 코드: ${code}`);
    res.json({ success: true, message: "인증 코드가 이메일로 전송되었습니다." });
  } catch (err) {
    console.error("Resend 이메일 전송 오류:", err);
    res.status(500).json({ message: "이메일 전송 실패: " + err.message });
  }
});

/* -------------------- ✅ 이메일 인증 코드 검증 -------------------- */
router.post("/verify-email-code", async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code)
      return res.status(400).json({ message: "이메일과 인증 코드를 입력해주세요." });

    const record = emailVerificationCodes.get(email);
    if (!record)
      return res.status(400).json({ message: "인증 코드가 존재하지 않습니다." });

    if (Date.now() > record.expires) {
      emailVerificationCodes.delete(email);
      return res.status(400).json({ message: "인증 코드가 만료되었습니다." });
    }

    if (record.code !== code)
      return res.status(400).json({ message: "인증 코드가 올바르지 않습니다." });

    emailVerificationCodes.delete(email);
    res.json({ success: true, message: "이메일 인증이 완료되었습니다." });
  } catch (err) {
    console.error("인증 코드 검증 오류:", err);
    res.status(500).json({ message: "서버 오류" });
  }
});

/* -------------------- ✅ 회원가입 -------------------- */
router.post("/signup", async (req, res) => {
  try {
    const { userId, nickname, email, password, emailVerified } = req.body;

    if (!userId || !nickname || !email || !password)
      return res.status(400).json({ message: "모든 필수 정보를 입력해주세요." });

    if (!emailVerified)
      return res.status(400).json({ message: "이메일 인증을 완료해주세요." });

    const existingUser = await User.findOne({
      $or: [{ userId }, { nickname }, { email }],
    });
    if (existingUser)
      return res.status(400).json({ message: "이미 존재하는 계정 정보가 있습니다." });

    const newUser = await User.create({
      userId,
      nickname,
      email,
      password, // pre('save')에서 해싱됨
      emailVerified: true,
    });

    const token = jwt.sign(
      { id: newUser._id, email: newUser.email, isAdmin: newUser.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(201).json({
      message: "회원가입이 완료되었습니다.",
      token,
      user: {
        id: newUser._id,
        userId: newUser.userId,
        nickname: newUser.nickname,
        email: newUser.email,
        isAdmin: newUser.isAdmin, // ✅ 관리자 여부 포함
      },
    });
  } catch (err) {
    console.error("회원가입 오류:", err);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

/* -------------------- ✅ 로그인 -------------------- */
router.post("/login", async (req, res) => {
  try {
    const { userId, email, password } = req.body;
    const loginInput = email || userId;

    if (!loginInput || !password)
      return res
        .status(400)
        .json({ message: "아이디(또는 이메일)와 비밀번호를 입력해주세요." });

    const user = await User.findOne({
      $or: [{ email: loginInput }, { userId: loginInput }],
    });

    if (!user)
      return res.status(400).json({ message: "존재하지 않는 계정입니다." });

    if (!user.emailVerified)
      return res.status(400).json({ message: "이메일 인증 후 로그인할 수 있습니다." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "비밀번호가 틀립니다." });

    const token = jwt.sign(
      { id: user._id, email: user.email, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "로그인 성공",
      token,
      user: {
        id: user._id,
        userId: user.userId,
        nickname: user.nickname,
        email: user.email,
        isAdmin: user.isAdmin, // ✅ 관리자 여부 반드시 포함
      },
    });
  } catch (err) {
    console.error("로그인 오류:", err);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

/* -------------------- ✅ 비밀번호 재설정 링크 발송 -------------------- */
router.post("/forgot", async (req, res) => {
  try {
    const { userId, email } = req.body;
    if (!userId || !email)
      return res.status(400).json({ message: "아이디와 이메일을 모두 입력해주세요." });

    const user = await User.findOne({ userId, email });
    if (!user)
      return res.status(400).json({ message: "입력한 아이디와 이메일이 일치하지 않습니다." });

    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetExpires = Date.now() + 30 * 60 * 1000; // 30분

    user.resetToken = resetToken;
    user.resetExpires = resetExpires;
    await user.save();

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const { error } = await resend.emails.send({
      from: process.env.EMAIL_SENDER,
      to: [email],
      subject: "🔐 비밀번호 재설정 안내",
      html: `
        <h2>비밀번호 재설정 요청</h2>
        <p>아래 버튼을 눌러 새 비밀번호를 설정하세요.</p>
        <a href="${resetLink}" style="display:inline-block;background:#007bff;color:white;padding:10px 20px;border-radius:5px;text-decoration:none;">비밀번호 재설정하기</a>
        <p>이 링크는 30분 동안 유효합니다.</p>
      `,
    });

    if (error) throw new Error(error.message);

    console.log(`✅ 비밀번호 재설정 링크 전송됨: ${resetLink}`);
    res.json({ message: "비밀번호 재설정 링크를 이메일로 전송했습니다." });
  } catch (err) {
    console.error("비밀번호 재설정 오류:", err);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

/* -------------------- ✅ 실제 비밀번호 재설정 -------------------- */
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword)
      return res.status(400).json({ message: "유효하지 않은 요청입니다." });

    const user = await User.findOne({
      resetToken: token,
      resetExpires: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).json({ message: "토큰이 유효하지 않거나 만료되었습니다." });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetToken = undefined;
    user.resetExpires = undefined;
    await user.save();

    res.json({ message: "비밀번호가 성공적으로 재설정되었습니다." });
  } catch (err) {
    console.error("비밀번호 재설정 처리 오류:", err);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

export default router;
