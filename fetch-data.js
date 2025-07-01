import puppeteer from 'puppeteer';
import fs from 'fs';

// --- Configuration ---
const API_URL = 'https://www.lendingtree.com/quote-engine/graphql';
const HISTORY_FILE_PATH = './apy-history.json';
const HOME_PAGE_URL = 'https://www.lendingtree.com/';

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

// --- Helper function for random delays ---
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --- Main Function using Puppeteer ---
async function fetchAndSaveData() {
  console.log('Starting "Human Simulation" data fetch with Puppeteer...');
  let browser = null;

  try {
    // Launch a headless browser
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Set a realistic viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36');

    // Navigate to the homepage to establish a valid origin and get cookies.
    console.log(`Navigating to ${HOME_PAGE_URL}...`);
    await page.goto(HOME_PAGE_URL, { waitUntil: 'networkidle2' });
    console.log('Navigation successful. Page is loaded.');

    // --- Human-like Interaction ---
    console.log('Simulating human interaction (scrolling and waiting)...');
    // Scroll down the page slowly to trigger any lazy-loaded scripts
    await page.evaluate(async () => {
      const distance = 100; // should be less than or equal to window.innerHeight
      const delay = 100;
      for (let i = 0; i < document.body.scrollHeight / distance; i++) {
        window.scrollBy(0, distance);
        await new Promise(resolve => setTimeout(resolve, delay + Math.random() * 50)); // random small delay
      }
    });
    console.log('Scrolling finished.');

    // Wait for a few seconds as if a user is reading
    const randomWait = 5000 + Math.random() * 3000; // Wait between 5 and 8 seconds
    console.log(`Waiting for ${Math.round(randomWait / 1000)} seconds...`);
    await sleep(randomWait);
    console.log('Wait finished.');
    // --- End Human-like Interaction ---


    console.log('Attempting to fetch data from API...');
    const apiResponse = await page.evaluate(async (url, query) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query }),
      });
      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    }, API_URL, GQL_QUERY);

    console.log('Successfully fetched data from the API.');

    // Process the data (this part is the same as before)
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

    // Create and save the historical entry (same as before)
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
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed.');
    }
  }
}

fetchAndSaveData();