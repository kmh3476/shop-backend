// 📁 server/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

/* -------------------- ✅ 로그인 유저만 접근 허용 -------------------- */
export const protect = async (req, res, next) => {
  try {
    // ✅ Render 등의 Proxy 환경에서 IP 문제 방지
    if (req.app && typeof req.app.set === "function") {
      req.app.set("trust proxy", 1);
    }

    // ✅ Authorization 헤더 처리 (대소문자 호환)
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn("🚫 protect() 실패: Authorization 헤더 없음");
      return res.status(401).json({ message: "인증 토큰이 없습니다." });
    }

    const token = authHeader.split(" ")[1];
    if (!token || token === "undefined") {
      console.warn("🚫 protect() 실패: 토큰이 비어있거나 잘못됨");
      return res.status(401).json({ message: "잘못된 인증 토큰입니다." });
    }

    // ✅ JWT 비밀키 확인
    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET 환경 변수가 누락되었습니다.");
      return res
        .status(500)
        .json({ message: "서버 설정 오류 (JWT_SECRET 누락)" });
    }

    // ✅ 토큰 검증
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.id) {
      console.warn("⚠️ protect() 실패: 토큰 디코딩 실패");
      return res.status(401).json({ message: "유효하지 않은 토큰입니다." });
    }

    // ✅ 유저 조회
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      console.warn("⚠️ protect() 실패: 사용자 없음");
      return res.status(401).json({ message: "유효하지 않은 사용자입니다." });
    }

    req.user = user; // 요청 객체에 유저 정보 저장
    next(); // ✅ 통과
  } catch (err) {
    console.error("🔐 protect() 인증 실패:", err.message);

    // ✅ 만료 토큰 예외 처리
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "토큰이 만료되었습니다." });
    }

    return res.status(401).json({ message: "토큰이 유효하지 않습니다." });
  }
};

/* -------------------- ✅ 관리자만 접근 허용 -------------------- */
export const adminOnly = (req, res, next) => {
  try {
    if (!req.user) {
      console.warn("🚫 adminOnly() 실패: 로그인되지 않은 사용자");
      return res.status(401).json({ message: "인증되지 않은 사용자입니다." });
    }

    if (!req.user.isAdmin) {
      console.warn("🚫 adminOnly() 실패: 관리자 권한 아님:", req.user.email);
      return res.status(403).json({ message: "관리자 권한이 필요합니다." });
    }

    next(); // ✅ 관리자 통과
  } catch (err) {
    console.error("🚫 adminOnly() 오류:", err.message);
    res.status(500).json({ message: "서버 내부 오류" });
  }
};
