import mongoose from "mongoose";

const inquirySchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: false, // ✅ 기본값 false로 변경 (공지글 허용)
    },
    userName: { type: String, default: "익명" },
    question: { type: String, required: true },
    answer: { type: String, default: "" }, // 관리자가 답변 달 수 있게
    isPrivate: { type: Boolean, default: false },

    // ✅ 공지글 여부 (관리자가 작성하는 경우 true)
    isNotice: { type: Boolean, default: false },

    // ✅ 이메일 정보(선택사항)
    email: { type: String, default: "" },
  },
  { timestamps: true }
);

// ✅ 공지글일 경우 productId 필수 제한 완전 해제
// ✅ 일반 문의일 경우 productId가 반드시 있어야 함
inquirySchema.pre("validate", function (next) {
  // 공지글이면 productId를 제거해도 무방
  if (this.isNotice) {
    this.productId = undefined;
    const path = this.schema.path("productId");
    if (path && path.options.required) {
      path.options.required = false;
    }
    return next();
  }

  // 일반 문의인데 productId가 없으면 에러 발생 (단, Support 페이지용 문의는 예외 허용)
  if (!this.isNotice && !this.productId) {
    // Support 페이지에서 직접 등록한 고객 문의는 productId 없이도 허용되도록 예외 처리
    if (!this.userName || !this.question) {
      return next(new Error("상품 문의에는 productId가 필요합니다."));
    }
  }

  next();
});

export default mongoose.model("Inquiry", inquirySchema);
