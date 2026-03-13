/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html" // This will scan all .html files in the root directory
  ],
  theme: {
    extend: {
      colors: {
        primary: '#6366F1', // Modern indigo
        secondary: '#EC4899', // Pink
        accent: '#10B981', // Emerald
        background: '#0F172A', // Slate-900
        surface: 'rgba(255, 255, 255, 0.1)', // Glass surface
        text: '#F1F5F9', // Slate-100
        muted: '#94A3B8', // Slate-400
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(99, 102, 241, 0.5)' },
          '100%': { boxShadow: '0 0 30px rgba(99, 102, 241, 0.8)' },
        },
      },
    },
  },
  plugins: [],
}
