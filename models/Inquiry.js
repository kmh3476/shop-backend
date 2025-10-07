import mongoose from "mongoose";

const inquirySchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    userName: { type: String, default: "익명" },
    question: { type: String, required: true },
    answer: { type: String, default: "" }, // 관리자가 답변 달 수 있게
    isPrivate: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Inquiry", inquirySchema);
