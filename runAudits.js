import fs from 'fs';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// Parse CLI flags using yargs
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
  .help()
  .alias('help', 'h')
  .argv;

const url = argv.url;
const iterations = argv.iterations;

async function runLighthouseAudit(url, chromePort) {
  const options = {
    logLevel: 'info',
    output: 'json',
    onlyCategories: ['performance'],
    port: chromePort
  };

  const result = await lighthouse(url, options);
  return result.lhr;
}

(async () => {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const results = [];

  for (let i = 0; i < iterations; i++) {
    console.log(`Running audit ${i + 1}/${iterations} on: ${url}`);
    const lhr = await runLighthouseAudit(url, chrome.port);
    const data = {
      run: i + 1,
      performance: lhr.categories.performance.score,
      lcp: lhr.audits['largest-contentful-paint'].numericValue,
      tbt: lhr.audits['total-blocking-time'].numericValue,
      cls: lhr.audits['cumulative-layout-shift'].numericValue
    };

    results.push(data);

    fs.writeFileSync(`report-run-${i + 1}.json`, JSON.stringify(lhr, null, 2));
  }

  await chrome.kill();

  const avg = (key) => results.reduce((sum, r) => sum + r[key], 0) / results.length;

  // Print individual results
  console.log('\n🔍 Individual Results (per run):');
  results.forEach((r) => {
    console.log(
      `Run ${r.run}: ` +
      `Performance: ${(r.performance * 100).toFixed(1)} | ` +
      `LCP: ${(r.lcp / 1000).toFixed(2)}s | ` +
      `TBT: ${r.tbt.toFixed(0)}ms | ` +
      `CLS: ${r.cls.toFixed(3)}`
    );
  });

  // Print aggregated results
  console.log('\n📊 Aggregated Results:');
  console.log(`URL: ${url}`);
  console.log(`Average Performance Score: ${(avg('performance') * 100).toFixed(1)}`);
  console.log(`Average LCP: ${(avg('lcp') / 1000).toFixed(2)}s`);
  console.log(`Average TBT: ${avg('tbt').toFixed(0)}ms`);
  console.log(`Average CLS: ${avg('cls').toFixed(3)}`);
})();

