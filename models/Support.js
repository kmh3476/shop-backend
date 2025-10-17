import mongoose from "mongoose";

const supportSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    subject: { type: String, default: "고객 문의" },
    message: { type: String, required: true },
    reply: { type: String },
    repliedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("Support", supportSchema);
