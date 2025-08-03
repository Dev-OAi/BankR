import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

// --- Configuration ---
const TARGET_BANKS = [
  { name: 'Marcus by Goldman Sachs', url: 'https://www.depositaccounts.com/banks/marcus-goldman-sachs.html' },
  { name: 'Capital One', url: 'https://www.depositaccounts.com/banks/capital-one-360.html' },
  { name: 'Ally Bank', url: 'https://www.depositaccounts.com/banks/ally-bank.html' },
  { name: 'Chase', url: 'https://www.depositaccounts.com/banks/chase-manhattan-bank.html' },
  { name: 'Valley Bank', url: 'https://www.depositaccounts.com/banks/valley.html' },
  { name: 'Flagstar Bank', url: 'https://www.depositaccounts.com/banks/flagstar-bank.html' },
  { name: 'TD Bank', url: 'https://www.depositaccounts.com/banks/td-bank-national-association.html' },
  { name: 'Sallie Mae Bank', url: 'https://www.depositaccounts.com/banks/sallie-mae-bank.html' }
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
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    for (const bank of TARGET_BANKS) {
      console.log(`- Processing ${bank.name} from ${bank.url}`);
      let rateDataFromPage = [];
      try {
        await page.goto(bank.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        console.log(`  - Page loaded for ${bank.name}.`);
        await page.waitForSelector('#cdTable tbody tr[id^="a"]', { timeout: 15000 });
        console.log(`  - Selector found for ${bank.name}.`);
        
        rateDataFromPage = await page.evaluate((bankName) => {
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

        if (rateDataFromPage.length === 0) {
          console.warn(`  - No rates found for ${bank.name} on this page.`);
        } else {
          console.log(`  - Found ${rateDataFromPage.length} rates for ${bank.name}.`);
        }

      } catch (scrapeError) {
        console.error(`  - Error scraping ${bank.name}: ${scrapeError.message}`);
        // Continue to next bank even if one fails
      }

      allCurrentRates.push(...rateDataFromPage);

      // --- Update Individual Bank History ---
      const sanitizedName = sanitizeBankName(bank.name);
      const bankHistoryFile = path.join(HISTORY_DIR, `${sanitizedName}.json`);
      let bankHistory = [];
      if (fs.existsSync(bankHistoryFile)) {
        try {
          bankHistory = JSON.parse(fs.readFileSync(bankHistoryFile));
        } catch (parseError) {
          console.error(`  - Error parsing existing history for ${bank.name}: ${parseError.message}. Starting new history.`);
          bankHistory = []; // Reset history if parsing fails
        }
      }
      
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