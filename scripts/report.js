/**
 * @fileoverview Test and Coverage reporter for Saans.
 * Runs node's native test runner with coverage and outputs verified figures for README.
 */

import { spawnSync } from "node:child_process";

// Process exit constants
const EXIT_SUCCESS = 0; // Successful execution
const EXIT_FAILURE = 1; // Execution failure

/**
 * Builds node arguments based on Node version capabilities.
 * @returns {string[]}
 */
function getNodeArgs() {
  const nodeMajor = parseInt(process.versions.node.split(".")[0], 10);
  const args = ["--test", "--experimental-test-coverage"];
  if (nodeMajor >= 22) {
    args.push('--test-coverage-exclude="tests/**"');
  }
  return args;
}

/**
 * Parses TAP output to extract test summary numbers.
 * @param {string} stdout
 * @returns {{ total: number, pass: number, fail: number }}
 */
function parseTestCounts(stdout) {
  const testsMatch = stdout.match(/# tests (\d+)/);
  const passMatch = stdout.match(/# pass (\d+)/);
  const failMatch = stdout.match(/# fail (\d+)/);

  return {
    total: testsMatch ? parseInt(testsMatch[1], 10) : 0,
    pass: passMatch ? parseInt(passMatch[1], 10) : 0,
    fail: failMatch ? parseInt(failMatch[1], 10) : 0,
  };
}

/**
 * Parses coverage report lines from node's coverage output.
 * @param {string} stdout
 * @returns {Array<{ file: string, line: string, branch: string, funcs: string }>}
 */
function parseCoverageRows(stdout) {
  const rows = [];
  const lines = stdout.split("\n");
  for (const line of lines) {
    if (line.includes("|") && !line.includes("line %") && !line.includes("---")) {
      const parts = line.split("|").map((p) => p.trim());
      if (parts.length >= 4) {
        const file = parts[0].replace(/^#\s*/, "").replace(/\\/g, "/");
        if (!file.startsWith("tests/") && file !== "all files") {
          rows.push({
            file,
            line: parts[1],
            branch: parts[2],
            funcs: parts[3],
          });
        }
      }
    }
  }
  return rows;
}

/**
 * Formats and prints the verified markdown report.
 * @param {{ total: number, pass: number, fail: number }} tests
 * @param {Array<{ file: string, line: string, branch: string, funcs: string }>} rows
 * @returns {void}
 */
function printReport(tests, rows) {
  console.log("\n=======================================================");
  console.log("             SAANS TEST & COVERAGE REPORT              ");
  console.log("=======================================================\n");
  console.log(`Node.js version : ${process.version}`);
  console.log(`Total tests     : ${tests.total}`);
  console.log(`Passed          : ${tests.pass}`);
  console.log(`Failed          : ${tests.fail}`);
  console.log("\n### Production Code Coverage (excluding test files):\n");
  console.log("| File | Line Coverage | Branch Coverage | Function Coverage |");
  console.log("| :--- | :--- | :--- | :--- |");
  for (const row of rows) {
    console.log(`| \`${row.file}\` | ${row.line}% | ${row.branch}% | ${row.funcs}% |`);
  }
  console.log("\n=======================================================\n");
}

/**
 * Main runner execution.
 * @returns {void}
 */
function run() {
  const args = getNodeArgs();
  const result = spawnSync(process.execPath, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  const stdout = result.stdout || "";
  const stderr = result.stderr || "";

  if (result.status !== 0 && result.status !== null) {
    console.error(stderr || stdout);
    process.exit(result.status || EXIT_FAILURE);
  }

  const tests = parseTestCounts(stdout);
  const rows = parseCoverageRows(stdout);
  printReport(tests, rows);
  process.exit(EXIT_SUCCESS);
}

run();
