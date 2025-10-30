// 📁 C:\Users\Kn\Project\shop-backend\models\review.js
import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "상품 ID(productId)는 필수입니다."],
    },
    userName: {
      type: String,
      default: "익명",
      trim: true, // 🔹 공백 제거
    },
    rating: {
      type: Number,
      required: true,
      min: [1, "최소 평점은 1점입니다."],
      max: [5, "최대 평점은 5점입니다."],
      validate: {
        validator: Number.isInteger,
        message: "평점은 정수만 가능합니다.",
      },
    },
    comment: {
      type: String,
      required: [true, "리뷰 내용을 입력해주세요."],
      trim: true,
      minlength: [2, "리뷰는 최소 2글자 이상이어야 합니다."],
      maxlength: [1000, "리뷰는 최대 1000자까지 가능합니다."],
    },
  },
  {
    timestamps: true,
    versionKey: false, // 🔹 "__v" 필드 제거
  }
);

// 🔹 인덱스 추가 (조회 성능 향상)
reviewSchema.index({ productId: 1, createdAt: -1 });

/* --------------------------------------------------------
✅ (1) productId 유효성 검사: undefined/null/비정상 ObjectId 방지
-------------------------------------------------------- */
reviewSchema.pre("validate", function (next) {
  if (!this.productId) {
    return next(new Error("❌ productId가 누락되었습니다. 리뷰 저장이 취소됩니다."));
  }

  if (!mongoose.Types.ObjectId.isValid(this.productId)) {
    return next(new Error("❌ 잘못된 productId 형식입니다."));
  }

  next();
});

/* --------------------------------------------------------
✅ (2) 저장 전 데이터 정리 (공백 제거)
-------------------------------------------------------- */
reviewSchema.pre("save", function (next) {
  if (this.comment) {
    this.comment = this.comment.trim();
  }
  if (this.userName) {
    this.userName = this.userName.trim();
  }
  next();
});

/* --------------------------------------------------------
✅ (3) 정적 메서드: 특정 상품 리뷰 조회 (빈 배열 방지)
-------------------------------------------------------- */
reviewSchema.statics.findByProduct = async function (productId) {
  try {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      console.warn("⚠️ 잘못된 productId 요청:", productId);
      return [];
    }

    const reviews = await this.find({ productId }).sort({ createdAt: -1 });
    return reviews || [];
  } catch (error) {
    console.error("❌ 리뷰 조회 중 오류:", error);
    return [];
  }
};

/* --------------------------------------------------------
✅ (4) 잘못된 데이터 자동 정리 (선택적 실행)
-------------------------------------------------------- */
// ⚠️ 선택사항: 불필요한 테스트 리뷰가 많다면 아래 주석 해제 가능
// reviewSchema.post("init", async function () {
//   await this.model("Review").deleteMany({
//     $or: [
//       { productId: { $exists: false } },
//       { productId: null },
//       { productId: "" }
//     ],
//   });
// });

export default mongoose.model("Review", reviewSchema);
