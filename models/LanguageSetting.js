const mongoose = require("mongoose");

const LanguageSettingSchema = new mongoose.Schema({
  key: { type: String, required: true }, // 예: "home.welcome"
  translations: {
    ko: { type: String },
    en: { type: String },
    th: { type: String }
  },
  fonts: {
    ko: { type: String, default: "Noto Sans KR" },
    en: { type: String, default: "Roboto" },
    th: { type: String, default: "Sarabun" }
  }
});

module.exports = mongoose.model("LanguageSetting", LanguageSettingSchema);
