import puppeteer from 'puppeteer';
import fs from 'fs';

// --- Configuration is the same ---
const TARGET_BANKS = [
  { name: 'Marcus by Goldman Sachs', url: 'https://www.depositaccounts.com/banks/marcus-goldman-sachs.html' },
  { name: 'Capital One', url: 'https://www.depositaccounts.com/banks/capital-one-360.html' },
  { name: 'Ally Bank', url: 'https://www.depositaccounts.com/banks/ally-bank.html' }
];
const MAIN_HISTORY_FILE = './bank-rates-history.json';
const RATE_HISTORY_CSV_FILE = './rate-history.csv';
const RATE_HISTORY_API_BASE = 'https://www.depositaccounts.com/ajax/rates-history.aspx?a=';

// --- Main Function ---
async function fetchAndSaveData() {
  console.log('Starting "Surgical Strike" scrape...');
  let browser = null;
  const allBankRates = [];
  const allHistoryData = []; // Store the fetched JSON history data here

  try {
    browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType) || req.url().includes('google')) {
        req.abort();
      } else {
        req.continue();
      }
    });

    for (const bank of TARGET_BANKS) {
      console.log(`--- Processing Bank: ${bank.name} ---`);
      await page.goto(bank.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('#cdTable tbody tr', { timeout: 15000 });
      const rows = await page.$$('#cdTable tbody tr[id^="a"]');
      
      const promises = rows.map(async (row) => {
        const rateData = await row.evaluate(el => {
            const accountId = el.id.replace('a', '');
            const apyEl = el.querySelector('td.apy');
            const minEl = el.querySelector('td:nth-child(2)');
            const accountNameEl = el.querySelector('td:nth-child(4)');
            return {
                accountId,
                apy: apyEl ? parseFloat(apyEl.innerText.replace('%', '').trim()) : 'N/A',
                min_deposit: minEl ? minEl.innerText.trim() : 'N/A',
                account_name: accountNameEl ? accountNameEl.innerText.trim() : 'Unknown Account'
            };
        });
        rateData.bank_name = bank.name;
        allBankRates.push(rateData);

        // Return a promise that resolves with the history data
        return page.evaluate(async (url) => {
            try {
                const res = await fetch(url);
                if (res.ok) return await res.json();
            } catch (e) { /* ignore */ }
            return null;
        }, `${RATE_HISTORY_API_BASE}${rateData.accountId}`);
      });

      console.log(`- Waiting for ${promises.length} history API calls to finish...`);
      const historyResults = await Promise.all(promises);
      allHistoryData.push(...historyResults);
      console.log(`- All history fetched for ${bank.name}.`);
    }
    
    // --- Final Step: Process and Save Files ---
    console.log('--- All scraping finished ---');
    
    // Save main JSON
    const newHistoryEntry = { date: new Date().toISOString(), data: allBankRates };
    let history = fs.existsSync(MAIN_HISTORY_FILE) ? JSON.parse(fs.readFileSync(MAIN_HISTORY_FILE)) : [];
    history.push(newHistoryEntry);
    fs.writeFileSync(MAIN_HISTORY_FILE, JSON.stringify(history, null, 2));
    console.log(`Successfully saved main data to ${MAIN_HISTORY_FILE}.`);

    // Build and save CSV from the collected history data
    let rateHistoryCsvRows = [];
    allHistoryData.forEach((historyResponse, index) => {
        if (historyResponse && historyResponse.Date && historyResponse.Apy) {
            const associatedRate = allBankRates[index];
            for (let i = 0; i < historyResponse.Date.length; i++) {
                const csvRow = `"${associatedRate.bank_name}","${associatedRate.account_name}","${historyResponse.Date[i]}",${historyResponse.Apy[i]}`;
                rateHistoryCsvRows.push(csvRow);
            }
        }
    });

    const csvHeader = 'bank_name,account_name,history_date,history_apy\n';
    const csvContent = csvHeader + rateHistoryCsvRows.join('\n');
    fs.writeFileSync(RATE_HISTORY_CSV_FILE, csvContent);
    console.log(`Successfully saved ${rateHistoryCsvRows.length} rows to ${RATE_HISTORY_CSV_FILE}.`);

  } catch (error) {
    console.error('An error occurred during the scrape:', error);
    process.exit(1);
  } finally {
    if (browser) { await browser.close(); console.log('Browser closed.');}
  }
}

fetchAndSaveData();