/**
 * @fileoverview Test and Coverage reporter for Saans.
 * Runs node's native test runner with coverage and outputs verified figures for README.
 */

import { spawnSync } from "node:child_process";

// Process exit constants
const EXIT_SUCCESS = 0; // Successful execution
const EXIT_FAILURE = 1; // Execution failure

/**
 * Checks that Node is at least version 22.
 * @returns {void}
 */
function checkNodeVersion() {
  const nodeMajor = parseInt(process.versions.node.split(".")[0], 10);
  if (nodeMajor < 22) {
    console.error("Error: Node 22 or higher is required for coverage report generation.");
    process.exit(EXIT_FAILURE);
  }
}

/**
 * Builds node arguments based on Node version capabilities.
 * @returns {string[]}
 */
function getNodeArgs() {
  return ["--test", "--experimental-test-coverage", "--test-coverage-exclude=tests/**"];
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
 * @typedef {{ file: string, line: string, branch: string, funcs: string }} CoverageRow
 */

/**
 * Parses coverage report lines from node's coverage output.
 * @param {string} stdout
 * @returns {{ rows: CoverageRow[], aggregate: CoverageRow | null }}
 */
function parseCoverage(stdout) {
  /** @type {CoverageRow[]} */
  const rows = [];
  /** @type {CoverageRow | null} */
  let aggregate = null;
  /** @type {string[]} */
  const stack = [];

  for (const line of stdout.split("\n")) {
    if (!line.includes("|") || line.includes("line %") || line.includes("---")) continue;
    const parts = line.split("|").map((p) => p.trim());
    const firstPipe = line.indexOf("|");
    const namePart = line.slice(1, firstPipe);
    const trimmed = namePart.trim();
    const indent = namePart.length - namePart.trimStart().length - 1;

    if (trimmed === "all files") {
      aggregate = { file: "all files", line: parts[1], branch: parts[2], funcs: parts[3] };
      continue;
    }
    stack[indent] = trimmed;
    stack.length = indent + 1;
    if (parts[1] !== "") {
      const fullPath = stack.join("/");
      if (!fullPath.startsWith("tests/")) {
        rows.push({ file: fullPath, line: parts[1], branch: parts[2], funcs: parts[3] });
      }
    }
  }
  return { rows, aggregate };
}

/**
 * Formats and prints the verified markdown report.
 * @param {{ total: number, pass: number, fail: number }} tests
 * @param {CoverageRow[]} rows
 * @param {CoverageRow | null} aggregate
 * @returns {void}
 */
function printReport(tests, rows, aggregate) {
  console.log("\n=======================================================");
  console.log("             SAANS TEST & COVERAGE REPORT              ");
  console.log("=======================================================\n");
  console.log(`Node.js version : ${process.version}`);
  console.log(`Total tests     : ${tests.total}`);
  console.log(`Passed          : ${tests.pass}`);
  console.log(`Failed          : ${tests.fail}`);
  if (aggregate) {
    console.log(
      `- **Aggregate Coverage**: Line: ${aggregate.line}% | Branch: ${aggregate.branch}% | Function: ${aggregate.funcs}%`
    );
  }
  console.log("\n### Production Code Coverage (excluding test files):\n");
  console.log("| Module / File | Line Coverage | Branch Coverage | Function Coverage |");
  console.log("| :--- | :--- | :--- | :--- |");
  for (const row of rows) {
    console.log(`| \`${row.file}\` | ${row.line}% | ${row.branch}% | ${row.funcs}% |`);
  }
  if (aggregate) {
    console.log(
      `| **all files** | ${aggregate.line}% | ${aggregate.branch}% | ${aggregate.funcs}% |`
    );
  }
  console.log("\n=======================================================\n");
}

/**
 * Main runner execution.
 * @returns {void}
 */
function run() {
  checkNodeVersion();
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
  const { rows, aggregate } = parseCoverage(stdout);
  printReport(tests, rows, aggregate);
  process.exit(EXIT_SUCCESS);
}

run();
