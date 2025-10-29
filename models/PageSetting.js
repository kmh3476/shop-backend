// 📁 models/PageSetting.js
import mongoose from "mongoose";

const pageSettingSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // 내부용 key
  label: { type: String, required: true }, // 화면에 보이는 이름
  order: { type: Number, default: 0 }, // 탭 순서
});

// ✅ ESM 환경에서는 반드시 default export 사용
const PageSetting = mongoose.model("PageSetting", pageSettingSchema);
export default PageSetting;
