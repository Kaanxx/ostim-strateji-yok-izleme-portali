/**
 * Standalone E2E Test Runner for OSTİM Technical University Strateji Portal
 * 
 * Provides an independent, zero-dependency test framework and CLI runner.
 * Usage:
 *   node tests/runner.js               # Run all test tiers
 *   node tests/runner.js tier1         # Run only Tier 1
 *   node tests/runner.js tier2         # Run only Tier 2
 *   node tests/runner.js tier3         # Run only Tier 3
 *   node tests/runner.js tier4         # Run only Tier 4
 */

const path = require('path');
const fs = require('fs');

// ANSI Colors
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
};

class TestRunner {
  constructor() {
    this.suites = [];
    this.currentSuite = null;
    this.totalPass = 0;
    this.totalFail = 0;
    this.totalSkip = 0;
    this.startTime = 0;
  }

  describe(name, fn) {
    const suite = {
      name,
      tests: [],
      beforeHooks: [],
      afterHooks: [],
      beforeEachHooks: [],
      afterEachHooks: [],
    };
    this.suites.push(suite);
    const prevSuite = this.currentSuite;
    this.currentSuite = suite;
    try {
      fn();
    } finally {
      this.currentSuite = prevSuite;
    }
  }

  test(name, fn) {
    if (!this.currentSuite) {
      this.describe('Default Suite', () => {
        this.currentSuite.tests.push({ name, fn, skipped: false });
      });
      return;
    }
    this.currentSuite.tests.push({ name, fn, skipped: false });
  }

  it(name, fn) {
    this.test(name, fn);
  }

  skip(name, fn) {
    if (!this.currentSuite) return;
    this.currentSuite.tests.push({ name, fn, skipped: true });
  }

  before(fn) {
    if (this.currentSuite) this.currentSuite.beforeHooks.push(fn);
  }

  after(fn) {
    if (this.currentSuite) this.currentSuite.afterHooks.push(fn);
  }

  beforeEach(fn) {
    if (this.currentSuite) this.currentSuite.beforeEachHooks.push(fn);
  }

  afterEach(fn) {
    if (this.currentSuite) this.currentSuite.afterEachHooks.push(fn);
  }

  async runSuite(suite) {
    console.log(`\n${colors.bold}${colors.cyan}▶ Suite: ${suite.name}${colors.reset}`);
    const suiteStart = Date.now();
    let suitePass = 0;
    let suiteFail = 0;

    for (const hook of suite.beforeHooks) {
      await hook();
    }

    for (const t of suite.tests) {
      if (t.skipped) {
        console.log(`  ${colors.yellow}○ [SKIP]${colors.reset} ${colors.gray}${t.name}${colors.reset}`);
        this.totalSkip++;
        continue;
      }

      for (const hook of suite.beforeEachHooks) {
        await hook();
      }

      const tStart = Date.now();
      try {
        await t.fn();
        const duration = Date.now() - tStart;
        console.log(`  ${colors.green}✓ [PASS]${colors.reset} ${t.name} ${colors.dim}(${duration}ms)${colors.reset}`);
        suitePass++;
        this.totalPass++;
      } catch (err) {
        const duration = Date.now() - tStart;
        console.log(`  ${colors.red}✗ [FAIL]${colors.reset} ${t.name} ${colors.dim}(${duration}ms)${colors.reset}`);
        console.log(`     ${colors.red}Error: ${err.message}${colors.reset}`);
        if (err.expected !== undefined && err.actual !== undefined) {
          console.log(`     ${colors.gray}Expected: ${JSON.stringify(err.expected)}${colors.reset}`);
          console.log(`     ${colors.gray}Actual:   ${JSON.stringify(err.actual)}${colors.reset}`);
        }
        if (err.stack) {
          const stackLine = err.stack.split('\n').slice(1, 3).join('\n     ');
          console.log(`     ${colors.gray}${stackLine}${colors.reset}`);
        }
        suiteFail++;
        this.totalFail++;
      }

      for (const hook of suite.afterEachHooks) {
        await hook();
      }
    }

    for (const hook of suite.afterHooks) {
      await hook();
    }

    const suiteDuration = Date.now() - suiteStart;
    const summaryColor = suiteFail === 0 ? colors.green : colors.red;
    console.log(`  ${summaryColor}↳ ${suitePass} passed, ${suiteFail} failed (${suiteDuration}ms)${colors.reset}`);
  }

  async run() {
    this.startTime = Date.now();
    console.log(`${colors.bold}${colors.white}============================================================${colors.reset}`);
    console.log(`${colors.bold}${colors.white} OSTİM Technical University Strateji Portal - E2E Test Suite${colors.reset}`);
    console.log(`${colors.bold}${colors.white}============================================================${colors.reset}`);

    for (const suite of this.suites) {
      await this.runSuite(suite);
    }

    const totalDuration = Date.now() - this.startTime;
    console.log(`\n${colors.bold}${colors.white}============================================================${colors.reset}`);
    console.log(`${colors.bold}SUMMARY:${colors.reset}`);
    console.log(`  Suites:  ${this.suites.length}`);
    console.log(`  Passed:  ${colors.green}${this.totalPass}${colors.reset}`);
    console.log(`  Failed:  ${this.totalFail > 0 ? colors.red + this.totalFail : '0'}${colors.reset}`);
    if (this.totalSkip > 0) {
      console.log(`  Skipped: ${colors.yellow}${this.totalSkip}${colors.reset}`);
    }
    console.log(`  Total:   ${this.totalPass + this.totalFail + this.totalSkip}`);
    console.log(`  Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`${colors.bold}${colors.white}============================================================${colors.reset}`);

    if (this.totalFail > 0) {
      console.log(`\n${colors.bgRed}${colors.white} RESULT: FAILED (${this.totalFail} failures) ${colors.reset}\n`);
      return false;
    } else {
      console.log(`\n${colors.bgGreen}${colors.white} RESULT: ALL TESTS PASSED (${this.totalPass} passed) ${colors.reset}\n`);
      return true;
    }
  }
}

// Global assertion library
const assert = {
  ok(value, msg = 'Expected value to be truthy') {
    if (!value) {
      const err = new Error(msg);
      err.actual = value;
      err.expected = true;
      throw err;
    }
  },

  strictEqual(actual, expected, msg) {
    if (actual !== expected) {
      const err = new Error(msg || `Expected ${JSON.stringify(actual)} to strictly equal ${JSON.stringify(expected)}`);
      err.actual = actual;
      err.expected = expected;
      throw err;
    }
  },

  deepStrictEqual(actual, expected, msg) {
    const aStr = JSON.stringify(actual);
    const eStr = JSON.stringify(expected);
    if (aStr !== eStr) {
      const err = new Error(msg || `Deep equality mismatch:\nActual:   ${aStr}\nExpected: ${eStr}`);
      err.actual = actual;
      err.expected = expected;
      throw err;
    }
  },

  notStrictEqual(actual, expected, msg) {
    if (actual === expected) {
      const err = new Error(msg || `Expected ${JSON.stringify(actual)} to NOT equal ${JSON.stringify(expected)}`);
      err.actual = actual;
      throw err;
    }
  },

  match(str, regex, msg) {
    if (!regex.test(str)) {
      const err = new Error(msg || `Expected "${str}" to match regex ${regex}`);
      err.actual = str;
      err.expected = regex.toString();
      throw err;
    }
  },

  doesNotMatch(str, regex, msg) {
    if (regex.test(str)) {
      const err = new Error(msg || `Expected "${str}" NOT to match regex ${regex}`);
      err.actual = str;
      throw err;
    }
  },

  includes(arrayOrStr, item, msg) {
    if (!arrayOrStr || !arrayOrStr.includes(item)) {
      const err = new Error(msg || `Expected collection to include ${JSON.stringify(item)}`);
      err.actual = arrayOrStr;
      err.expected = item;
      throw err;
    }
  },

  throws(fn, regexOrMsg, msg) {
    let threw = false;
    let thrownError = null;
    try {
      fn();
    } catch (err) {
      threw = true;
      thrownError = err;
    }
    if (!threw) {
      throw new Error(msg || 'Expected function to throw an error, but it did not');
    }
    if (regexOrMsg instanceof RegExp && !regexOrMsg.test(thrownError.message)) {
      throw new Error(msg || `Expected error message "${thrownError.message}" to match ${regexOrMsg}`);
    }
  },

  closeTo(actual, expected, delta = 0.0001, msg) {
    if (Math.abs(actual - expected) > delta) {
      const err = new Error(msg || `Expected ${actual} to be within ${delta} of ${expected}`);
      err.actual = actual;
      err.expected = expected;
      throw err;
    }
  }
};

// Singleton runner instance
const globalRunner = new TestRunner();

// Exported DSL
module.exports = {
  describe: (name, fn) => globalRunner.describe(name, fn),
  test: (name, fn) => globalRunner.test(name, fn),
  it: (name, fn) => globalRunner.it(name, fn),
  skip: (name, fn) => globalRunner.skip(name, fn),
  before: (fn) => globalRunner.before(fn),
  after: (fn) => globalRunner.after(fn),
  beforeEach: (fn) => globalRunner.beforeEach(fn),
  afterEach: (fn) => globalRunner.afterEach(fn),
  assert,
  runner: globalRunner,
};

// CLI entry point
if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const filter = args.find(a => !a.startsWith('-')) || '';

    const testFiles = [
      'tier1_features.test.js',
      'tier2_boundaries.test.js',
      'tier3_pairwise.test.js',
      'tier4_realworld.test.js'
    ];

    const testsDir = __dirname;
    const filesToRun = testFiles.filter(f => {
      if (!filter) return true;
      return f.toLowerCase().includes(filter.toLowerCase());
    });

    if (filesToRun.length === 0) {
      console.error(`No test files match filter: "${filter}"`);
      process.exit(1);
    }

    console.log(`Running test files: ${filesToRun.join(', ')}\n`);

    for (const file of filesToRun) {
      const filePath = path.join(testsDir, file);
      if (fs.existsSync(filePath)) {
        require(filePath);
      } else {
        console.warn(`Test file not found: ${filePath}`);
      }
    }

    const success = await globalRunner.run();
    process.exit(success ? 0 : 1);
  })().catch(err => {
    console.error('Fatal error during test run:', err);
    process.exit(1);
  });
}
