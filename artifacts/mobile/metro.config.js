const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Allow Metro to bundle PDF files as static assets
config.resolver.assetExts.push("pdf");

module.exports = config;
