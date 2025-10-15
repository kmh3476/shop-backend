import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";
import User from "../models/User.js";

const router = express.Router();

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
    if (!email) return res.status(400).json({ message: "이메일을 입력해주세요." });

    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ message: "이미 가입된 이메일입니다." });

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Shop Support" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "📧 이메일 인증 코드",
      html: `
        <h3>이메일 인증 코드</h3>
        <p>아래 인증 코드를 입력해주세요:</p>
        <h2>${code}</h2>
        <p>이 코드는 10분 동안만 유효합니다.</p>
      `,
    });

    console.log(`✅ 인증 코드 전송됨: ${email}, 코드: ${code}`);
    res.json({ success: true, code });
  } catch (err) {
    console.error("이메일 전송 오류:", err);
    res.status(500).json({ message: "이메일 전송 실패" });
  }
});

/* -------------------- ✅ 회원가입 -------------------- */
router.post("/signup", async (req, res) => {
  try {
    const { userId, nickname, name, email, password, phone } = req.body;

    if (!userId || !nickname || !name || !email || !password) {
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

    // ✅ 이메일 인증 토큰 생성
    const emailToken = crypto.randomBytes(20).toString("hex");
    const verifyLink = `${process.env.FRONTEND_URL}/verify-email/${emailToken}`;

    // 회원 생성 (이메일 인증 전)
    const newUser = await User.create({
      userId,
      nickname,
      name,
      email,
      password,
      phone,
      emailVerified: false,
      emailToken,
    });

    // ✅ 인증 메일 발송
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"Shop Support" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "📧 이메일 인증 요청",
      html: `
        <h2>이메일 인증 요청</h2>
        <p>${name}님, 회원가입을 완료하려면 아래 버튼을 클릭해주세요.</p>
        <a href="${verifyLink}" 
          style="display:inline-block;margin-top:10px;padding:10px 20px;
          background:#007bff;color:white;border-radius:5px;text-decoration:none;">
          이메일 인증하기
        </a>
        <p>이 링크는 30분 동안만 유효합니다.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ 이메일 인증 링크 전송됨: ${verifyLink}`);

    res.status(201).json({
      message: "회원가입 성공! 이메일 인증 링크를 확인해주세요.",
    });
  } catch (err) {
    console.error("회원가입 오류:", err);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

/* -------------------- ✅ 이메일 인증 처리 -------------------- */
router.get("/verify-email/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({ emailToken: token });

    if (!user)
      return res.status(400).send("잘못되었거나 만료된 이메일 인증 링크입니다.");

    user.emailVerified = true;
    user.emailToken = null;
    await user.save();

    res.send("<h2>✅ 이메일 인증이 완료되었습니다! 로그인해주세요.</h2>");
  } catch (err) {
    console.error("이메일 인증 오류:", err);
    res.status(500).send("서버 오류가 발생했습니다.");
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

    const user = await User.findOne({ $or: [{ email }, { userId }] });
    if (!user) return res.status(400).json({ message: "존재하지 않는 계정입니다." });

    if (!user.emailVerified) {
      return res
        .status(400)
        .json({ message: "이메일 인증 후 로그인할 수 있습니다." });
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

    const maskedId = user.userId.replace(/(?<=^.{2}).(?=.{2}$)/g, "*");
    res.json({ message: "아이디를 찾았습니다.", userId: maskedId });
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

    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"Shop Support" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "🔐 비밀번호 재설정 안내",
      html: `
        <h2>비밀번호 재설정 요청</h2>
        <p>아래 버튼을 눌러 새 비밀번호를 설정하세요.</p>
        <a href="${resetLink}" 
           style="display:inline-block;background:#007bff;color:white;
           padding:10px 20px;border-radius:5px;text-decoration:none;">
           비밀번호 재설정하기
        </a>
        <p>이 링크는 30분 동안 유효합니다.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    console.log(`✅ 비밀번호 재설정 링크 전송됨: ${resetLink}`);
    res.json({ message: "비밀번호 재설정 링크를 이메일로 전송했습니다." });
  } catch (err) {
    console.error("비밀번호 재설정 오류:", err);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

export default router;
