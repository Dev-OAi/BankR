import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

// --- Configuration ---
const TARGET_BANKS = [
  { name: 'Marcus by Goldman Sachs', url: 'https://www.depositaccounts.com/banks/marcus-goldman-sachs.html' },
  { name: 'Capital One', url: 'https://www.depositaccounts.com/banks/capital-one-360.html' },
  { name: 'Ally Bank', url: 'https://www.depositaccounts.com/banks/ally-bank.html' },
  { name: 'Chase', url: 'https://www.depositaccounts.com/banks/chase-manhattan-bank.html' }
];
const HISTORY_DIR = './public/history';
const LATEST_RATES_FILE = './public/latest_rates.json';

// --- Helper Function to Sanitize Bank Names for Filenames ---
const sanitizeBankName = (name) => {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '_');
};

// --- Main Function ---
async function fetchAndSaveData() {
  console.log('Starting daily snapshot scrape...');
  let browser = null;
  const allCurrentRates = [];

  // Ensure the history directory exists
  if (!fs.existsSync(HISTORY_DIR)) {
    fs.mkdirSync(HISTORY_DIR, { recursive: true });
    console.log(`Created history directory at ${HISTORY_DIR}`);
  }

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

      // --- Update Individual Bank History ---
      const sanitizedName = sanitizeBankName(bank.name);
      const bankHistoryFile = path.join(HISTORY_DIR, `${sanitizedName}.json`);
      let bankHistory = fs.existsSync(bankHistoryFile) ? JSON.parse(fs.readFileSync(bankHistoryFile)) : [];
      
      const newBankHistoryEntry = {
        date: new Date().toISOString(),
        data: rateDataFromPage
      };
      bankHistory.push(newBankHistoryEntry);
      fs.writeFileSync(bankHistoryFile, JSON.stringify(bankHistory, null, 2));
      console.log(`  - Saved snapshot for ${bank.name} to ${bankHistoryFile}`);
    }

    console.log('--- All scraping finished. Saving new daily snapshot. ---');
    if (allCurrentRates.length === 0) throw new Error('No rates were scraped.');
    
    // --- Save the Latest Rates File ---
    fs.writeFileSync(LATEST_RATES_FILE, JSON.stringify(allCurrentRates, null, 2));
    console.log(`Successfully saved latest rates to ${LATEST_RATES_FILE}.`);

  } catch (error) {
    console.error('An error occurred during the scrape:', error);
    process.exit(1);
  } finally {
    if (browser) { await browser.close(); console.log('Browser closed.');}
  }
}

fetchAndSaveData();