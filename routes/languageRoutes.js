// 📁 routes/languageRoutes.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.get("/:lang", (req, res) => {
  const { lang } = req.params;
  const filePath = path.join(__dirname, `../locales/${lang}/translation.json`);
  try {
    const data = fs.readFileSync(filePath, "utf8");
    res.json(JSON.parse(data));
  } catch (err) {
    console.error(`❌ 언어 파일 불러오기 실패 (${lang}):`, err.message);
    res.status(404).json({ message: "Language file not found" });
  }
});

export default router;
