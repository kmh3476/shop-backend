import mongoose from "mongoose";

// ✅ User 스키마 정의
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true, // 이메일 중복 방지
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    phone: {
      type: String,
      default: "",
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true } // createdAt, updatedAt 자동 생성
);

// ✅ 모델 생성 및 내보내기
const User = mongoose.model("User", userSchema);
export default User;
