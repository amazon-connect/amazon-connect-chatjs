import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import replace from "@rollup/plugin-replace";
import serve from "rollup-plugin-serve";
import livereload from "rollup-plugin-livereload";

const isWatch = process.env.ROLLUP_WATCH === "true";

export default {
  input: "src/main.tsx",
  output: {
    // Bundle primarily as ES6 modules
    format: "es",
    dir: "dist",
    entryFileNames: "[name].js",
    chunkFileNames: "[name]-[hash].js",
    sourcemap: true,
  },
  plugins: [
    replace({
      preventAssignment: true,
      "process.env.NODE_ENV": JSON.stringify(
        isWatch ? "development" : "production"
      ),
    }),
    resolve({ extensions: [".js", ".jsx", ".ts", ".tsx"] }),
    commonjs(),
    typescript({ tsconfig: "./tsconfig.json" }),
    isWatch &&
      serve({
        contentBase: ["dist", "."],
        port: 3000,
        open: true,
      }),
    isWatch && livereload({ watch: "dist" }),
  ],
};
