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

// --- Main Function ---
async function fetchAndSaveData() {
  console.log('Starting DEEP scrape of bank pages...');
  let browser = null;
  const allBankRates = [];
  let rateHistoryCsvContent = 'bank_name,account_name,history_date,history_apy\n'; // CSV Header

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

      try {
        await page.waitForSelector('#cdTable tbody tr', { timeout: 10000 });
        console.log('CD table found.');
      } catch (e) {
        console.log(`No CD table found for ${bank.name}. Skipping.`);
        continue;
      }

      // Get all rows from the CD table
      const rows = await page.$$('#cdTable tbody tr');
      console.log(`Found ${rows.length} product rows to process for ${bank.name}.`);

      for (const row of rows) {
        // --- Phase 1: Scrape Main Table Data ---
        const mainRateData = await row.evaluate(el => {
          const accountId = el.id.replace('a', '');
          const apyEl = el.querySelector('td.apy');
          const minEl = el.querySelector('td:nth-child(2)');
          const accountNameEl = el.querySelector('td:nth-child(4)');
          const detailsLink = el.querySelector('td:last-child a');

          if (!apyEl || !minEl || !accountNameEl || !detailsLink || !accountId) return null;

          return {
            accountId,
            bank_name: '', // Will be filled in later
            apy: parseFloat(apyEl.innerText.replace('%', '').trim()),
            min_deposit: minEl.innerText.trim(),
            account_name: accountNameEl.innerText.trim(),
            details_link_selector: `tr#${el.id} td:last-child a`
          };
        });

        if (!mainRateData) continue;
        mainRateData.bank_name = bank.name;
        
        // --- Phase 1 Continued: Scrape Dropdown Details ---
        console.log(`Clicking details for: ${mainRateData.account_name}`);
        await page.click(mainRateData.details_link_selector);
        await page.waitForSelector(`tr#a${mainRateData.accountId} + tr.accountDetails`, { visible: true, timeout: 5000 });
        
        const updatedDate = await page.evaluate((accountId) => {
            const detailsRow = document.querySelector(`tr#a${accountId} + tr.accountDetails`);
            const dateEl = detailsRow.querySelector('.rate-history-date');
            return dateEl ? dateEl.innerText.replace('Last updated on', '').trim() : 'N/A';
        }, mainRateData.accountId);
        mainRateData.last_updated = updatedDate;
        allBankRates.push(mainRateData);
        
        // --- Phase 2: Scrape Rate History from Hidden API ---
        console.log(`Fetching rate history for account ID: ${mainRateData.accountId}`);
        try {
            const historyResponse = await page.evaluate(async (url) => {
                const res = await fetch(url);
                return await res.json();
            }, `${RATE_HISTORY_API_BASE}${mainRateData.accountId}`);
            
            if (historyResponse && historyResponse.Date && historyResponse.Apy) {
                for (let i = 0; i < historyResponse.Date.length; i++) {
                    const historyDate = historyResponse.Date[i];
                    const historyApy = historyResponse.Apy[i];
                    // Add a row to our CSV string
                    rateHistoryCsvContent += `"${bank.name}","${mainRateData.account_name}","${historyDate}",${historyApy}\n`;
                }
                console.log(`- Found ${historyResponse.Date.length} historical data points.`);
            }
        } catch (e) {
            console.log(`- Could not fetch rate history for account ${mainRateData.accountId}: ${e.message}`);
        }
      }
    }

    console.log('--- All scraping finished ---');
    
    // Save the main JSON file
    const newHistoryEntry = { date: new Date().toISOString(), data: allBankRates };
    let history = [];
    if (fs.existsSync(MAIN_HISTORY_FILE)) {
      history = JSON.parse(fs.readFileSync(MAIN_HISTORY_FILE));
    }
    history.push(newHistoryEntry);
    fs.writeFileSync(MAIN_HISTORY_FILE, JSON.stringify(history, null, 2));
    console.log(`Successfully saved main data to ${MAIN_HISTORY_FILE}.`);

    // Save the historical CSV file
    fs.writeFileSync(RATE_HISTORY_CSV_FILE, rateHistoryCsvContent);
    console.log(`Successfully saved historical data to ${RATE_HISTORY_CSV_FILE}.`);

  } catch (error) {
    console.error('An error occurred during the scrape:', error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed.');
    }
  }
}

fetchAndSaveData();