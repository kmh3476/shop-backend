// 📁 models/Support.js
import mongoose from "mongoose";

const supportSchema = new mongoose.Schema(
  {
    // 문의자 이름 (입력 안 해도 기본값 설정)
    name: { type: String, required: false, default: "고객" },

    // 이메일 (답변용)
    email: { type: String, required: true, index: true },

    // 문의 제목
    subject: { type: String, default: "고객 문의" },

    // 문의 내용
    message: { type: String, required: true },

    // 관리자 답변 내용
    reply: { type: String },

    // 답변 시각
    repliedAt: { type: Date },

    // ✅ 관리자 확인 여부
    isRead: { type: Boolean, default: false },
  },
  {
    timestamps: true, // createdAt, updatedAt 자동 생성
    collection: "supports",
  }
);

// ✅ 최신순 정렬 인덱스
supportSchema.index({ createdAt: -1 });

export default mongoose.model("Support", supportSchema);
