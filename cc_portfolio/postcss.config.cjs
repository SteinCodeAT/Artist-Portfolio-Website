const tailwindcss = require('tailwindcss');
const autoprefixer = require('autoprefixer');
// Since you're aiming to use tailwindcss/nesting, you might not need to explicitly require postcss-nested

module.exports = {
  plugins: [
    require('postcss-import'), // Assuming you're using this for CSS @import
    require('tailwindcss/nesting'), // This uses postcss-nesting under the hood by default
    tailwindcss, // You've already required tailwindcss at the top
    autoprefixer, // Same for autoprefixer
  ],
};