/**
 * NativeWind (Tailwind v3) config. Color/radius values mirror
 * @kidswear/theme tokens — keep them in sync with packages/theme/src.
 * (tailwind.config.js is CommonJS and cannot import the TS token module.)
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#ff5a3c',
          soft: '#ffe0d8',
        },
        secondary: '#1aa18f',
        success: '#22a85b',
        error: '#e54545',
        warning: '#f98906',
        ink: '#212529',
        muted: '#868e96',
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
        xl: '24px',
      },
      fontFamily: {
        sans: ['Inter', 'System', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
