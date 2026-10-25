import { defineConfig } from "vitest/config";
export default defineConfig({
  resolve: { alias: [{ find: /^react-native$/, replacement: "react-native-web" }] },
  define: { __DEV__: "false" },
  esbuild: { jsx: "automatic" },
  test: { exclude: ["**/node_modules/**", "**/android/**", "**/dist/**", "**/dist-web/**"] },
});
