// 📁 models/Product.js
import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String },
    // ✅ 필드명 일치: productRoutes.js에서는 "image"로 저장하므로 image로 통일
    image: {
      type: String,
      default: "https://placehold.co/250x200?text=No+Image",
    },
  },
  { timestamps: true } // ✅ createdAt, updatedAt 자동 생성
);

const Product = mongoose.model("Product", productSchema);

export default Product;
