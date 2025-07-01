import puppeteer from 'puppeteer';
import fs from 'fs';

// --- Configuration ---
const TARGET_BANKS = [
  { name: 'Marcus by Goldman Sachs', url: 'https://www.depositaccounts.com/banks/marcus-goldman-sachs.html' },
  { name: 'Capital One', url: 'https://www.depositaccounts.com/banks/capital-one-360.html' },
  { name: 'Ally Bank', url: 'https://www.depositaccounts.com/banks/ally-bank.html' }
];
const MAIN_HISTORY_FILE = './bank-rates-history.json';
const RATE_HISTORY_CSV_FILE = './rate-history.csv';
const RATE_HISTORY_API_BASE = 'https://www.depositaccounts.com/ajax/rates-history.aspx?a=';

// --- "Human-like" Helper Functions ---
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// NEW: A function to perform random, human-like "idle" actions
async function humanLikeDelay(page) {
    console.log('- Performing human-like delay...');
    const delay = 1000 + Math.random() * 2000; // 1 to 3 seconds
    await sleep(delay);
    // Move the mouse to a random coordinate
    await page.mouse.move(Math.random() * 800 + 100, Math.random() * 800 + 100);
    // Perform a "safe" click on the body to simulate losing focus
    await page.click('body', { delay: Math.random() * 100 + 50 });
    console.log('- Delay finished.');
}


// --- Main Function ---
async function fetchAndSaveData() {
  console.log('Starting "Distracted Human" scrape of bank pages...');
  let browser = null;
  const allBankRates = [];
  let rateHistoryCsvContent = 'bank_name,account_name,history_date,history_apy\n';

  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36');

    for (const bank of TARGET_BANKS) {
      console.log(`--- Scraping: ${bank.name} ---`);
      await page.goto(bank.url, { waitUntil: 'networkidle2' });
      await humanLikeDelay(page); // Initial delay after page load

      try {
        await page.waitForSelector('#cdTable tbody tr', { timeout: 15000 });
        console.log('CD table found.');
      } catch (e) {
        console.log(`No CD table found for ${bank.name}. Skipping.`);
        continue;
      }

      const rows = await page.$$('#cdTable tbody tr');
      console.log(`Found ${rows.length} product rows to process for ${bank.name}.`);

      for (const row of rows) {
        const rowId = await row.evaluate(el => el.id);
        if (!rowId || !rowId.startsWith('a')) continue;

        const mainRateData = await row.evaluate(el => {
          const accountId = el.id.replace('a', '');
          const apyEl = el.querySelector('td.apy');
          const minEl = el.querySelector('td:nth-child(2)');
          const accountNameEl = el.querySelector('td:nth-child(4)');
          if (!apyEl || !minEl || !accountNameEl || !accountId) return null;
          return { accountId, apy: parseFloat(apyEl.innerText.replace('%', '').trim()), min_deposit: minEl.innerText.trim(), account_name: accountNameEl.innerText.trim() };
        });

        if (!mainRateData) {
            console.log(`- Skipping a row for ${bank.name} due to missing data.`);
            continue;
        };
        mainRateData.bank_name = bank.name;
        
        try {
          console.log(`Processing details for: ${mainRateData.account_name}`);
          const detailsLinkSelector = `tr#${rowId} td:last-child a`;
          const detailsRowSelector = `tr#${rowId} + tr.accountDetails`;

          await page.evaluate(selector => document.querySelector(selector).scrollIntoView({ block: 'center' }), detailsLinkSelector);
          await humanLikeDelay(page); // Pause before clicking

          await page.click(detailsLinkSelector);

          await page.waitForSelector(detailsRowSelector, { visible: true, timeout: 30000 });
          console.log('- Details row appeared.');

          const updatedDate = await page.evaluate(selector => {
              const detailsRow = document.querySelector(selector);
              const dateEl = detailsRow.querySelector('.rate-history-date');
              return dateEl ? dateEl.innerText.replace('Last updated on', '').trim() : 'N/A';
          }, detailsRowSelector);
          mainRateData.last_updated = updatedDate;
          allBankRates.push(mainRateData);
        } catch (e) {
            console.log(`- Failed to get details for ${mainRateData.account_name}: ${e.message}`);
        }
        
        console.log(`Fetching rate history for account ID: ${mainRateData.accountId}`);
        try {
            const historyResponse = await page.evaluate(async (url) => {
                const res = await fetch(url);
                return await res.json();
            }, `${RATE_HISTORY_API_BASE}${mainRateData.accountId}`);
            
            if (historyResponse && historyResponse.Date && historyResponse.Apy) {
                for (let i = 0; i < historyResponse.Date.length; i++) {
                    rateHistoryCsvContent += `"${bank.name}","${mainRateData.account_name}","${historyResponse.Date[i]}",${historyResponse.Apy[i]}\n`;
                }
                console.log(`- Found ${historyResponse.Date.length} historical data points.`);
            }
        } catch (e) {
            console.log(`- Could not fetch rate history for account ${mainRateData.accountId}: ${e.message}`);
        }
      }
    }

    console.log('--- All scraping finished ---');
    if (allBankRates.length === 0) throw new Error('No rates were scraped. Something went wrong.');
    
    const newHistoryEntry = { date: new Date().toISOString(), data: allBankRates };
    let history = [];
    if (fs.existsSync(MAIN_HISTORY_FILE)) { history = JSON.parse(fs.readFileSync(MAIN_HISTORY_FILE)); }
    history.push(newHistoryEntry);
    fs.writeFileSync(MAIN_HISTORY_FILE, JSON.stringify(history, null, 2));
    console.log(`Successfully saved main data to ${MAIN_HISTORY_FILE}.`);
    
    fs.writeFileSync(RATE_HISTORY_CSV_FILE, rateHistoryCsvContent);
    console.log(`Successfully saved historical data to ${RATE_HISTORY_CSV_FILE}.`);

  } catch (error) {
    console.error('An error occurred during the scrape:', error);
    process.exit(1);
  } finally {
    if (browser) { await browser.close(); console.log('Browser closed.');}
  }
}

fetchAndSaveData();