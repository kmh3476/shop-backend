// models/Product.js
import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String },
  imageUrl: { type: String }, // ✅ Cloudinary 이미지 URL 저장
});

const Product = mongoose.model("Product", productSchema);

export default Product;
