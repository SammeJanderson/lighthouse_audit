import fs from 'fs';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .option('url', {
    alias: 'u',
    type: 'string',
    description: 'The URL to audit',
    demandOption: true,
  })
  .option('iterations', {
    alias: 'i',
    type: 'number',
    default: 3,
    description: 'Number of times to run the audit',
  })
  .option('parallel', {
    alias: 'p',
    type: 'boolean',
    default: false,
    description: 'Run audits in parallel (faster but less accurate)',
  })
  .option('export', {
    alias: 'e',
    type: 'boolean',
    default: false,
    description: 'Export results to a CSV file (summary.csv)',
  })
  .help()
  .alias('help', 'h')
  .argv;

const url = argv.url;
const iterations = argv.iterations;
const parallel = argv.parallel;
const exportCSV = argv.export;

async function runLighthouseAudit(url, runNumber) {
  const label = `Run ${runNumber}`;
  console.log('\n--------------------');
  console.log(`Starting audit #${runNumber}`);
  console.time(label);

  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const options = {
    logLevel: 'error',
    output: 'json',
    onlyCategories: ['performance'],
    port: chrome.port,
  };

  const result = await lighthouse(url, options);
  await chrome.kill();

  const lhr = result.lhr;

  fs.writeFileSync(`report-run-${runNumber}.json`, JSON.stringify(lhr, null, 2));

  console.timeEnd(label);
  console.log(`Completed audit #${runNumber}`);

  return {
    run: runNumber,
    performance: lhr.categories.performance.score,
    lcp: lhr.audits['largest-contentful-paint'].numericValue,
    tbt: lhr.audits['total-blocking-time'].numericValue,
    cls: lhr.audits['cumulative-layout-shift'].numericValue,
  };
}

(async () => {
  console.log(`\nAuditing: ${url}`);
  console.log(`Iterations: ${iterations}`);
  console.log(`Mode: ${parallel ? 'Parallel' : 'Sequential'}`);
  console.log(`Export CSV: ${exportCSV ? 'Yes' : 'No'}\n`);

  const totalLabel = 'Total audit time';
  console.time(totalLabel);

  let results = [];

  if (parallel) {
    // Run all in parallel
    const promises = Array.from({ length: iterations }, (_, i) =>
      runLighthouseAudit(url, i + 1)
    );
    results = await Promise.all(promises);
    results.sort((a, b) => a.run - b.run);
  } else {
    // Run sequentially
    for (let i = 0; i < iterations; i++) {
      const result = await runLighthouseAudit(url, i + 1);
      results.push(result);
    }
  }

  console.timeEnd(totalLabel);

  // Print individual results
  console.log('\nIndividual Results (per run):');
  results.forEach((r) => {
    console.log(
      `Run ${r.run}: ` +
      `Performance: ${(r.performance * 100).toFixed(1)} | ` +
      `LCP: ${(r.lcp / 1000).toFixed(2)}s | ` +
      `TBT: ${r.tbt.toFixed(0)}ms | ` +
      `CLS: ${r.cls.toFixed(3)}`
    );
  });

  // Aggregation
  const avg = (key) => results.reduce((sum, r) => sum + r[key], 0) / results.length;

  console.log('\nAggregated Results:');
  console.log(`Average Performance Score: ${(avg('performance') * 100).toFixed(1)}`);
  console.log(`Average LCP: ${(avg('lcp') / 1000).toFixed(2)}s`);
  console.log(`Average TBT: ${avg('tbt').toFixed(0)}ms`);
  console.log(`Average CLS: ${avg('cls').toFixed(3)}\n`);

  // Export results to CSV if requested
  if (exportCSV) {
    const csvHeader = 'run,performance,lcp,tbt,cls';
    const csvRows = results.map(
      (r) => [
        r.run,
        r.performance.toFixed(2),      // still in range 0-1
        (r.lcp / 1000).toFixed(2),     // LCP in seconds
        r.tbt.toFixed(0),             // TBT in ms
        r.cls.toFixed(3),             // CLS
      ].join(',')
    );
    const csvContent = [csvHeader, ...csvRows].join('\n');

    fs.writeFileSync('summary.csv', csvContent, 'utf-8');
    console.log('CSV export completed: summary.csv');
  }
})();

