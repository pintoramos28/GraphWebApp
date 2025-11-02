module.exports = {
  root: true,
  extends: ["next/core-web-vitals", "prettier"],
  parserOptions: {
    ecmaVersion: 2023,
    sourceType: "module"
  },
  env: {
    browser: true,
    es2023: true,
    node: true
  },
  rules: {
    "react/jsx-props-no-spreading": "off"
  }
};
