import js from "@eslint/js";
import globals from "globals";

/**
 * Custom rule enforcing an error for functions exceeding 50 non-comment lines.
 * Works alongside the standard max-lines-per-function (which warns at 40).
 */
const maxFuncLinesErrorRule = {
  meta: {
    type: "problem",
    docs: {
      description: "Error when function exceeds 50 lines (excluding blank lines and comments)",
    },
    schema: [],
  },
  create(context) {
    function check(node) {
      const sourceCode = context.sourceCode;
      const lines = sourceCode.lines.slice(node.loc.start.line - 1, node.loc.end.line);
      const codeLines = lines.filter((line) => {
        const trimmed = line.trim();
        return (
          trimmed.length > 0 &&
          !trimmed.startsWith("//") &&
          !trimmed.startsWith("/*") &&
          !trimmed.startsWith("*")
        );
      });
      if (codeLines.length > 50) {
        context.report({
          node,
          message: `Function has ${codeLines.length} lines of code. Maximum allowed before error is 50.`,
        });
      }
    }
    return {
      FunctionDeclaration: check,
      FunctionExpression: check,
      ArrowFunctionExpression: check,
    };
  },
};

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    plugins: {
      saans: {
        rules: {
          "max-lines-error-50": maxFuncLinesErrorRule,
        },
      },
    },
    rules: {
      eqeqeq: ["error", "always"],
      "prefer-const": "error",
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "max-lines": [
        "error",
        {
          max: 250,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
      complexity: ["error", 10],
      "max-lines-per-function": [
        "error",
        {
          max: 40,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
      "saans/max-lines-error-50": "error",
    },
  },
  {
    files: ["web/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    files: ["api/**/*.js", "scripts/**/*.js", "tests/**/*.js", "eslint.config.js"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ["tests/frontend/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    // Ignore build, node_modules and coverage
    ignores: ["node_modules/**", "coverage/**", ".vercel/**"],
  },
];
