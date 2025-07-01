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
  console.log('Starting "Surgical Strike" scrape...');
  let browser = null;
  const allBankRates = [];
  let rateHistoryCsvContent = 'bank_name,account_name,history_date,history_apy\n';

  try {
    browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    // --- SPEED OPTIMIZATION: Intercept and block non-essential requests ---
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (resourceType === 'image' || resourceType === 'stylesheet' || resourceType === 'font' || resourceType === 'media' || req.url().includes('google') || req.url().includes('doubleclick')) {
        req.abort();
      } else {
        req.continue();
      }
    });
    // --- End Speed Optimization ---

    for (const bank of TARGET_BANKS) {
      console.log(`--- Processing Bank: ${bank.name} ---`);
      await page.goto(bank.url, { waitUntil: 'domcontentloaded', timeout: 60000 }); // Wait for HTML, not all resources

      try {
        await page.waitForSelector('#cdTable tbody tr', { timeout: 15000 });
        console.log('- CD table found.');
      } catch (e) {
        console.log(`- No CD table found for ${bank.name}. Skipping.`);
        continue;
      }
      
      const rows = await page.$$('#cdTable tbody tr[id^="a"]');
      console.log(`- Found ${rows.length} product rows to process.`);

      for (const row of rows) {
        const rowId = await row.evaluate(el => el.id);
        const accountId = rowId.replace('a', '');
        
        // Use a single evaluate to get all data at once to minimize back-and-forth
        const rateData = await row.evaluate(el => {
            const apyEl = el.querySelector('td.apy');
            const minEl = el.querySelector('td:nth-child(2)');
            const accountNameEl = el.querySelector('td:nth-child(4)');
            return {
                apy: apyEl ? parseFloat(apyEl.innerText.replace('%', '').trim()) : 'N/A',
                min_deposit: minEl ? minEl.innerText.trim() : 'N/A',
                account_name: accountNameEl ? accountNameEl.innerText.trim() : 'Unknown Account'
            };
        });

        rateData.accountId = accountId;
        rateData.bank_name = bank.name;
        
        allBankRates.push(rateData);

        // Fetch history in parallel while the main loop continues
        page.evaluate(async (url) => {
            try {
                const res = await fetch(url);
                if (res.ok) return await res.json();
            } catch (e) { /* ignore */ }
            return null;
        }, `${RATE_HISTORY_API_BASE}${accountId}`).then(historyResponse => {
            if (historyResponse && historyResponse.Date && historyResponse.Apy) {
                for (let i = 0; i < historyResponse.Date.length; i++) {
                    rateHistoryCsvContent += `"${bank.name}","${rateData.account_name}","${historyResponse.Date[i]}",${historyResponse.Apy[i]}\n`;
                }
            }
        });
      }
    }
    
    // Final wait to ensure all background fetches for history have time to complete
    await new Promise(res => setTimeout(res, 5000));

    // --- Final Step: Save Files ---
    console.log('--- All scraping finished ---');
    if (allBankRates.length === 0) throw new Error('No rates were scraped.');
    
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