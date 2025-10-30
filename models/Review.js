// 📁 C:\Users\Kn\Project\shop-backend\models\review.js
import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
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

// 🔹 데이터 정리용 미들웨어 (불필요한 공백 제거 등)
reviewSchema.pre("save", function (next) {
    if (this.comment) {
      this.comment = this.comment.trim();
    }
    if (this.userName) {
      this.userName = this.userName.trim();
    }
    next();
});

// 🔹 정적 메서드: 특정 상품 리뷰 조회 (빈 배열 방지)
reviewSchema.statics.findByProduct = async function (productId) {
  try {
    const reviews = await this.find({ productId }).sort({ createdAt: -1 });
    return reviews || [];
  } catch (error) {
    console.error("❌ 리뷰 조회 중 오류:", error);
    return [];
  }
};

export default mongoose.model("Review", reviewSchema);
