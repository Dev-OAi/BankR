import puppeteer from 'puppeteer';
import fs from 'fs';

// --- Configuration ---
const START_URL = 'https://www.depositaccounts.com/cd/';
const HISTORY_FILE_PATH = './da-history.json'; // New file for this source

// --- Main Function ---
async function fetchAndSaveData() {
  console.log('Starting paginated scrape of DepositAccounts.com...');
  let browser = null;
  const allRates = []; // Array to hold data from all pages

  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36');

    console.log(`Navigating to starting URL: ${START_URL}`);
    await page.goto(START_URL, { waitUntil: 'networkidle2' });

    let pageNum = 1;
    while (true) {
      console.log(`--- Scraping Page ${pageNum} ---`);

      // Wait for the rate table to be visible
      await page.waitForSelector('#rate-table-container-responsive');

      // Scrape data from the current page
      const pageRates = await page.evaluate(() => {
        const rates = [];
        // Select all rows in the table body
        const rows = document.querySelectorAll('#rate-table-container-responsive tbody tr');
        rows.forEach(row => {
          // Use querySelector for safer access to elements that might be missing
          const bankNameEl = row.querySelector('span[data-ga-label="Institution Name"]');
          const termEl = row.querySelector('td.term');
          const apyEl = row.querySelector('td.apy');

          // Only add the row if all essential data is present
          if (bankNameEl && termEl && apyEl) {
            rates.push({
              bank_name: bankNameEl.innerText.trim(),
              term_months: parseInt(termEl.innerText.trim(), 10),
              apy: parseFloat(apyEl.innerText.trim()),
            });
          }
        });
        return rates;
      });

      console.log(`Found ${pageRates.length} rates on this page.`);
      allRates.push(...pageRates);

      // --- Pagination Logic ---
      // Find the "Next" button. We use a robust selector to find the div with the correct class and text content.
      const nextButtonSelector = 'div.rate-table-pager-prev-next';
      const nextButton = await page.evaluateHandle((selector) => {
          const buttons = Array.from(document.querySelectorAll(selector));
          return buttons.find(button => button.innerText.includes('Next'));
      }, nextButtonSelector);
      
      // Check if the button exists and is clickable (not disabled).
      if (nextButton && (await nextButton.evaluate(b => !b.classList.contains('disabled')))) {
        console.log('"Next" button found. Clicking to go to next page...');
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2' }), // Wait for the page to reload
          nextButton.click() // Click the button
        ]);
        pageNum++;
      } else {
        console.log('"Next" button not found or is disabled. Reached the last page.');
        break; // Exit the loop
      }
    }

    console.log('--- Scraping finished ---');
    console.log(`Total rates found across all pages: ${allRates.length}`);

    // Create and save the historical entry
    const newHistoryEntry = {
      date: new Date().toISOString(),
      data: allRates,
    };

    let history = [];
    if (fs.existsSync(HISTORY_FILE_PATH)) {
      const fileContent = fs.readFileSync(HISTORY_FILE_PATH);
      history = JSON.parse(fileContent);
    }

    history.push(newHistoryEntry);
    fs.writeFileSync(HISTORY_FILE_PATH, JSON.stringify(history, null, 2));

    console.log(`Successfully saved data to ${HISTORY_FILE_PATH}.`);

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