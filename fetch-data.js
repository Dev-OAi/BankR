import puppeteer from 'puppeteer';
import fs from 'fs';

// --- Configuration ---
// NEW: We define a list of target bank pages. We can add more later.
const TARGET_BANKS = [
  {
    name: 'Marcus by Goldman Sachs',
    url: 'https://www.depositaccounts.com/banks/marcus-goldman-sachs.html'
  },
  {
    name: 'Capital One',
    url: 'https://www.depositaccounts.com/banks/capital-one-360.html'
  },
  {
    name: 'Ally Bank',
    url: 'https://www.depositaccounts.com/banks/ally-bank.html'
  }
  // We can add more bank objects here in the future
];

const HISTORY_FILE_PATH = './bank-rates-history.json';

// --- Main Function ---
async function fetchAndSaveData() {
  console.log('Starting targeted bank page scrape...');
  let browser = null;
  const allBankRates = [];

  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36');

    // Loop through each bank in our target list
    for (const bank of TARGET_BANKS) {
      console.log(`--- Scraping: ${bank.name} ---`);
      console.log(`Navigating to: ${bank.url}`);
      await page.goto(bank.url, { waitUntil: 'networkidle2' });

      // Wait for the specific CD rates table to be on the page
      try {
        await page.waitForSelector('#cdTable', { timeout: 10000 });
        console.log('CD table found.');
      } catch (e) {
        console.log(`No CD table found for ${bank.name}. Skipping.`);
        continue; // Go to the next bank in the list
      }

      // Extract the data from the CD table
      const cdRates = await page.evaluate((bankName) => {
        const rates = [];
        const table = document.querySelector('#cdTable');
        const rows = table.querySelectorAll('tbody tr');

        rows.forEach(row => {
          const apyEl = row.querySelector('td.apy');
          const minEl = row.querySelector('td:nth-child(2)'); // 2nd column
          const maxEl = row.querySelector('td:nth-child(3)'); // 3rd column
          const accountNameEl = row.querySelector('td:nth-child(4)'); // 4th column

          if (apyEl && minEl && accountNameEl) {
            rates.push({
              bank_name: bankName, // Add the bank name to each entry
              apy: parseFloat(apyEl.innerText.replace('%', '').trim()),
              min_deposit: minEl.innerText.trim(),
              max_deposit: maxEl ? maxEl.innerText.trim() : 'N/A',
              account_name: accountNameEl.innerText.trim()
            });
          }
        });
        return rates;
      }, bank.name); // Pass the bank name into the evaluate function

      console.log(`Found ${cdRates.length} CD rates for ${bank.name}.`);
      allBankRates.push(...cdRates);
    }

    console.log('--- Scraping finished ---');
    if (allBankRates.length === 0) {
      throw new Error('No rates were scraped. Something went wrong.');
    }

    // Create and save the historical entry
    const newHistoryEntry = {
      date: new Date().toISOString(),
      data: allBankRates,
    };

    let history = [];
    if (fs.existsSync(HISTORY_FILE_PATH)) {
      const fileContent = fs.readFileSync(HISTORY_FILE_PATH);
      history = JSON.parse(fileContent);
    }

    history.push(newHistoryEntry);
    fs.writeFileSync(HISTORY_FILE_PATH, JSON.stringify(history, null, 2));

    console.log(`Successfully saved data to ${HISTORY_FILE_PATH}. Total rates: ${allBankRates.length}`);

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