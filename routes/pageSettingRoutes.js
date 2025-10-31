// 📁 routes/pageSettingRoutes.js
import express from "express";
import PageSetting from "../models/PageSetting.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// ✅ 모든 탭 조회
router.get("/", async (req, res) => {
  try {
    const pages = await PageSetting.find().sort({ order: 1 });
    res.json(pages);
  } catch (err) {
    console.error("❌ 탭 목록 불러오기 실패:", err);
    res.status(500).json({ message: "서버 오류: 탭 목록 조회 실패" });
  }
});

// ✅ 단일 탭 조회 (필요 시 프론트에서 탭 상세보기용)
router.get("/:id", async (req, res) => {
  try {
    const page = await PageSetting.findById(req.params.id);
    if (!page) {
      return res.status(404).json({ message: "탭을 찾을 수 없습니다" });
    }
    res.json(page);
  } catch (err) {
    console.error("❌ 단일 탭 조회 실패:", err);
    res.status(500).json({ message: "서버 오류: 단일 탭 조회 실패" });
  }
});

// ✅ 새 탭 추가 (관리자만)
router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const { name, label, order, image } = req.body;

    if (!name || !label) {
      return res.status(400).json({ message: "name과 label은 필수입니다" });
    }

    // ✅ 중복 방지
    const exists = await PageSetting.findOne({ name });
    if (exists) {
      return res.status(400).json({ message: "이미 존재하는 탭 name입니다" });
    }

    // ✅ 새 탭 생성
    const newPage = new PageSetting({
      name,
      label,
      order,
      image: image || "",
    });

    await newPage.save();
    res.status(201).json(newPage);
  } catch (err) {
    console.error("❌ 새 탭 추가 실패:", err);
    res.status(500).json({ message: "서버 오류: 새 탭 추가 실패" });
  }
});

// ✅ 탭 수정
router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const updated = await PageSetting.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!updated) {
      return res.status(404).json({ message: "수정할 탭을 찾을 수 없습니다" });
    }

    res.json(updated);
  } catch (err) {
    console.error("❌ 탭 수정 실패:", err);
    res.status(500).json({ message: "서버 오류: 탭 수정 실패" });
  }
});

// ✅ 탭 삭제
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const deleted = await PageSetting.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "삭제할 탭을 찾을 수 없습니다" });
    }

    res.json({ message: "탭이 삭제되었습니다." });
  } catch (err) {
    console.error("❌ 탭 삭제 실패:", err);
    res.status(500).json({ message: "서버 오류: 탭 삭제 실패" });
  }
});

// ✅ 순서 변경 (드래그앤드롭 지원)
router.patch("/reorder", protect, adminOnly, async (req, res) => {
  try {
    const { orderData } = req.body; // [{id, order}, ...]

    if (!Array.isArray(orderData)) {
      return res.status(400).json({ message: "orderData 배열이 필요합니다" });
    }

    const bulkOps = orderData.map((p) => ({
      updateOne: {
        filter: { _id: p.id },
        update: { order: p.order },
      },
    }));

    if (bulkOps.length > 0) {
      await PageSetting.bulkWrite(bulkOps);
    }

    const updatedPages = await PageSetting.find().sort({ order: 1 });
    res.json(updatedPages);
  } catch (err) {
    console.error("❌ 탭 순서 변경 실패:", err);
    res.status(500).json({ message: "서버 오류: 순서 변경 실패" });
  }
});

// ✅ 잘못된 요청 대응 (404)
router.all("*", (req, res) => {
  res.status(404).json({
    message: "요청한 페이지 설정 경로를 찾을 수 없습니다.",
    route: req.originalUrl,
  });
});

// ✅ ESM 환경에서는 반드시 default export 필요
export default router;
