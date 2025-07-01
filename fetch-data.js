import puppeteer from 'puppeteer';
import fs from 'fs';

// --- Configuration ---
const TARGET_BANKS = [
  { name: 'Marcus by Goldman Sachs', url: 'https://www.depositaccounts.com/banks/marcus-goldman-sachs.html' },
  { name: 'Capital One', url: 'https://www.depositaccounts.com/banks/capital-one-360.html' },
  { name: 'Ally Bank', url: 'https://www.depositaccounts.com/banks/ally-bank.html' }
];
const MAIN_HISTORY_FILE = './bank-rates-history.json';
const RATE_HISTORY_CSV_FILE = './rate-history.csv'; // We will still create this, even if empty, for consistency.
const RATE_HISTORY_API_BASE = 'https://www.depositaccounts.com/ajax/rates-history.aspx?a=';

// --- Helper Functions ---
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function humanLikeScroll(page) {
    await page.evaluate(async () => {
        const distance = 250;
        const delay = 50 + Math.random() * 50;
        for (let i = 0; i < document.body.scrollHeight / distance; i++) {
            window.scrollBy(0, distance);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    });
}

// --- Main Function ---
async function fetchAndSaveData() {
  console.log('Starting HYPER-PATIENT Research scrape...');
  let browser = null;
  const allBankRates = [];
  const allHistoryPromises = [];

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
      
      console.log('Phase 1: Researching page...');
      try {
        await page.waitForSelector('#ccpa-banner-reject-all-btn', { timeout: 5000, visible: true });
        await page.click('#ccpa-banner-reject-all-btn');
        console.log('- Rejected cookie banner.');
      } catch (e) {
        console.log('- No cookie banner found or it was not visible.');
      }
      
      await humanLikeScroll(page);

      try {
        await page.waitForSelector('#cdTable', { timeout: 15000 });
        console.log('- Expanding all detail sections one by one...');
        
        const rows = await page.$$('#cdTable tbody tr[id^="a"]');
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowId = await row.evaluate(el => el.id);
            const detailsLinkSelector = `tr#${rowId} td:last-child a`;
            const detailsRowSelector = `tr#${rowId} + tr.accountDetails`;

            const link = await page.$(detailsLinkSelector);
            if(link) {
                await link.click({ delay: 50 + Math.random() * 50 });
                // Wait specifically for THIS detail row to appear
                await page.waitForSelector(detailsRowSelector, { visible: true, timeout: 5000 });
            }
        }
        console.log(`- Successfully expanded ${rows.length} sections.`);
      } catch(e) {
        console.log(`- WARNING: Could not expand all details. Error: ${e.message}`);
      }

      console.log('Phase 2: Extracting all data...');
      const rateDataFromPage = await page.evaluate((bankName) => {
        // ... (The extraction logic is the same as before, it will now just find more data)
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

      console.log('- Queueing historical data fetches...');
      rateDataFromPage.forEach(rate => {
        const historyPromise = page.evaluate(async (url) => {
          try {
            const res = await fetch(url);
            if (res.ok) return await res.json();
          } catch (e) { /* ignore */ }
          return null;
        }, `${RATE_HISTORY_API_BASE}${rate.accountId}`);
        allHistoryPromises.push({ promise: historyPromise, context: rate });
      });
    }

    // --- Finalize ---
    console.log(`\nWaiting for a total of ${allHistoryPromises.length} history API calls to complete...`);
    const allHistoryResults = await Promise.all(allHistoryPromises.map(p => p.promise));
    console.log('All API calls have completed.');

    let csvContent = 'bank_name,account_name,history_date,history_apy\n';
    allHistoryResults.forEach((result, index) => {
      const { bank_name, account_name } = allHistoryPromises[index].context;
      if (result && result.Date && result.Apy) {
        for (let i = 0; i < result.Date.length; i++) {
          csvContent += `"${bank_name}","${account_name}","${result.Date[i]}",${result.Apy[i]}\n`;
        }
      }
    });
    fs.writeFileSync(RATE_HISTORY_CSV_FILE, csvContent);
    console.log(`Successfully saved historical data to ${RATE_HISTORY_CSV_FILE}.`);

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