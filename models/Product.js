// 📁 models/Product.js
import mongoose from "mongoose";

// ✅ mongoose.model 재등록 방지 (서버리스 환경 대응)
const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String },

    // ✅ 상품 상세 설명 및 추가 정보
    detailText: { type: String, default: "" }, // 상품 상세 설명
    sizeText: { type: String, default: "" },   // 사이즈 및 구매 안내

    // ✅ 여러 장 이미지 지원 (배열)
    images: {
      type: [String],
      default: ["https://placehold.co/250x200?text=No+Image"],
    },

    // ✅ 기존 단일 이미지 필드 (호환용)
    image: {
      type: String,
      default: "https://placehold.co/250x200?text=No+Image",
    },

    // ✅ 대표 이미지 필드 추가 (상품목록에 표시될 대표 이미지)
    mainImage: {
      type: String,
      default: "https://placehold.co/250x200?text=No+Image",
    },

    // ✅ 페이지(탭) 분류용 필드 (PageSetting 모델과 ObjectId로 연결)
    categoryPage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PageSetting", // 🔧 반드시 PageSetting과 일치해야 함
      default: null,
    },

    // ✅ 탭 이름 기반 분류 필드 (예: "recommend", "outer", "pants")
    // PageSetting.name 값과 동일하게 저장됨 → 프론트에서 간단히 필터 가능
    categoryName: {
      type: String,
      default: "default",
      index: true, // 🔍 빠른 검색용 인덱스 추가
    },

    // ✅ i18n 다국어 대응용 고정 카테고리 key 추가
    //    "featured", "top", "bottom", "coordi" 중 하나
    categoryKey: {
      type: String,
      enum: ["featured", "top", "bottom", "coordi", "default"],
      default: "default",
      index: true,
    },

    // ✅ 추가 확장 필드 (예: 추천상품 여부, 품절 여부 등)
    isRecommended: {
      type: Boolean,
      default: false, // true면 홈 화면 추천상품에 노출
    },
  },
  {
    timestamps: true, // ✅ createdAt, updatedAt 자동 생성
    versionKey: false, // 🔧 __v 제거 (관리 편의성)
  }
);

// ✅ populate용 가상 필드 (선택사항)
ProductSchema.virtual("pageLabel", {
  ref: "PageSetting",
  localField: "categoryPage",
  foreignField: "_id",
  justOne: true,
});

// ✅ pre-save 훅: categoryPage 연결 시 자동으로 categoryName 동기화 + categoryKey 기본값 유지
ProductSchema.pre("save", async function (next) {
  try {
    if (this.categoryPage) {
      const PageSetting = mongoose.model("PageSetting");
      const page = await PageSetting.findById(this.categoryPage).lean();
      if (page && page.name) {
        this.categoryName = page.name;
      }
      // 🔹 categoryKey가 아직 없으면 자동 매핑 시도
     if (!this.categoryKey || this.categoryKey === "default") {
  const map = {
    "추천상품": "featured",
    "상의": "top",
    "하의": "bottom",
    "코디 추천": "coordi",
  };

  // 1️⃣ categoryName이 매핑 목록에 있으면 그대로 설정
  if (map[this.categoryName]) {
    this.categoryKey = map[this.categoryName];
  }
  // 2️⃣ categoryName이 없어도 추천상품이면 featured
  else if (this.isRecommended) {
    this.categoryKey = "featured";
  }
}
    }
    next();
  } catch (err) {
    console.error("❌ categoryName/categoryKey 자동 동기화 실패:", err);
    next(err);
  }
});

// ✅ 모델 중복 등록 방지
const Product =
  mongoose.models.Product || mongoose.model("Product", ProductSchema);

export default Product;
