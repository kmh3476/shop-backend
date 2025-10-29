// models/PageSetting.js
const mongoose = require("mongoose");

const pageSettingSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // 내부용 key
  label: { type: String, required: true }, // 화면에 보이는 이름
  order: { type: Number, default: 0 }, // 탭 순서
});

module.exports = mongoose.model("PageSetting", pageSettingSchema);
