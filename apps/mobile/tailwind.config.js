module.exports = {
  presets: [require('nativewind/preset')],
  content: [
    './app/**/*.{js,ts,tsx}',
    './components/**/*.{js,ts,tsx}',
    '../../packages/shared/src/**/*.{js,ts,tsx}',
  ],
};
