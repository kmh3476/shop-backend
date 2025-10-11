// routes/authRoutes.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    const exist = await User.findOne({ email });
    if (exist) return res.status(400).json({ message: "이미 가입된 이메일입니다." });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashed });

    res.status(201).json({ message: "회원가입 성공", user });
  } catch (err) {
    res.status(500).json({ message: "서버 오류" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "이메일을 찾을 수 없습니다." });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "비밀번호가 일치하지 않습니다." });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: "서버 오류" });
  }
});

export default router;
