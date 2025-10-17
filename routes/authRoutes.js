// routes/authRoutes.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

/* -------------------- ✅ 회원가입 -------------------- */
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    const exist = await User.findOne({ email });
    if (exist) return res.status(400).json({ message: "이미 가입된 이메일입니다." });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashed });

    res.status(201).json({ message: "회원가입 성공", user });
  } catch (err) {
    console.error("회원가입 오류:", err.message);
    res.status(500).json({ message: "서버 오류" });
  }
});

/* -------------------- ✅ 로그인 -------------------- */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "이메일을 찾을 수 없습니다." });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "비밀번호가 일치하지 않습니다." });

    // ✅ 관리자 여부 포함해서 토큰 생성
    const token = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        isAdmin: user.isAdmin, // ✅ 관리자 여부 전달
      },
    });
  } catch (err) {
    console.error("로그인 오류:", err.message);
    res.status(500).json({ message: "서버 오류" });
  }
});

export default router;
