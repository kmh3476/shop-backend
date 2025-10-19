// 📁 cms/config/middlewares.ts

export default [
  "strapi::logger",
  "strapi::errors",
  "strapi::security",
  {
    name: "strapi::cors",
    config: {
      enabled: true,
      origin: [
        "http://localhost:5173", // ✅ 로컬 개발용 (Vite)
        "https://your-frontend-name.vercel.app", // ✅ 배포된 프론트엔드 주소로 바꿔줘
      ],
      headers: "*",
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    },
  },
  "strapi::poweredBy",
  "strapi::query",
  "strapi::body",
  "strapi::session",
  "strapi::favicon",
  "strapi::public",
];
