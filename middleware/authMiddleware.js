// 📁 server/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

/* -------------------- ✅ 로그인 유저만 접근 허용 -------------------- */
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // ✅ 토큰 존재 확인
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "인증 토큰이 없습니다." });
    }

    const token = authHeader.split(" ")[1];

    // ✅ JWT 비밀키 확인
    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET 환경 변수가 설정되지 않았습니다.");
      return res.status(500).json({ message: "서버 설정 오류 (JWT_SECRET 누락)" });
    }

    // ✅ 토큰 검증
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ 유저 조회
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "유효하지 않은 사용자입니다." });
    }

    req.user = user; // 요청 객체에 유저 정보 저장
    next();
  } catch (err) {
    console.error("🔐 인증 실패:", err.message);
    return res.status(401).json({ message: "토큰이 유효하지 않습니다." });
  }
};

/* -------------------- ✅ 관리자만 접근 허용 -------------------- */
export const adminOnly = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "인증되지 않은 사용자입니다." });
    }

    if (!req.user.isAdmin) {
      return res.status(401).json({ message: "관리자 권한이 없습니다." });
    }

    next(); // ✅ 관리자 통과
  } catch (err) {
    console.error("🚫 관리자 접근 오류:", err.message);
    res.status(500).json({ message: "서버 내부 오류" });
  }
};
