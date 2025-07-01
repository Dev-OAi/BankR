import puppeteer from 'puppeteer';
import fs from 'fs';

// --- Configuration ---
const TARGET_BANKS = [
  { name: 'Marcus by Goldman Sachs', url: 'https://www.depositaccounts.com/banks/marcus-goldman-sachs.html' },
  { name: 'Capital One', url: 'https://www.depositaccounts.com/banks/capital-one-360.html' },
  { name: 'Ally Bank', url: 'https://www.depositaccounts.com/banks/ally-bank.html' }
];
const MAIN_HISTORY_FILE = './bank-rates-history.json';

// --- Helper Functions ---
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- Main Function ---
async function fetchAndSaveData() {
  console.log('Starting simplified "Single Source of Truth" scrape...');
  let browser = null;
  const allBankRates = [];

  try {
    browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
    await page.setRequestInterception(true);
    page.on('request', (req) => {
        if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
            req.abort();
        } else {
            req.continue();
        }
    });

    for (const bank of TARGET_BANKS) {
      console.log(`\n--- Processing Bank: ${bank.name} ---`);
      await page.goto(bank.url, { waitUntil: 'networkidle2', timeout: 60000 });
      
      try {
        await page.waitForSelector('#ccpa-banner-reject-all-btn', { timeout: 5000 });
        await page.click('#ccpa-banner-reject-all-btn');
        console.log('- Rejected cookie banner.');
      } catch (e) { console.log('- No cookie banner found.'); }
      
      await sleep(1000); // Small pause after potential banner click

      try {
        await page.waitForSelector('#cdTable tbody tr', { timeout: 15000 });
        const detailLinks = await page.$$('#cdTable tbody tr[id^="a"] td:last-child a');
        for (const link of detailLinks) {
          if (link) await link.click({ delay: 50 + Math.random() * 50 });
        }
        console.log(`- Expanded ${detailLinks.length} sections. Waiting for content...`);
        await sleep(4000);
      } catch(e) {
        console.log('- Warning: Could not expand all details.');
      }

      const rateDataFromPage = await page.evaluate((bankName) => {
        const rates = [];
        document.querySelectorAll('#cdTable tbody tr[id^="a"]').forEach(row => {
          const accountId = row.id.replace('a', '');
          const apyEl = row.querySelector('td.apy');
          const minEl = row.querySelector('td:nth-child(2)');
          const accountNameEl = row.querySelector('td:nth-child(4)');
          const detailsRow = row.nextElementSibling;
          let updatedDate = 'N/A';
          if (detailsRow && detailsRow.classList.contains('accountDetails')) {
            const dateEl = detailsRow.querySelector('.rate-history-date');
            if (dateEl) updatedDate = dateEl.innerText.replace('Last updated on', '').trim();
          }

          if (apyEl && minEl && accountNameEl) {
            rates.push({ accountId, bank_name: bankName, apy: parseFloat(apyEl.innerText.replace('%', '').trim()), min_deposit: minEl.innerText.trim(), account_name: accountNameEl.innerText.trim(), last_updated: updatedDate });
          }
        });
        return rates;
      }, bank.name);

      console.log(`- Scraped ${rateDataFromPage.length} enriched rate entries.`);
      allBankRates.push(...rateDataFromPage);
    }

    console.log('\n--- All scraping finished. Writing file... ---');
    if (allBankRates.length === 0) throw new Error('No rates were scraped.');
    
    const newHistoryEntry = { date: new Date().toISOString(), data: allBankRates };
    let history = fs.existsSync(MAIN_HISTORY_FILE) ? JSON.parse(fs.readFileSync(MAIN_HISTORY_FILE)) : [];
    history.push(newHistoryEntry);
    fs.writeFileSync(MAIN_HISTORY_FILE, JSON.stringify(history, null, 2));
    console.log(`Successfully saved main data to ${MAIN_HISTORY_FILE}.`);

  } catch (error) {
    console.error('An error occurred during the scrape:', error);
    process.exit(1);
  } finally {
    if (browser) { await browser.close(); console.log('Browser closed.');}
  }
}

fetchAndSaveData();