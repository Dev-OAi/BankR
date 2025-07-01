import puppeteer from 'puppeteer';
import fs from 'fs';

// --- Configuration ---
const TARGET_BANKS = [
  { name: 'Marcus by Goldman Sachs', url: 'https://www.depositaccounts.com/banks/marcus-goldman-sachs.html' },
  { name: 'Capital One', url: 'https://www.depositaccounts.com/banks/capital-one-360.html' },
  { name: 'Ally Bank', url: 'https://www.depositaccounts.com/banks/ally-bank.html' }
];
const HISTORY_FILE = './bank-rates-history.json';

// --- Main Function ---
async function fetchAndSaveData() {
  console.log('Starting simplified daily snapshot scrape...');
  let browser = null;
  const allCurrentRates = [];

  try {
    browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    for (const bank of TARGET_BANKS) {
      console.log(`- Processing ${bank.name}`);
      await page.goto(bank.url, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#cdTable tbody tr[id^="a"]', { timeout: 15000 });
      
      const rateDataFromPage = await page.evaluate((bankName) => {
        const rates = [];
        document.querySelectorAll('#cdTable tbody tr[id^="a"]').forEach(row => {
          const accountId = row.id.replace('a', '');
          const apyEl = row.querySelector('td.apy');
          const minEl = row.querySelector('td:nth-child(2)');
          const accountNameEl = row.querySelector('td:nth-child(4)');
          if (apyEl && minEl && accountNameEl) {
            rates.push({
              accountId,
              bank_name: bankName,
              apy: parseFloat(apyEl.innerText.replace('%', '').trim()),
              min_deposit: minEl.innerText.trim(),
              account_name: accountNameEl.innerText.trim()
            });
          }
        });
        return rates;
      }, bank.name);

      allCurrentRates.push(...rateDataFromPage);
    }

    console.log('--- All scraping finished. Saving new daily snapshot. ---');
    if (allCurrentRates.length === 0) throw new Error('No rates were scraped.');
    
    const newHistoryEntry = { date: new Date().toISOString(), data: allCurrentRates };
    let history = fs.existsSync(HISTORY_FILE) ? JSON.parse(fs.readFileSync(HISTORY_FILE)) : [];
    history.push(newHistoryEntry);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
    console.log(`Successfully saved new snapshot to ${HISTORY_FILE}.`);

  } catch (error) {
    console.error('An error occurred during the scrape:', error);
    process.exit(1);
  } finally {
    if (browser) { await browser.close(); console.log('Browser closed.');}
  }
}

fetchAndSaveData();