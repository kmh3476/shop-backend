import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// ✅ User 스키마 정의
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "이름은 필수입니다."],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "이메일은 필수입니다."],
      unique: true, // 이메일 중복 방지
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "유효한 이메일 형식이 아닙니다."],
    },
    password: {
      type: String,
      required: [true, "비밀번호는 필수입니다."],
      minlength: [6, "비밀번호는 최소 6자 이상이어야 합니다."],
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
  { timestamps: true }
);

// ✅ 저장 전에 비밀번호 자동 해싱
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ✅ 비밀번호 검증 메서드 추가 (선택)
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ✅ 모델 생성 및 내보내기
const User = mongoose.model("User", userSchema);
export default User;
