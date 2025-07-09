/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}", // src 폴더도 포함
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--primary)",   // ✅ CSS 변수 참조
        secondary: "var(--secondary)", // ✅ CSS 변수 참조
        accent: "var(--accent)",     // ✅ CSS 변수 참조
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"], // sans 폰트 설정 예시
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
