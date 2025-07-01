import fetch from 'node-fetch';
import fs from 'fs';

// --- Configuration ---
const API_URL = 'https://www.lendingtree.com/quote-engine/graphql';
const HISTORY_FILE_PATH = './apy-history.json'; // We'll save the history here

// --- GraphQL Query ---
// This combines both queries into one API call for efficiency
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

// --- Main Function ---
async function fetchAndSaveData() {
  console.log('Starting data fetch...');

  try {
    // 1. Fetch data from the API
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json',  
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36', 
	'Referer': 'https://www.lendingtree.com/', 
	},
      body: JSON.stringify({ query: GQL_QUERY }),
    });

    if (!response.ok) {
      throw new Error(`API call failed with status: ${response.status}`);
    }

    const apiResponse = await response.json();
    const rates = apiResponse.data.CdRates.results;
    const reviews = apiResponse.data.BankReviews.results;

    // 2. Process and combine the data
    const bankReviewsMap = new Map(reviews.map(review => [review.bank_id, review]));

    const combinedData = rates.map(rate => {
      const review = bankReviewsMap.get(rate.bank_id);
      return {
        ...rate,
        bank_name: review ? review.bank_name : 'Unknown Bank',
        bank_logo: review ? review.bank_logo : null,
      };
    });

    console.log(`Successfully fetched and processed ${combinedData.length} rate entries.`);

    // 3. Create the new historical entry with a timestamp
    const newHistoryEntry = {
      date: new Date().toISOString(),
      data: combinedData,
    };

    // 4. Load existing history, or create a new array
    let history = [];
    if (fs.existsSync(HISTORY_FILE_PATH)) {
      const fileContent = fs.readFileSync(HISTORY_FILE_PATH);
      history = JSON.parse(fileContent);
    }

    // 5. Append the new data and save it back to the file
    history.push(newHistoryEntry);
    fs.writeFileSync(HISTORY_FILE_PATH, JSON.stringify(history, null, 2)); // `null, 2` formats the JSON nicely

    console.log(`Successfully saved data to ${HISTORY_FILE_PATH}. Total historical records: ${history.length}.`);

  } catch (error) {
    console.error('An error occurred during the fetch and save process:', error);
  }
}

// Run the function
fetchAndSaveData();