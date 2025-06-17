export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    // Add CSS optimization for production builds
    ...(process.env.NODE_ENV === 'production' && {
      '@fullhuman/postcss-purgecss': {
        content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
        defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || [],
        safelist: {
          standard: [
            // Preserve dynamic classes
            /^ql-/, // Quill editor classes
            /^animate-/, // Animation classes
            /^transition-/, // Transition classes
          ],
          deep: [
            /^ql-/, // Quill editor nested classes
          ]
        }
      },
      cssnano: {
        preset: ['default', {
          discardComments: {
            removeAll: true,
          },
          normalizeWhitespace: true,
          mergeLonghand: true,
          mergeRules: true,
          reduceIdents: false, // Keep keyframe names intact
        }]
      }
    })
  },
};
