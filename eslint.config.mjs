// eslint.config.mjs
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import a11y from 'eslint-plugin-jsx-a11y';
import importX from 'eslint-plugin-import-x';
import importLegacy from 'eslint-plugin-import';
import promise from 'eslint-plugin-promise';

export default [
  // --- .eslintignore をこちらへ移植 ---
  {
    ignores: [
      'logs/**', '*.log',
      'pids/**', '*.pid', '*.seed',
      'coverage/**', '.eslintcache',
      'node_modules/**', '.DS_Store',
      'release/app/dist/**', 'release/build/**',
      '.erb/dll/**', '.idea/**',
      'npm-debug.log.*',
      '*.css.d.ts', '*.sass.d.ts', '*.scss.d.ts',
      // いったん .erb は対象外（必要なら後で型なしLint用ブロックを追加）
      '.erb/**',
    ],
  },

  // JS の推奨
  js.configs.recommended,

  // --- ここがポイント：src 配下を TS パーサ + JSX 有効 + 型ありLint ---
  {
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      // ★ TS/TSX を正しくパースする
      parser: tseslint.parser,
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: true }, // ★ TSX の <JSX> を有効化
      },
    },
    plugins: {
      // ★ これで @typescript-eslint/* ルールが使える
      '@typescript-eslint': tseslint.plugin,
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': a11y,
      'import-x': importX,
      import: importLegacy, // インラインdisable用に読み込みだけ
      promise,
    },
    settings: {
      react: { version: 'detect' },
    },
    // 推奨ルール（型あり）＋カスタム
    rules: {
      // typescript-eslint の推奨(type-checked)を取り込み
      ...tseslint.configs.recommendedTypeChecked.reduce(
        (acc, cfg) => ({ ...acc, ...(cfg.rules || {}) }),
        {}
      ),

      // React 17+ 新JSX
      'react/react-in-jsx-scope': 'off',
      // Hooks 推奨
      ...reactHooks.configs.recommended.rules,

      // import-x の最低限整形
      'import-x/order': ['warn', { 'newlines-between': 'always' }],

      // 旧方針を移植
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      // import 系を緩める（import-x 版）
      'import-x/no-extraneous-dependencies': 'off',
      'import-x/no-unresolved': 'off',
      'import-x/extensions': 'off',
      'import-x/no-import-module-exports': 'off',

      // 旧プラグイン名の“存在確認”だけ満たす（有効化はしない）
      'import/prefer-default-export': 'off',
      'promise/always-return': 'off',
    },
  },
];
