/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      maxWidth: {
        container: "1440px",
      },
      screens: {
        xs: "320px",
        sm: "375px",
        sml: "500px",
        md: "667px",
        mdl: "768px",
        lg: "960px",
        lgl: "1024px",
        xl: "1280px",
      },
      fontFamily: {
        bodyFont: ["DM Sans", "sans-serif"],
        titleFont: ["Poppins", "sans-serif"],
      },
      colors: {
        // New theme: deep violet primary with coral and cyan accents
        primeColor: "#7C3AED", // deep violet (primary)
        lightText: "#6B7280", // neutral gray
        darkBg: "#0F172A", // slate/near-black background
        lightBg: "#FBFBFD", // very light background
        accent1: "#FF8A65", // coral accent
        accent2: "#06B6D4", // cyan accent
        success: "#22C55E",
        warning: "#F59E0B",
        error: "#EF4444",
      },
      boxShadow: {
        testShadow: "0px 0px 54px -13px rgba(0,0,0,0.7)",
        cardShadow: "0px 4px 15px rgba(0, 0, 0, 0.1)",
        hoverShadow: "0px 10px 25px rgba(0, 0, 0, 0.15)",
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-in-out',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(to right, #7C3AED, #06B6D4)',
        'gradient-accent': 'linear-gradient(to right, #FF8A65, #FFD166)',
      },
    },
  },
  plugins: [require("tailwind-scrollbar")],
};
