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

    if (!userId || !nickname || !name || !email || !password || !phone) {
      return res.status(400).json({ message: "모든 필수 정보를 입력해주세요." });
    }

    // 중복 확인
    const existingUserId = await User.findOne({ userId });
    if (existingUserId)
      return res.status(400).json({ message: "이미 존재하는 아이디입니다." });

    const existingNickname = await User.findOne({ nickname });
    if (existingNickname)
      return res.status(400).json({ message: "이미 사용 중인 닉네임입니다." });

    const existingEmail = await User.findOne({ email });
    if (existingEmail)
      return res.status(400).json({ message: "이미 가입된 이메일입니다." });

    // 회원 생성
    const newUser = await User.create({
      userId,
      nickname,
      name,
      email,
      password,
      phone,
      emailVerified: false, // 이메일 인증용 필드 (나중에 사용할 수 있음)
    });

    const token = jwt.sign(
      { id: newUser._id, email: newUser.email, isAdmin: newUser.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

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
      },
    });
  } catch (err) {
    console.error("로그인 오류:", err);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

/* -------------------- ✅ 아이디 찾기 -------------------- */
router.post("/find-id", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ message: "이메일을 입력해주세요." });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "등록된 이메일이 없습니다." });

    // 아이디 일부 마스킹 (앞 2글자 + 뒤 2글자만 표시)
    const maskedId = user.userId.replace(/(?<=^.{2}).(?=.{2}$)/g, "*");

    res.json({
      message: "아이디를 찾았습니다.",
      userId: maskedId,
    });
  } catch (err) {
    console.error("아이디 찾기 오류:", err);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

/* -------------------- ✅ 비밀번호 재설정 링크 발송 -------------------- */
router.post("/forgot", async (req, res) => {
  try {
    const { userId, email } = req.body;

    if (!userId || !email) {
      return res
        .status(400)
        .json({ message: "아이디와 이메일을 모두 입력해주세요." });
    }

    const user = await User.findOne({ userId, email });
    if (!user)
      return res
        .status(400)
        .json({ message: "입력한 아이디와 이메일이 일치하지 않습니다." });

    // 비밀번호 재설정 토큰 생성
    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // Gmail SMTP 설정
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
        <p>아래 링크를 클릭하여 비밀번호를 재설정하세요.</p>
        <a href="${resetLink}" style="color:#007bff;">비밀번호 재설정하기</a>
        <p>이 링크는 30분 동안 유효합니다.</p>
        <p>만약 본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    console.log(`✅ 비밀번호 재설정 링크 전송됨: ${resetLink}`);

    // (선택) DB에 토큰 저장하여 실제 재설정 시 검증 가능
    // user.resetToken = resetToken;
    // user.resetTokenExpire = Date.now() + 30 * 60 * 1000;
    // await user.save();

    res.json({ message: "비밀번호 재설정 링크를 이메일로 전송했습니다." });
  } catch (err) {
    console.error("비밀번호 재설정 오류:", err);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

export default router;
