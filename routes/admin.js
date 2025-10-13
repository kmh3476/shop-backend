import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

/* -------------------- ✅ 관리자 전용 테스트 API -------------------- */
// 이 라우트는 관리자만 접근 가능
router.get("/dashboard", protect, adminOnly, (req, res) => {
  res.json({
    message: "관리자 인증 성공!",
    user: {
      id: req.user._id,
      email: req.user.email,
      name: req.user.name,
    },
  });
});

export default router;
