// 📁 C:\Users\Kn\Project\shop-backend\models\Inquiry.js
import mongoose from "mongoose";

const inquirySchema = new mongoose.Schema(
  {
    // ✅ 상품 ID (공지글은 제외)
    productId: {
      // 🔥 기존 ObjectId → String 으로 변경
      type: String,
      required: false, // 공지글은 productId 없이 작성 가능
      trim: true,
    },

    // ✅ 사용자 정보
    userName: {
      type: String,
      default: "익명",
      trim: true,
    },

    // ✅ 문의 내용
    question: {
      type: String,
      required: [true, "문의 내용을 입력해주세요."],
      trim: true,
      minlength: [2, "문의는 최소 2글자 이상이어야 합니다."],
      maxlength: [2000, "문의는 최대 2000자까지 가능합니다."],
    },

    // ✅ 사용자가 작성한 문의에 대한 추가 설명 (기존 answer 필드 유지)
    answer: {
      type: String,
      default: "",
      trim: true,
      maxlength: [2000, "답변은 최대 2000자까지 가능합니다."],
    },

    // ✅ 관리자가 남긴 답변
    reply: {
      type: String,
      default: "",
      trim: true,
      maxlength: [2000, "관리자 답변은 최대 2000자까지 가능합니다."],
    },

    // ✅ 관리자 답변 시각
    repliedAt: {
      type: Date,
      default: null,
    },

    // ✅ 비공개 여부 (true면 관리자만 조회 가능)
    isPrivate: {
      type: Boolean,
      default: false,
    },

    // ✅ 공지글 여부 (관리자가 작성하는 경우)
    isNotice: {
      type: Boolean,
      default: false,
    },

    // ✅ 이메일 정보 (선택 입력)
    email: {
      type: String,
      default: "",
      trim: true,
      match: [
        /^([\w-.]+@([\w-]+\.)+[\w-]{2,4})?$/,
        "올바른 이메일 주소 형식이 아닙니다.",
      ],
    },
  },
  {
    timestamps: true,
    versionKey: false, // "__v" 제거
  }
);

// ✅ 인덱스 최적화 (상품별 + 최신순)
inquirySchema.index({ productId: 1, createdAt: -1 });
inquirySchema.index({ isNotice: 1 }); // 공지글 빠른 조회용

/* --------------------------------------------------------
 ✅ (1) 공지글 / 일반 문의 유효성 검사
-------------------------------------------------------- */
inquirySchema.pre("validate", function (next) {
  // 🔹 공지글일 경우 productId 처리 수정
  if (this.isNotice) {
    // 🔸 상품 공지("product-page")는 유지
    if (this.productId === "product-page") {
      return next();
    }

    // 🔸 일반 공지는 productId 제거
    this.productId = undefined;
    return next();
  }

  /* 🔹 사용자 문의(고객센터 탭)일 경우 productId 없이도 허용 */
  if (!this.isNotice && !this.productId) {
    this.productId = undefined;
    return next();
  }

  next();
});

/* --------------------------------------------------------
 ✅ (2) 저장 전 데이터 정리
-------------------------------------------------------- */
inquirySchema.pre("save", function (next) {
  if (this.userName) this.userName = this.userName.trim();
  if (this.question) this.question = this.question.trim();
  if (this.answer) this.answer = this.answer.trim();
  if (this.reply) this.reply = this.reply.trim();

  // 🔹 공지글 처리 수정 (상품 공지는 유지)
  if (this.isNotice && this.productId !== "product-page") {
    this.productId = undefined;
  }

  next();
});


/* --------------------------------------------------------
 ✅ (3) 정적 메서드: 상품별 문의 목록 불러오기
-------------------------------------------------------- */
inquirySchema.statics.findByProduct = async function (productId) {
  try {
    // 🔸 이제 문자열 기반으로 검색
    if (typeof productId !== "string") {
      console.warn("⚠️ 잘못된 productId 요청:", productId);
      return [];
    }

    const inquiries = await this.find({
      productId,
      isNotice: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .lean();

    return inquiries || [];
  } catch (error) {
    console.error("❌ 문의 조회 중 오류:", error);
    return [];
  }
};

/* --------------------------------------------------------
 ✅ (4) 인스턴스 메서드: 관리자 답변 추가
-------------------------------------------------------- */
inquirySchema.methods.addReply = async function (replyText) {
  this.reply = replyText;
  this.repliedAt = new Date();
  await this.save();
  return this;
};

/* --------------------------------------------------------
 ✅ (5) 가상 필드: 답변 여부 표시
-------------------------------------------------------- */
inquirySchema.virtual("hasReply").get(function () {
  return this.reply && this.reply.trim().length > 0;
});

/* --------------------------------------------------------
 ✅ (6) JSON 변환 시 가상 필드 포함
-------------------------------------------------------- */
inquirySchema.set("toJSON", { virtuals: true });
inquirySchema.set("toObject", { virtuals: true });

export default mongoose.model("Inquiry", inquirySchema);
  