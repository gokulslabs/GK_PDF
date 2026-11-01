module.exports = {
  presets: ["module:@react-native/babel-preset"],
  plugins: [
    [
      "module-resolver",
      {
        root: ["."],
        alias: { "@": "./" },
        extensions: [".ios.js", ".android.js", ".js", ".jsx", ".ts", ".tsx", ".json"],
      },
    ],
    "react-native-reanimated/plugin",
  ],
};
