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

async function fetchAndSaveData() {
  console.log('Starting ROBUST data scrape...');
  let browser = null;
  const allBankRates = [];
  const allHistoryPromises = []; // We will collect all promises here

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

      console.log(`- Found ${rateDataFromPage.length} products. Queueing history fetches.`);
      allBankRates.push(...rateDataFromPage);
      
      // For each product, create a promise to fetch its history and add it to our main list
      rateDataFromPage.forEach(rate => {
        const historyPromise = page.evaluate(async (url) => {
          try {
            const res = await fetch(url);
            if (res.ok) return await res.json();
          } catch (e) { /* ignore */ }
          return null;
        }, `${RATE_HISTORY_API_BASE}${rate.accountId}`);
        
        allHistoryPromises.push(historyPromise);
      });
    }

    // --- This is the new, critical part ---
    console.log(`\nWaiting for a total of ${allHistoryPromises.length} history API calls to complete...`);
    const allHistoryResults = await Promise.all(allHistoryPromises);
    console.log('All API calls have completed successfully.');

    // --- Now, we build the files with complete data ---
    console.log('Building final data files...');
    
    // Build and save the historical CSV file
    let csvContent = 'bank_name,account_name,history_date,history_apy\n';
    allHistoryResults.forEach((result, index) => {
      if (result && result.Date && result.Apy) {
        // Associate the history back to the correct product
        const associatedRateProduct = allBankRates[index];
        for (let i = 0; i < result.Date.length; i++) {
          csvContent += `"${associatedRateProduct.bank_name}","${associatedRateProduct.account_name}","${result.Date[i]}",${result.Apy[i]}\n`;
        }
      }
    });
    fs.writeFileSync(RATE_HISTORY_CSV_FILE, csvContent);
    console.log(`Successfully saved historical data to ${RATE_HISTORY_CSV_FILE}.`);

    // Save the main JSON file
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