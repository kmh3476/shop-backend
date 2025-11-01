// 📁 models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// ✅ User 스키마 정의
const userSchema = new mongoose.Schema(
  {
    // ✅ 사용자 고유 아이디 (로그인용 ID)
    userId: {
      type: String,
      required: [true, "아이디는 필수입니다."],
      unique: true,
      trim: true,
      minlength: [4, "아이디는 최소 4자 이상이어야 합니다."],
    },

    // ✅ 닉네임
    nickname: {
      type: String,
      required: [true, "닉네임은 필수입니다."],
      unique: true,
      trim: true,
      minlength: [2, "닉네임은 최소 2자 이상이어야 합니다."],
    },

    // ✅ 이메일 (로그인 / 인증용)
    email: {
      type: String,
      required: [true, "이메일은 필수입니다."],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "유효한 이메일 형식이 아닙니다."],
    },

    // ✅ 비밀번호
    password: {
      type: String,
      required: [true, "비밀번호는 필수입니다."],
      minlength: [6, "비밀번호는 최소 6자 이상이어야 합니다."],
      select: false, // ✅ 응답에서 제외
    },

    // ✅ 전화번호 (선택)
    phone: {
      type: String,
      default: "",
      match: [/^[0-9]{10,11}$/, "유효한 전화번호를 입력해주세요."],
    },

    // ✅ 관리자 여부
    isAdmin: {
      type: Boolean,
      default: false,
    },

    // ✅ 이메일 인증 여부
    emailVerified: {
      type: Boolean,
      default: false,
    },

    // ✅ 휴대폰 인증 여부
    phoneVerified: {
      type: Boolean,
      default: false,
    },

    // ✅ 비밀번호 재설정용 토큰
    resetToken: {
      type: String,
      default: null,
    },

    // ✅ 토큰 만료 시간
    resetExpires: {
      type: Date,
      default: null,
    },

    // ✅ 🔥 추가: refreshToken 필드 (선택)
    // 클라이언트나 DB 캐시 없이 서버에서 직접 관리할 경우를 대비
    refreshToken: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);
// ✅ 저장 전에 비밀번호 자동 해싱
userSchema.pre("save", async function (next) {
  // 비밀번호가 수정되지 않았다면 건너뜀
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ✅ 비밀번호 검증 메서드 추가
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ✅ 관리자 여부 확인용 메서드
userSchema.methods.isAdminUser = function () {
  return this.isAdmin === true;
};

// ✅ JSON 변환 시 비밀번호 제거 + isAdmin 포함
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  obj.isAdmin = this.isAdmin === true;
  return obj;
};

// ✅ 관리자만 필터링하는 헬퍼 메서드 (선택)
userSchema.statics.findAdmins = async function () {
  return this.find({ isAdmin: true });
};

// ✅ 모델 생성 및 내보내기
const User = mongoose.model("User", userSchema);
export default User;
