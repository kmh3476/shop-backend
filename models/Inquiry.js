import mongoose from "mongoose";

const inquirySchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    userName: { type: String, default: "익명" },
    question: { type: String, required: true },
    answer: { type: String, default: "" }, // 관리자가 답변 달 수 있게
    isPrivate: { type: Boolean, default: false },

    // ✅ 공지글 여부 (관리자가 작성하는 경우 true)
    isNotice: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ✅ 공지글일 경우 productId 필수 제한 완전 해제
inquirySchema.pre("validate", function (next) {
  if (this.isNotice) {
    // productId 필드를 제거하고 required 조건 자체를 비활성화
    this.productId = undefined;

    // mongoose 7.x 이상에서는 다음 코드로 required 속성 변경 가능
    const path = this.schema.path("productId");
    if (path && path.options.required) {
      path.options.required = false;
    }
  }
  next();
});

export default mongoose.model("Inquiry", inquirySchema);
