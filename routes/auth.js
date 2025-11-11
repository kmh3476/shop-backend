import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Resend } from "resend";
import User from "../models/User.js";

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);
const emailVerificationCodes = new Map();

/* -------------------------------------------------
🆕 i18n 보강 (추가만 함)
-------------------------------------------------- */
const MESSAGES = {
  ko: {
    duplicate_check_error: "중복 확인 중 오류가 발생했습니다.",
    email_sent: "인증 코드가 이메일로 전송되었습니다.",
    email_verified: "이메일 인증이 완료되었습니다.",
    signup_success: "회원가입이 완료되었습니다.",
    signup_error: "회원가입 중 오류가 발생했습니다.",
    login_success: "로그인 성공",
    login_failed: "로그인 실패. 아이디나 비밀번호를 확인해주세요.",
    refresh_failed: "토큰 갱신 실패",
    reset_sent: "비밀번호 재설정 링크를 이메일로 전송했습니다.",
    reset_failed: "비밀번호 재설정 중 오류가 발생했습니다.",
  },
  en: {
    duplicate_check_error: "An error occurred while checking duplicates.",
    email_sent: "Verification code sent to your email.",
    email_verified: "Email verification completed.",
    signup_success: "Sign-up successful.",
    signup_error: "An error occurred during sign-up.",
    login_success: "Login successful.",
    login_failed: "Login failed. Please check your credentials.",
    refresh_failed: "Token refresh failed.",
    reset_sent: "Password reset link sent to your email.",
    reset_failed: "An error occurred while resetting the password.",
  },
  th: {
    duplicate_check_error: "เกิดข้อผิดพลาดระหว่างการตรวจสอบข้อมูลซ้ำ",
    email_sent: "รหัสยืนยันถูกส่งไปยังอีเมลของคุณแล้ว",
    email_verified: "ยืนยันอีเมลสำเร็จ!",
    signup_success: "สมัครสมาชิกสำเร็จ!",
    signup_error: "เกิดข้อผิดพลาดระหว่างการสมัครสมาชิก",
    login_success: "เข้าสู่ระบบสำเร็จ!",
    login_failed: "เข้าสู่ระบบล้มเหลว กรุณาตรวจสอบข้อมูลอีกครั้ง",
    refresh_failed: "การต่ออายุโทเค็นล้มเหลว",
    reset_sent: "ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลของคุณแล้ว",
    reset_failed: "เกิดข้อผิดพลาดระหว่างการรีเซ็ตรหัสผ่าน",
  },
};

// 언어 감지 함수
function getLang(req) {
  const acceptLang = req.headers["accept-language"];
  if (!acceptLang) return "th"; // 기본은 태국어
  const lang = acceptLang.split(",")[0].split("-")[0];
  return ["ko", "en", "th"].includes(lang) ? lang : "th";
}

// t() 생성기
function tFactory(lang) {
  return (key) => MESSAGES[lang]?.[key] || MESSAGES.th[key] || key;
}

// 모든 요청에 언어 감지 미들웨어 적용
router.use((req, res, next) => {
  const lang = getLang(req);
  res.locals.lang = lang;
  res.locals.t = tFactory(lang);
  next();
});

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
    res.status(500).json({
      message: "서버 오류",
      i18n: { code: "duplicate_check_error", text: res.locals.t("duplicate_check_error") },
    });
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

    setTimeout(() => emailVerificationCodes.delete(email), 10 * 60 * 1000);

    const { error } = await resend.emails.send({
      from: process.env.EMAIL_SENDER,
      to: [email],
      subject: "📧 이메일 인증 코드",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6">
          <h2>Shop Onyou 이메일 인증</h2>
          <p>아래 인증 코드를 입력해 이메일 인증을 완료해주세요.</p>
          <div style="font-size:22px;font-weight:bold;color:#007bff;">${code}</div>
          <p>이 코드는 10분 동안만 유효합니다.<br/>감사합니다.<br/>- Onyou 팀</p>
        </div>
      `,
    });

    if (error) throw new Error(error.message);

    console.log(`✅ 인증 코드 전송됨: ${email}, 코드: ${code}`);
    res.json({
      success: true,
      message: "인증 코드가 이메일로 전송되었습니다.",
      i18n: { code: "email_sent", text: res.locals.t("email_sent") },
    });
  } catch (err) {
    console.error("Resend 이메일 전송 오류:", err);
    res.status(500).json({
      message: "이메일 전송 실패: " + err.message,
      i18n: { code: "email_sent", text: res.locals.t("email_sent") },
    });
  }
});
/* -------------------- ✅ 이메일 인증 코드 검증 -------------------- */
router.post("/verify-email-code", async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code)
      return res.status(400).json({
        message: "이메일과 인증 코드를 입력해주세요.",
        i18n: { code: "email_verified", text: res.locals.t("email_verified") },
      });

    const record = emailVerificationCodes.get(email);
    if (!record)
      return res.status(400).json({
        message: "인증 코드가 존재하지 않습니다.",
        i18n: { code: "email_verified", text: res.locals.t("email_verified") },
      });

    if (Date.now() > record.expires) {
      emailVerificationCodes.delete(email);
      return res.status(400).json({
        message: "인증 코드가 만료되었습니다.",
        i18n: { code: "email_verified", text: res.locals.t("email_verified") },
      });
    }

    if (record.code !== code)
      return res.status(400).json({
        message: "인증 코드가 올바르지 않습니다.",
        i18n: { code: "email_verified", text: res.locals.t("email_verified") },
      });

    emailVerificationCodes.delete(email);
    res.json({
      success: true,
      message: "이메일 인증이 완료되었습니다.",
      i18n: { code: "email_verified", text: res.locals.t("email_verified") },
    });
  } catch (err) {
    console.error("인증 코드 검증 오류:", err);
    res.status(500).json({
      message: "서버 오류",
      i18n: { code: "email_verified", text: res.locals.t("email_verified") },
    });
  }
});

/* -------------------- ✅ 회원가입 -------------------- */
router.post("/signup", async (req, res) => {
  try {
    const { userId, nickname, email, password, emailVerified } = req.body;

    if (!userId || !nickname || !email || !password)
      return res.status(400).json({
        message: "모든 필수 정보를 입력해주세요.",
        i18n: { code: "signup_error", text: res.locals.t("signup_error") },
      });

    if (!emailVerified)
      return res.status(400).json({
        message: "이메일 인증을 완료해주세요.",
        i18n: { code: "signup_error", text: res.locals.t("signup_error") },
      });

    const existingUser = await User.findOne({
      $or: [{ userId }, { nickname }, { email }],
    });
    if (existingUser)
      return res.status(400).json({
        message: "이미 존재하는 계정 정보가 있습니다.",
        i18n: { code: "signup_error", text: res.locals.t("signup_error") },
      });

    const newUser = await User.create({
      userId,
      nickname,
      email,
      password,
      emailVerified: true,
    });

    const token = jwt.sign(
      { id: newUser._id, email: newUser.email, isAdmin: newUser.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const refreshToken = jwt.sign(
      { id: newUser._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "회원가입이 완료되었습니다.",
      i18n: { code: "signup_success", text: res.locals.t("signup_success") },
      token,
      refreshToken,
      user: {
        id: newUser._id,
        userId: newUser.userId,
        nickname: newUser.nickname,
        email: newUser.email,
        isAdmin: newUser.isAdmin,
      },
    });
  } catch (err) {
    console.error("회원가입 오류:", err);
    res.status(500).json({
      message: "서버 오류가 발생했습니다.",
      i18n: { code: "signup_error", text: res.locals.t("signup_error") },
    });
  }
});

/* -------------------- ✅ 로그인 -------------------- */
router.post("/login", async (req, res) => {
  try {
    const { userId, email, password } = req.body;
    const loginInput = email || userId;

    if (!loginInput || !password)
      return res.status(400).json({
        message: "아이디(또는 이메일)와 비밀번호를 입력해주세요.",
        i18n: { code: "login_failed", text: res.locals.t("login_failed") },
      });

    const user = await User.findOne({
      $or: [{ email: loginInput }, { userId: loginInput }],
    }).select("+password");

    if (!user)
      return res.status(400).json({
        message: "존재하지 않는 계정입니다.",
        i18n: { code: "login_failed", text: res.locals.t("login_failed") },
      });

    if (!user.emailVerified)
      return res.status(400).json({
        message: "이메일 인증 후 로그인할 수 있습니다.",
        i18n: { code: "login_failed", text: res.locals.t("login_failed") },
      });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({
        message: "비밀번호가 틀립니다.",
        i18n: { code: "login_failed", text: res.locals.t("login_failed") },
      });

    const token = jwt.sign(
      { id: user._id, email: user.email, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "로그인 성공",
      i18n: { code: "login_success", text: res.locals.t("login_success") },
      token,
      refreshToken,
      user: {
        id: user._id,
        userId: user.userId,
        nickname: user.nickname,
        email: user.email,
        isAdmin: user.isAdmin,
      },
    });
  } catch (err) {
    console.error("로그인 오류:", err);
    res.status(500).json({
      message: "서버 오류가 발생했습니다.",
      i18n: { code: "login_failed", text: res.locals.t("login_failed") },
    });
  }
});
/* -------------------- ✅ 🔄 Refresh Token 으로 Access Token 재발급 -------------------- */
router.post("/refresh", async (req, res) => {
  const { token } = req.body;
  if (!token)
    return res.status(401).json({
      message: "리프레시 토큰이 없습니다.",
      i18n: { code: "refresh_failed", text: res.locals.t("refresh_failed") },
    });

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const newAccess = jwt.sign(
      { id: decoded.id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.json({
      message: "토큰 갱신 성공",
      i18n: { code: "refresh_success", text: res.locals.t("login_success") },
      token: newAccess,
    });
  } catch (err) {
    console.error("❌ 리프레시 토큰 검증 실패:", err);
    res.status(403).json({
      message: "유효하지 않거나 만료된 리프레시 토큰입니다.",
      i18n: { code: "refresh_failed", text: res.locals.t("refresh_failed") },
    });
  }
});

/* -------------------- ✅ 비밀번호 재설정 링크 발송 -------------------- */
router.post("/forgot", async (req, res) => {
  try {
    const { userId, email } = req.body;
    if (!userId || !email)
      return res.status(400).json({
        message: "아이디와 이메일을 모두 입력해주세요.",
        i18n: { code: "reset_failed", text: res.locals.t("reset_failed") },
      });

    const user = await User.findOne({ userId, email });
    if (!user)
      return res.status(400).json({
        message: "입력한 아이디와 이메일이 일치하지 않습니다.",
        i18n: { code: "reset_failed", text: res.locals.t("reset_failed") },
      });

    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetExpires = Date.now() + 30 * 60 * 1000;

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
    res.json({
      message: "비밀번호 재설정 링크를 이메일로 전송했습니다.",
      i18n: { code: "reset_sent", text: res.locals.t("reset_sent") },
    });
  } catch (err) {
    console.error("비밀번호 재설정 오류:", err);
    res.status(500).json({
      message: "서버 오류가 발생했습니다.",
      i18n: { code: "reset_failed", text: res.locals.t("reset_failed") },
    });
  }
});

export default router;
