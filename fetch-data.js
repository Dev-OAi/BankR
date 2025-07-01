import puppeteer from 'puppeteer';
import fs from 'fs';

// --- Configuration ---
const API_URL = 'https://www.lendingtree.com/quote-engine/graphql';
const HISTORY_FILE_PATH = './apy-history.json';

// --- GraphQL Query ---
const GQL_QUERY = `
  query CombinedQuery {
    CdRates(
      where: {
        AND: [
          { cd_term_months: { in: [6, 12, 60] } }
          { apy: { gte: 5 } }
        ]
      }
      limit: 100
    ) {
      results {
        id
        bank_id
        apy
        cd_term_months
        min_deposit
      }
    }
    BankReviews(limit: 500) {
      results {
        id
        bank_id
        bank_name
        bank_logo
      }
    }
  }
`;

// --- Main Function using Puppeteer ---
async function fetchAndSaveData() {
  console.log('Starting data fetch with Puppeteer...');
  let browser = null;

  try {
    // 1. Launch a headless browser
    // The '--no-sandbox' flag is important for running in GitHub Actions
    browser = await puppeteer.launch({
        headless: "new", // Use the new headless mode
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // 2. Use page.evaluate to run the fetch call inside the browser's context
    // This will send all the necessary browser headers, cookies, etc.
    const apiResponse = await page.evaluate(async (url, query) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // No need for User-Agent or Referer, the browser handles it!
        },
        body: JSON.stringify({ query: query }),
      });
      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    }, API_URL, GQL_QUERY);

    console.log('Successfully fetched data from the API.');

    // 3. Process the data (this part is the same as before)
    const rates = apiResponse.data.CdRates.results;
    const reviews = apiResponse.data.BankReviews.results;
    const bankReviewsMap = new Map(reviews.map(review => [review.bank_id, review]));
    const combinedData = rates.map(rate => {
      const review = bankReviewsMap.get(rate.bank_id);
      return {
        ...rate,
        bank_name: review ? review.bank_name : 'Unknown Bank',
        bank_logo: review ? review.bank_logo : null,
      };
    });

    console.log(`Successfully processed ${combinedData.length} rate entries.`);

    // 4. Create and save the historical entry (same as before)
    const newHistoryEntry = {
      date: new Date().toISOString(),
      data: combinedData,
    };

    let history = [];
    if (fs.existsSync(HISTORY_FILE_PATH)) {
      const fileContent = fs.readFileSync(HISTORY_FILE_PATH);
      history = JSON.parse(fileContent);
    }

    history.push(newHistoryEntry);
    fs.writeFileSync(HISTORY_FILE_PATH, JSON.stringify(history, null, 2));

    console.log(`Successfully saved data to ${HISTORY_FILE_PATH}. Total historical records: ${history.length}.`);

  } catch (error) {
    console.error('An error occurred during the fetch and save process:', error);
    process.exit(1); // Exit with a failure code to make the GitHub Action fail clearly
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed.');
    }
  }
}

fetchAndSaveData();