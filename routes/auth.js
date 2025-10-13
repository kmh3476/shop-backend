// 📁 server/routes/auth.js
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";
import User from "../models/User.js";

const router = express.Router();

/* -------------------- ✅ 회원가입 -------------------- */
router.post("/signup", async (req, res) => {
  try {
    const { userId, nickname, name, email, password, phone } = req.body;

    // 1️⃣ 필수값 검증
    if (!userId || !nickname || !name || !email || !password || !phone) {
      return res.status(400).json({ message: "모든 필수 정보를 입력해주세요." });
    }

    // 2️⃣ 중복 확인 (아이디, 닉네임, 이메일)
    const existingUserId = await User.findOne({ userId });
    if (existingUserId) {
      return res.status(400).json({ message: "이미 존재하는 아이디입니다." });
    }

    const existingNickname = await User.findOne({ nickname });
    if (existingNickname) {
      return res.status(400).json({ message: "이미 사용 중인 닉네임입니다." });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: "이미 가입된 이메일입니다." });
    }

    // 3️⃣ User 모델의 pre('save')가 비밀번호 해싱 자동 처리
    const newUser = await User.create({
      userId,
      nickname,
      name,
      email,
      password,
      phone,
      emailVerified: false,
      phoneVerified: false,
    });

    // 4️⃣ JWT 발급
    const token = jwt.sign(
      { id: newUser._id, email: newUser.email, isAdmin: newUser.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // 5️⃣ 응답
    res.status(201).json({
      message: "회원가입 성공",
      token,
      user: {
        id: newUser._id,
        userId: newUser.userId,
        nickname: newUser.nickname,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        isAdmin: newUser.isAdmin,
        emailVerified: newUser.emailVerified,
        phoneVerified: newUser.phoneVerified,
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

    if ((!email && !userId) || !password) {
      return res
        .status(400)
        .json({ message: "아이디(또는 이메일)와 비밀번호를 입력해주세요." });
    }

    const user = await User.findOne({
      $or: [{ email }, { userId }],
    });
    if (!user) {
      return res.status(400).json({ message: "존재하지 않는 계정입니다." });
    }

    if (!user.emailVerified) {
      return res.status(400).json({ message: "이메일 인증이 필요합니다." });
    }

    if (!user.phoneVerified) {
      return res.status(400).json({ message: "휴대폰 인증이 필요합니다." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "비밀번호가 틀립니다." });
    }

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
        name: user.name,
        email: user.email,
        phone: user.phone,
        isAdmin: user.isAdmin,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
      },
    });
  } catch (err) {
    console.error("로그인 오류:", err);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

/* -------------------- ✅ 비밀번호 재설정 요청 -------------------- */
router.post("/forgot", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user)
      return res.status(400).json({ message: "등록되지 않은 이메일입니다." });

    // 1️⃣ 토큰 생성
    const resetToken = crypto.randomBytes(20).toString("hex");

    // 2️⃣ 링크 생성 (프론트엔드 경로 연결)
    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // 3️⃣ 이메일 전송 설정
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER, // Gmail 계정
        pass: process.env.SMTP_PASS, // 앱 비밀번호
      },
    });

    const mailOptions = {
      from: `"Shop Support" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "🔐 비밀번호 재설정 안내",
      html: `
        <h2>비밀번호 재설정 요청</h2>
        <p>아래 링크를 클릭하여 비밀번호를 재설정하세요. 링크는 30분 동안 유효합니다.</p>
        <a href="${resetLink}" style="color:#007bff;">비밀번호 재설정하기</a>
        <p>만약 본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.</p>
      `,
    };

    // 4️⃣ 이메일 발송
    await transporter.sendMail(mailOptions);

    console.log(`✅ 비밀번호 재설정 링크 전송: ${resetLink}`);

    // ⚙️ (선택) 토큰을 DB에 저장해 실제 검증 시 사용할 수 있음
    // user.resetToken = resetToken;
    // user.resetTokenExpire = Date.now() + 30 * 60 * 1000;
    // await user.save();

    res.json({ message: "비밀번호 재설정 링크를 이메일로 보냈습니다." });
  } catch (err) {
    console.error("비밀번호 재설정 오류:", err);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

export default router;
