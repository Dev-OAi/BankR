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
  console.log('Starting "Surgical Strike" scrape with corrected logic...');
  let browser = null;
  const allBankRates = [];
  
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

    const allHistoryData = []; // To store results from the history API

    for (const bank of TARGET_BANKS) {
      console.log(`--- Processing Bank: ${bank.name} ---`);
      await page.goto(bank.url, { waitUntil: 'domcontentloaded', timeout: 60000 });

      try {
        await page.waitForSelector('#cdTable tbody tr[id^="a"]', { timeout: 15000 });
        console.log('- CD table found.');
      } catch (e) {
        console.log(`- No CD table found for ${bank.name}. Skipping.`);
        continue;
      }
      
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

      allBankRates.push(...rateDataFromPage);
      
      // Create an array of promises, one for each history API call
      const historyPromises = rateDataFromPage.map(rate =>
        page.evaluate(async (url) => {
          try {
            const res = await fetch(url);
            if (res.ok) return await res.json();
          } catch (e) { /* ignore */ }
          return null;
        }, `${RATE_HISTORY_API_BASE}${rate.accountId}`)
      );
      
      // Wait for all of them to finish
      console.log(`- Waiting for ${historyPromises.length} history API calls...`);
      const historyResults = await Promise.all(historyPromises);
      console.log('- All calls finished.');
      
      // Process the results, associating them back to the original rate data
      historyResults.forEach((result, index) => {
        if (result && result.Date && result.Apy) {
          allHistoryData.push({
            bank_name: rateDataFromPage[index].bank_name,
            account_name: rateDataFromPage[index].account_name,
            history: result
          });
        }
      });
    }

    // --- Final Step: Save Files ---
    console.log('--- All scraping finished ---');
    if (allBankRates.length === 0) throw new Error('No rates were scraped.');
    
    // Save the main JSON file
    const newHistoryEntry = { date: new Date().toISOString(), data: allBankRates };
    let history = fs.existsSync(MAIN_HISTORY_FILE) ? JSON.parse(fs.readFileSync(MAIN_HISTORY_FILE)) : [];
    history.push(newHistoryEntry);
    fs.writeFileSync(MAIN_HISTORY_FILE, JSON.stringify(history, null, 2));
    console.log(`Successfully saved main data to ${MAIN_HISTORY_FILE}.`);
    
    // Build and save the historical CSV file from the collected data
    let csvContent = 'bank_name,account_name,history_date,history_apy\n';
    allHistoryData.forEach(item => {
      for (let i = 0; i < item.history.Date.length; i++) {
        csvContent += `"${item.bank_name}","${item.account_name}","${item.history.Date[i]}",${item.history.Apy[i]}\n`;
      }
    });
    fs.writeFileSync(RATE_HISTORY_CSV_FILE, csvContent);
    console.log(`Successfully saved historical data to ${RATE_HISTORY_CSV_FILE}.`);

  } catch (error) {
    console.error('An error occurred during the scrape:', error);
    process.exit(1);
  } finally {
    if (browser) { await browser.close(); console.log('Browser closed.');}
  }
}

fetchAndSaveData();