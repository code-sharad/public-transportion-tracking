/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          background: "var(--color-background-base)",
          text: "var(--color-text-primary)",
          accent: "var(--color-accent-primary)",
          occupancy: {
            low: "var(--color-occupancy-low)",
            medium: "var(--color-occupancy-medium)",
            high: "var(--color-occupancy-high)",
          },
        },
      },
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
      },
      spacing: {
        touch: "44px", // Minimum touch target size
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      minHeight: {
        touch: "44px",
      },
    },
  },
  plugins: [],
};
