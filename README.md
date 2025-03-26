This is a small Node.js script that runs multiple Lighthouse audits on a single URL and shows you the average performance results. If you want, it can export a CSV file with all the numbers.

# How It Works
Runs Lighthouse a bunch of times in a row (or all at once in parallel—though that can get noisy).

Saves each run's JSON report 

Logs the results (performance scores, LCP, TBT, CLS) for each run, plus the average for all runs.

(Optional) Creates a summary.csv if you want a quick reference without digging through JSON.

# Getting Started
Clone or Download this project.

Install dependencies:

`npm install`

Make sure you have Node.js v18+ and Chrome installed.

# Usage
##  Basic Command

`node lh-udits.js --url https://example.com --iterations 3`

- Audits https://example.com 3 times.

- Saves report-run-1.json, report-run-2.json, report-run-3.json.

- Shows a breakdown of each run, plus an average at the end.

## Parallel Mode
This does not work currently

## Flags
--url, -u (required)
The URL you want to audit.

--iterations, -i (default: 3)
How many times to run Lighthouse.

--parallel, -p (default: false)
Run all audits at once. Faster, but might cause conflicts.

--export, -e (default: false)
Create a summary.csv with the results.



