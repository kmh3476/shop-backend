import express from "express";

const router = express.Router();

// ✅ 언어 데이터 — 나중에 DB에서 불러오도록 바꿀 수 있음
const languageData = {
  ko: {
    translation: {
      home: { welcome: "환영합니다!" },
      login: { title: "로그인", button: "로그인" },
      cart: { empty: "장바구니가 비어 있습니다." },
    },
  },
  en: {
    translation: {
      home: { welcome: "Welcome!" },
      login: { title: "Login", button: "Sign In" },
      cart: { empty: "Your cart is empty." },
    },
  },
  th: {
    translation: {
      home: { welcome: "ยินดีต้อนรับ!" },
      login: { title: "เข้าสู่ระบบ", button: "ล็อกอิน" },
      cart: { empty: "รถเข็นของคุณว่างเปล่า" },
    },
  },
};

// ✅ GET /api/language
router.get("/", (req, res) => {
  res.json(languageData);
});

export default router;
