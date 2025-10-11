import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import User from "../models/User.js";

const router = express.Router();

// ✅ 로그인
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1️⃣ 필수값 검증
    if (!email || !password) {
      return res.status(400).json({ message: "이메일과 비밀번호를 입력해주세요." });
    }

    // 2️⃣ 이메일로 사용자 조회
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "이메일이 존재하지 않습니다." });
    }

    // 3️⃣ 비밀번호 비교
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "비밀번호가 틀립니다." });
    }

    // 4️⃣ JWT 토큰 생성
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // 5️⃣ 사용자 정보에서 비밀번호 제외
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
    };

    // 6️⃣ 클라이언트로 응답
    res.json({
      message: "로그인 성공",
      token,
      user: userData,
    });
  } catch (err) {
    console.error("로그인 오류:", err);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
});

export default router;
