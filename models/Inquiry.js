import mongoose from "mongoose";

const inquirySchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    userName: { type: String, default: "익명" },
    question: { type: String, required: true },
    answer: { type: String, default: "" }, // 관리자가 답변 달 수 있게
    isPrivate: { type: Boolean, default: false },

    // ✅ 공지글 여부 (관리자가 작성하는 경우 true)
    isNotice: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ✅ 공지글은 상품과 무관할 수 있으므로, productId 필수 조건 완화 로직 추가
// (isNotice일 때는 productId가 없어도 저장 가능하게)
inquirySchema.pre("validate", function (next) {
  if (this.isNotice) {
    this.productId = this.productId || undefined;
    this.$__.schema.path("productId").options.required = false;
  }
  next();
});

export default mongoose.model("Inquiry", inquirySchema);
