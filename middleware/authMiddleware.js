// 📁 server/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

/* -------------------- ✅ 로그인 유저만 접근 허용 -------------------- */
export const protect = async (req, res, next) => {
  let token;

  // 1️⃣ 헤더에서 토큰 추출
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1]; // "Bearer <token>" 중 <token>만 추출
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 2️⃣ 토큰 검증 후 유저 조회
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(401).json({ message: "유효하지 않은 사용자입니다." });
      }

      next(); // ✅ 다음 미들웨어 또는 라우트로 이동
    } catch (err) {
      console.error("🔐 인증 실패:", err);
      return res.status(401).json({ message: "토큰이 유효하지 않습니다." });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "인증 토큰이 없습니다." });
  }
};

/* -------------------- ✅ 관리자만 접근 허용 -------------------- */
export const adminOnly = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next(); // ✅ 관리자면 통과
  } else {
    res.status(403).json({ message: "관리자 권한이 필요합니다." });
  }
};
