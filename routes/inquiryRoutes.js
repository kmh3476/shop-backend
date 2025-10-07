import express from "express";
import Inquiry from "../models/Inquiry.js";

const router = express.Router();

// ✅ 특정 상품 문의 목록
router.get("/:productId", async (req, res) => {
  try {
    const inquiries = await Inquiry.find({ productId: req.params.productId }).sort({ createdAt: -1 });
    res.json(inquiries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ 문의 등록
router.post("/", async (req, res) => {
  try {
    const newInquiry = new Inquiry(req.body);
    await newInquiry.save();
    res.status(201).json(newInquiry);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
