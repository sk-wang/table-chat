/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // JetBrains Darcula theme colors
        'jetbrains': {
          'bg': '#2b2b2b',
          'bg-light': '#3c3f41',
          'bg-dark': '#1e1e1e',
          'panel': '#313335',
          'border': '#323232',
          'text': '#a9b7c6',
          'text-muted': '#808080',
          'accent': '#589df6',
          'accent-hover': '#4a88d9',
          'success': '#6a8759',
          'warning': '#bbb529',
          'error': '#ff6b68',
          'keyword': '#cc7832',
          'string': '#6a8759',
          'number': '#6897bb',
          'comment': '#808080',
        }
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'monospace'],
        'sans': ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
  // Disable preflight to avoid conflicts with Ant Design
  corePlugins: {
    preflight: false,
  },
}

