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

// --- Helper Functions ---
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function humanLikeScroll(page) {
    await page.evaluate(async () => {
        const distance = 200;
        const delay = 100 + Math.random() * 50;
        for (let i = 0; i < document.body.scrollHeight / distance; i++) {
            window.scrollBy(0, distance);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    });
}

// --- Main Function ---
async function fetchAndSaveData() {
  console.log('Starting "Full-Page Research Simulation" scrape...');
  let browser = null;
  const allBankRates = [];
  let rateHistoryCsvContent = 'bank_name,account_name,history_date,history_apy\n';

  try {
    browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');

    for (const bank of TARGET_BANKS) {
      console.log(`--- Processing Bank: ${bank.name} ---`);
      await page.goto(bank.url, { waitUntil: 'networkidle2' });
      
      // --- Step 1: Human-like "Research" Phase ---
      console.log('Phase 1: Researching page...');

      // Handle cookie banner if it exists
      try {
        const rejectButtonSelector = '#ccpa-banner-reject-all-btn';
        await page.waitForSelector(rejectButtonSelector, { timeout: 5000 });
        await page.click(rejectButtonSelector);
        console.log('- Rejected cookie banner.');
        await sleep(1000 + Math.random() * 1000); // Wait after closing banner
      } catch (e) {
        console.log('- No cookie banner found, continuing.');
      }
      
      console.log('- Scrolling down to "read" the page...');
      await humanLikeScroll(page);
      await sleep(1000 + Math.random() * 1500);
      
      console.log('- Expanding all details sections...');
      const detailLinks = await page.$$('#cdTable tbody tr td:last-child a');
      for (const link of detailLinks) {
          if (link) {
              await link.click({ delay: 50 + Math.random() * 50 });
          }
      }
      console.log(`- Expanded ${detailLinks.length} sections. Waiting for content to load...`);
      await sleep(5000); // Give a generous wait for all details to load

      // --- Step 2: Scrape All Data At Once ---
      console.log('Phase 2: Scraping all visible data...');
      
      const scrapedData = await page.evaluate((bankName) => {
        const rates = [];
        const rows = document.querySelectorAll('#cdTable tbody tr[id^="a"]'); // Only get data rows
        
        rows.forEach(row => {
          const accountId = row.id.replace('a', '');
          const apyEl = row.querySelector('td.apy');
          const minEl = row.querySelector('td:nth-child(2)');
          const accountNameEl = row.querySelector('td:nth-child(4)');
          
          // Now look for the details in the *next* row
          const detailsRow = row.nextElementSibling;
          let updatedDate = 'N/A';
          if (detailsRow && detailsRow.classList.contains('accountDetails')) {
            const dateEl = detailsRow.querySelector('.rate-history-date');
            if (dateEl) {
              updatedDate = dateEl.innerText.replace('Last updated on', '').trim();
            }
          }

          if (apyEl && minEl && accountNameEl) {
            rates.push({
              accountId,
              bank_name: bankName,
              apy: parseFloat(apyEl.innerText.replace('%', '').trim()),
              min_deposit: minEl.innerText.trim(),
              account_name: accountNameEl.innerText.trim(),
              last_updated: updatedDate
            });
          }
        });
        return rates;
      }, bank.name);

      console.log(`- Scraped ${scrapedData.length} enriched rate entries.`);
      allBankRates.push(...scrapedData);

      // --- Step 3: Scrape Historical API Data ---
      console.log('Phase 3: Fetching historical data from API...');
      for (const rate of scrapedData) {
        try {
            const historyResponse = await page.evaluate(async (url) => {
                const res = await fetch(url);
                if (!res.ok) return null; // Don't crash if one fails
                return await res.json();
            }, `${RATE_HISTORY_API_BASE}${rate.accountId}`);
            
            if (historyResponse && historyResponse.Date && historyResponse.Apy) {
                for (let i = 0; i < historyResponse.Date.length; i++) {
                    rateHistoryCsvContent += `"${bank.name}","${rate.account_name}","${historyResponse.Date[i]}",${historyResponse.Apy[i]}\n`;
                }
            }
        } catch (e) {
            console.log(`- Could not fetch rate history for account ${rate.accountId}`);
        }
      }
    }

    // --- Final Step: Save Files ---
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