// 📁 server/routes/auth.js
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

const router = express.Router();

/* -------------------- ✅ 회원가입 -------------------- */
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // 1️⃣ 필수값 검증
    if (!name || !email || !password) {
      return res.status(400).json({ message: "필수 정보를 입력해주세요." });
    }

    // 2️⃣ 중복 이메일 확인
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "이미 가입된 이메일입니다." });
    }

    // ✅ (수정됨) 여기서 비밀번호 해싱하지 않음 — User 모델의 pre('save')가 처리함
    const newUser = await User.create({
      name,
      email,
      password, // 평문 그대로 전달
      phone,
    });

    // 5️⃣ JWT 토큰 발급
    const token = jwt.sign(
      { id: newUser._id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // 6️⃣ 응답
    res.status(201).json({
      message: "회원가입 성공",
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
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
    const { email, password } = req.body;

    // 1️⃣ 기본 검증
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "이메일과 비밀번호를 입력해주세요." });
    }

    // 2️⃣ 사용자 확인
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "이메일이 존재하지 않습니다." });
    }

    // 3️⃣ 비밀번호 비교
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "비밀번호가 틀립니다." });
    }

    // 4️⃣ JWT 발급
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // 5️⃣ 응답
    res.json({
      message: "로그인 성공",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("로그인 오류:", err);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

export default router;
