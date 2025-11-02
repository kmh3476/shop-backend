// 📁 C:\Users\Kn\Project\shop-backend\scripts\fixProductId.js
// ------------------------------------------------------------
// ✅ 목적: 기존 MongoDB에 ObjectId로 저장된 productId를
//          문자열 "product-page" 로 변환하여
//          상품 문의와 일반 문의가 정상적으로 분리되도록 수정.
// ------------------------------------------------------------

import mongoose from "mongoose";
import dotenv from "dotenv";
import Inquiry from "../models/Inquiry.js";

dotenv.config();

/* --------------------------------------------------------
 ✅ (1) MongoDB 연결
-------------------------------------------------------- */
async function connectDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`✅ MongoDB 연결 성공: ${conn.connection.host}`);
  } catch (err) {
    console.error("❌ MongoDB 연결 실패:", err.message);
    process.exit(1);
  }
}

/* --------------------------------------------------------
 ✅ (2) ObjectId → 문자열로 교체할 대상 찾기
-------------------------------------------------------- */
async function findCorruptedDocs() {
  try {
    console.log("🔍 ObjectId 형식 productId 문서를 탐색 중...");

    // $type: 7 → BSON ObjectId 타입
    const corruptedDocs = await Inquiry.find({
      productId: { $type: "objectId" },
    }).lean();

    if (corruptedDocs.length === 0) {
      console.log("✅ ObjectId 타입 productId 문서 없음 (모두 정상)");
      return [];
    }

    console.log(`⚠️ 변환 필요 문서 ${corruptedDocs.length}건 발견됨`);
    corruptedDocs.forEach((doc, i) => {
      console.log(`  ${i + 1}. _id: ${doc._id} | productId: ${doc.productId}`);
    });

    return corruptedDocs;
  } catch (err) {
    console.error("❌ 문서 탐색 중 오류 발생:", err);
    return [];
  }
}

/* --------------------------------------------------------
 ✅ (3) ObjectId → "product-page" 문자열로 업데이트
-------------------------------------------------------- */
async function fixCorruptedDocs(docs) {
  if (!docs || docs.length === 0) {
    console.log("✅ 수정할 문서가 없습니다.");
    return;
  }

  let success = 0;
  let failed = 0;

  for (const doc of docs) {
    try {
      await Inquiry.updateOne(
        { _id: doc._id },
        { $set: { productId: "product-page" } }
      );
      console.log(`🛠️ 수정 완료 → _id: ${doc._id}`);
      success++;
    } catch (err) {
      console.error(`❌ 수정 실패 → _id: ${doc._id}`, err.message);
      failed++;
    }
  }

  console.log(`\n📊 수정 결과:`);
  console.log(`✅ 성공: ${success}건`);
  console.log(`❌ 실패: ${failed}건`);
}

/* --------------------------------------------------------
 ✅ (4) productId 없는 일반 문의 / 공지글 검증
-------------------------------------------------------- */
async function verifyOthers() {
  try {
    console.log("\n🔎 일반 문의 / 공지글 검증 중...");

    const generalInquiries = await Inquiry.find({
      $or: [
        { productId: { $exists: false } },
        { productId: null },
        { productId: "" },
      ],
      isNotice: { $ne: true },
    });

    const notices = await Inquiry.find({ isNotice: true });

    console.log(`📋 일반 문의 ${generalInquiries.length}건`);
    console.log(`📋 공지글 ${notices.length}건`);
  } catch (err) {
    console.error("❌ 검증 중 오류:", err.message);
  }
}

/* --------------------------------------------------------
 ✅ (5) 실행 함수
-------------------------------------------------------- */
async function runFix() {
  console.log("🚀 [Fix Script] ObjectId → 'product-page' 변환 시작");

  await connectDB();

  const corrupted = await findCorruptedDocs();

  if (corrupted.length > 0) {
    await fixCorruptedDocs(corrupted);
  }

  await verifyOthers();

  console.log("\n🏁 변환 완료. MongoDB 연결 종료 중...");
  await mongoose.disconnect();
  console.log("🔌 MongoDB 연결 해제 완료 ✅");
}

/* --------------------------------------------------------
 ✅ (6) 스크립트 실행
-------------------------------------------------------- */
runFix().catch((err) => {
  console.error("🔥 예기치 못한 오류:", err);
  mongoose.disconnect();
  process.exit(1);
});
// --------------------------------------------------------
// ✅ (7) 백업 및 검증 기능 확장
// --------------------------------------------------------
import fs from "fs";
import path from "path";
import os from "os";

/**
 * 🔹 수정 대상 문서를 실행 전 JSON 파일로 백업
 *    - ./backups/inquiry_backup_날짜.json 로 저장됨
 */
async function backupCorruptedDocs(docs) {
  if (!docs || docs.length === 0) {
    console.log("📦 백업할 문서가 없습니다 (모두 정상).");
    return;
  }

  const backupDir = path.join(process.cwd(), "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const fileName = `inquiry_backup_${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}.json`;
  const filePath = path.join(backupDir, fileName);

  try {
    fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), "utf-8");
    console.log(`💾 백업 완료 → ${filePath}`);
  } catch (err) {
    console.error("❌ 백업 저장 실패:", err.message);
  }
}

/* --------------------------------------------------------
 ✅ (8) 변환 후 검증 로직
-------------------------------------------------------- */
async function verifyAfterFix() {
  try {
    console.log("\n🔎 변환 후 데이터 검증 시작...");

    const productPageDocs = await Inquiry.find({ productId: "product-page" });
    const objectIdDocs = await Inquiry.find({ productId: { $type: "objectId" } });

    console.log(`📊 "product-page"로 저장된 문서: ${productPageDocs.length}건`);
    console.log(`🚫 여전히 ObjectId 타입으로 남은 문서: ${objectIdDocs.length}건`);

    if (objectIdDocs.length > 0) {
      console.warn("⚠️ 아직 변환되지 않은 문서가 존재합니다.");
      objectIdDocs.forEach((d) => {
        console.log(` - _id: ${d._id} | productId: ${d.productId}`);
      });
    } else {
      console.log("✅ 모든 ObjectId 타입 productId가 문자열로 변환 완료되었습니다!");
    }

    console.log("\n🧾 상품 문의 샘플 미리보기 (상위 3건)");
    productPageDocs.slice(0, 3).forEach((doc, i) => {
      console.log(
        ` ${i + 1}. ${doc.question} | productId=${doc.productId} | 작성자=${doc.email}`
      );
    });
  } catch (err) {
    console.error("❌ 검증 중 오류:", err.message);
  }
}

/* --------------------------------------------------------
 ✅ (9) 로그 파일 내보내기
-------------------------------------------------------- */
function writeExecutionLog(content) {
  const logDir = path.join(process.cwd(), "logs");
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logFile = path.join(
    logDir,
    `fixProductId_log_${new Date().toISOString().replace(/[:.]/g, "-")}.txt`
  );

  try {
    fs.appendFileSync(logFile, content + os.EOL, "utf-8");
    console.log(`🗒️ 로그 저장됨 → ${logFile}`);
  } catch (err) {
    console.error("❌ 로그 파일 저장 실패:", err.message);
  }
}

/* --------------------------------------------------------
 ✅ (10) 전체 실행 흐름 오버라이드 (확장 버전)
-------------------------------------------------------- */
async function runFixExtended() {
  console.log("🚀 [Fix Script v2] ObjectId → 'product-page' 변환 + 백업 시작\n");

  await connectDB();

  const corruptedDocs = await findCorruptedDocs();

  // 📦 사전 백업
  if (corruptedDocs.length > 0) {
    await backupCorruptedDocs(corruptedDocs);
  }

  // 🛠️ 변환 수행
  await fixCorruptedDocs(corruptedDocs);

  // 📋 검증
  await verifyOthers();
  await verifyAfterFix();

  const summaryLog = `
=== [Fix Script 실행 결과 요약] ===
실행 시각: ${new Date().toLocaleString()}
변환 대상 수: ${corruptedDocs.length}
DB URI: ${process.env.MONGO_URI ? process.env.MONGO_URI.split("@")[1] : "unknown"}
==============================
`;

  writeExecutionLog(summaryLog);

  await mongoose.disconnect();
  console.log("\n✅ MongoDB 연결 종료 및 스크립트 완료!");
}

/* --------------------------------------------------------
 ✅ (11) 실행 트리거
-------------------------------------------------------- */
if (process.argv.includes("--verify")) {
  console.log("🔍 검증 모드 실행 (--verify)");
  connectDB()
    .then(() => verifyAfterFix())
    .finally(() => mongoose.disconnect());
} else {
  runFixExtended().catch((err) => {
    console.error("🔥 예기치 못한 오류 발생:", err);
    mongoose.disconnect();
    process.exit(1);
  });
}
