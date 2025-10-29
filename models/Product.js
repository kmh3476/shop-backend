// 📁 models/Product.js
import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String },

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

    // ✅ 페이지(탭) 분류용 필드 추가 (PageSetting 모델과 연결)
    categoryPage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PageSetting",
      default: null,
    },
  },
  { timestamps: true } // ✅ createdAt, updatedAt 자동 생성
);

const Product = mongoose.model("Product", productSchema);
export default Product;
