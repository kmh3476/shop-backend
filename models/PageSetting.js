// 📁 models/PageSetting.js
import mongoose from "mongoose";

const pageSettingSchema = new mongoose.Schema(
  {
    // ✅ 내부적으로 사용하는 고정 key (영문 기반)
    // 예: "featured", "top", "bottom", "coordi"
    name: { type: String, required: true, unique: true },

    // ✅ 사용자에게 보여질 라벨 (다국어 label)
    label: { type: String, required: true },

    // ✅ 탭 순서
    order: { type: Number, default: 0 },

    // ✅ 탭 썸네일 이미지 URL
    image: { type: String, default: "" },

    // ✅ 다국어 라벨 확장 (언어별 표현 저장)
    // 프론트에서 i18n이 주 역할이지만, 관리자 편집 시 참고용으로 유지
    i18nLabels: {
      ko: { type: String, default: "" },
      en: { type: String, default: "" },
      th: { type: String, default: "" },
    },

    // ✅ 카테고리 key 자동 연결 (Product.categoryKey와 일치)
    categoryKey: {
      type: String,
      enum: ["featured", "top", "bottom", "coordi", "default"],
      default: "default",
      index: true,
    },

    // ✅ 비활성화 여부 (예: 임시 숨김 탭)
    isActive: { type: Boolean, default: true },

    // ✅ 탭 설명 추가 (관리자용)
    description: { type: String, default: "" },
  },
  { timestamps: true } // ✅ 생성/수정 시각 기록
);

// ✅ pre-save 훅: label 자동 정규화 (공백 trim)
pageSettingSchema.pre("save", function (next) {
  if (this.label) this.label = this.label.trim();
  if (this.i18nLabels?.ko) this.i18nLabels.ko = this.i18nLabels.ko.trim();
  if (this.i18nLabels?.en) this.i18nLabels.en = this.i18nLabels.en.trim();
  if (this.i18nLabels?.th) this.i18nLabels.th = this.i18nLabels.th.trim();
  next();
});

// ✅ 정렬용 스태틱 메서드
pageSettingSchema.statics.getOrderedPages = async function () {
  return this.find({ isActive: true }).sort({ order: 1 }).lean();
};

// ✅ name ↔ categoryKey 매핑 자동화 (예방적 기능)
pageSettingSchema.pre("validate", function (next) {
  const map = {
    featured: "featured",
    top: "top",
    bottom: "bottom",
    coordi: "coordi",
  };
  if (!this.categoryKey || this.categoryKey === "default") {
    this.categoryKey = map[this.name] || "default";
  }
  next();
});

// ✅ Product 모델과 연동 시 참고용 virtual 필드
pageSettingSchema.virtual("products", {
  ref: "Product",
  localField: "_id",
  foreignField: "categoryPage",
});

// ✅ JSON 변환 시 virtual 포함
pageSettingSchema.set("toJSON", { virtuals: true });
pageSettingSchema.set("toObject", { virtuals: true });

// ✅ 이미 등록된 모델 중복 방지 (핫 리로드 환경 대응)
const PageSetting =
  mongoose.models.PageSetting || mongoose.model("PageSetting", pageSettingSchema);

export default PageSetting;
