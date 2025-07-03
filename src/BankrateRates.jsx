import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom'; // <-- RE-ADDED: We need this for the new link

// Define the GraphQL API URL for CD Rates and Bank Reviews
const API_URL = 'https://wealth-banking-graphql.bankrate.com/graphql';
const ITEMS_PER_PAGE = 21; // Number of items to load at a time for card view pagination

// Column Filter/Sort Popover Component
function ColumnFilterSortPopover({
    columnName,
    filterValue,
    setFilterValue,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    uniqueOptions, // For select dropdowns (bankName, term)
    inputType, // 'text', 'number', 'select'
    placeholder,
    onApply, // Callback to trigger applyFilters in parent
    children, // For displaying the main column header content
    currentTheme // Pass theme to component for dynamic styling
}) {
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef(null);
    const buttonRef = useRef(null);

    const handleSortOptionClick = (order) => {
        setSortBy(columnName);
        setSortOrder(order);
        onApply(); // Apply filters immediately
        setIsOpen(false);
    };

    const handleClearFilter = () => {
        setFilterValue('');
        if (sortBy === columnName) {
            setSortBy('');
            setSortOrder('asc'); // Reset sort order
        }
        onApply(); // Apply filters immediately
        setIsOpen(false);
    };

    const handleFilterChange = (e) => {
        setFilterValue(e.target.value);
        // Apply filter immediately on change in the popover to give instant feedback
        onApply();
    };

    // Close popover when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (popoverRef.current && !popoverRef.current.contains(event.target) &&
                buttonRef.current && !buttonRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="relative inline-block text-left w-full h-full">
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-between w-full h-full px-3 py-2 text-left text-xs font-medium uppercase tracking-wider rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-150
                    ${currentTheme === 'light' ? 'text-gray-700 hover:bg-gray-100' : 'text-[#C9D1D9] hover:bg-[#30363D]'}`}
            >
                <span className="flex-grow">{children}</span>
                {sortBy === columnName && (
                    <span className={`sort-arrow ml-2 ${sortOrder === 'asc' ? 'asc' : 'desc'} ${currentTheme === 'light' ? 'text-indigo-600' : 'text-[#58A6FF]'}`}></span>
                )}
                {/* Dropdown indicator */}
                <svg className={`-mr-1 ml-1 h-5 w-5 ${currentTheme === 'light' ? 'text-gray-400' : 'text-[#8B949E]'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>

            {isOpen && (
                <div
                    ref={popoverRef}
                    className={`origin-top-right absolute left-0 mt-2 w-48 rounded-md shadow-lg ring-1 ring-opacity-5 divide-y divide-gray-100 focus:outline-none z-10 ${currentTheme === 'light' ? 'bg-white ring-black' : 'bg-[#161B22] ring-gray-700'}`}
                    style={{ minWidth: '160px' }} // Adjust width as needed
                >
                    <div className="py-1 p-2">
                        {inputType === 'select' ? (
                            <select
                                className={`block w-full rounded-md shadow-sm focus:border-[#58A6FF] focus:ring focus:ring-[#58A6FF] focus:ring-opacity-50 p-1 text-sm mb-2 ${currentTheme === 'light' ? 'border-gray-300 bg-white text-gray-900' : 'border-[#30363D] bg-[#0D1117] text-[#C9D1D9]'}`}
                                value={filterValue}
                                onChange={handleFilterChange}
                            >
                                <option value="">All {children}</option>
                                {uniqueOptions.map(option => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type={inputType}
                                className={`block w-full rounded-md shadow-sm focus:border-[#58A6FF] focus:ring focus:ring-[#58A6FF] focus:ring-opacity-50 p-1 text-sm mb-2 ${currentTheme === 'light' ? 'border-gray-300 bg-white text-gray-900' : 'border-[#30363D] bg-[#0D1117] text-[#C9D1D9]'}`}
                                placeholder={`Filter ${placeholder}`}
                                value={filterValue}
                                onChange={handleFilterChange}
                            />
                        )}
                        <hr className={`my-2 ${currentTheme === 'light' ? 'border-gray-200' : 'border-[#30363D]'}`} /> {/* Darker divider */}
                        <span className={`block px-2 py-1 text-xs font-semibold uppercase ${currentTheme === 'light' ? 'text-gray-500' : 'text-[#8B949E]'}`}>Sort</span>
                        {/* Sort options specific to column */}
                        {columnName === 'bankName' && (
                            <>
                                <button onClick={() => handleSortOptionClick('asc')} className={`block w-full text-left px-2 py-1 text-sm rounded-md ${currentTheme === 'light' ? 'text-gray-700 hover:bg-gray-100' : 'text-[#C9D1D9] hover:bg-[#30363D]'}`}>A-Z</button>
                                <button onClick={() => handleSortOptionClick('desc')} className={`block w-full text-left px-2 py-1 text-sm rounded-md ${currentTheme === 'light' ? 'text-gray-700 hover:bg-gray-100' : 'text-[#C9D1D9] hover:bg-[#30363D]'}`}>Z-A</button>
                            </>
                        )}
                        {columnName === 'apy' && (
                            <>
                                <button onClick={() => handleSortOptionClick('desc')} className={`block w-full text-left px-2 py-1 text-sm rounded-md ${currentTheme === 'light' ? 'text-gray-700 hover:bg-gray-100' : 'text-[#C9D1D9] hover:bg-[#30363D]'}`}>Highest</button>
                                <button onClick={() => handleSortOptionClick('asc')} className={`block w-full text-left px-2 py-1 text-sm rounded-md ${currentTheme === 'light' ? 'text-gray-700 hover:bg-gray-100' : 'text-[#C9D1D9] hover:bg-[#30363D]'}`}>Lowest</button>
                            </>
                        )}
                        {columnName === 'term' && (
                            <>
                                <button onClick={() => handleSortOptionClick('asc')} className={`block w-full text-left px-2 py-1 text-sm rounded-md ${currentTheme === 'light' ? 'text-gray-700 hover:bg-gray-100' : 'text-[#C9D1D9] hover:bg-[#30363D]'}`}>Shortest</button>
                                <button onClick={() => handleSortOptionClick('desc')} className={`block w-full text-left px-2 py-1 text-sm rounded-md ${currentTheme === 'light' ? 'text-gray-700 hover:bg-gray-100' : 'text-[#C9D1D9] hover:bg-[#30363D]'}`}>Longest</button>
                            </>
                        )}
                        {columnName === 'minDeposit' && (
                            <>
                                <button onClick={() => handleSortOptionClick('desc')} className={`block w-full text-left px-2 py-1 text-sm rounded-md ${currentTheme === 'light' ? 'text-gray-700 hover:bg-gray-100' : 'text-[#C9D1D9] hover:bg-[#30363D]'}`}>Highest</button>
                                <button onClick={() => handleSortOptionClick('asc')} className={`block w-full text-left px-2 py-1 text-sm rounded-md ${currentTheme === 'light' ? 'text-gray-700 hover:bg-gray-100' : 'text-[#C9D1D9] hover:bg-[#30363D]'}`}>Lowest</button>
                            </>
                        )}
                        {columnName === 'validAsOf' && (
                            <>
                                <button onClick={() => handleSortOptionClick('desc')} className={`block w-full text-left px-2 py-1 text-sm rounded-md ${currentTheme === 'light' ? 'text-gray-700 hover:bg-gray-100' : 'text-[#C9D1D9] hover:bg-[#30363D]'}`}>Newest</button>
                                <button onClick={() => handleSortOptionClick('asc')} className={`block w-full text-left px-2 py-1 text-sm rounded-md ${currentTheme === 'light' ? 'text-gray-700 hover:bg-gray-100' : 'text-[#C9D1D9] hover:bg-[#30363D]'}`}>Oldest</button>
                            </>
                        )}
                        <hr className={`my-2 ${currentTheme === 'light' ? 'border-gray-200' : 'border-[#30363D]'}`} /> {/* Darker divider */}
                        <button onClick={handleClearFilter} className={`block w-full text-left px-2 py-1 text-sm rounded-md ${currentTheme === 'light' ? 'text-red-600 hover:bg-red-50' : 'text-red-400 hover:bg-red-800'}`}>Clear</button>
                    </div>
                </div>
            )}
        </div>
    );
}


export default function BankrateRates() { // <-- RENAMED from App to BankrateRates
    const [fullCdOffers, setFullCdOffers] = useState([]); // All fetched and processed offers
    const [filteredCdOffers, setFilteredCdOffers] = useState([]); // Offers after applying filters and sorting
    const [visibleOffers, setVisibleOffers] = useState([]); // Offers currently visible in the UI for card view
    const [startIndex, setStartIndex] = useState(0); // Index for pagination
    const [loading, setLoading] = useState(true); // Initial loading state
    const [hasMore, setHasMore] = useState(true); // Whether more items can be loaded for card view
    const [error, setError] = useState(null);

    // User input for filter criteria
    const [depositAmountFilter, setDepositAmountFilter] = useState(''); // Max Deposit Amount
    const [bankNameFilter, setBankNameFilter] = useState(''); // Bank Name filter (now for dropdown selection)
    const [apyFilter, setApyFilter] = useState(''); // Minimum APY filter
    const [termFilter, setTermFilter] = useState(''); // Term filter (now for dropdown selection)
    const [validAsOfFilter, setValidAsOfFilter] = useState(''); // Valid as Of date filter
    const [lastUpdatedDate, setLastUpdatedDate] = useState('June 29, 2025'); // State for updated date from Bankrate

    // State for sorting (for both views, applied through applyFilters)
    const [sortBy, setSortBy] = useState(''); // e.g., 'bankName', 'apy', 'minDeposit', 'validAsOf'
    const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'

    // State to manage the current view: 'card' or 'table'
    const [currentView, setCurrentView] = useState('card'); // Reverted to default 'card'
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State for sidebar visibility
    const [theme, setTheme] = useState('light'); // Start in light mode as requested
    const [isViewOptionsOpen, setIsViewOptionsOpen] = useState(false); // State for view options popover


    // New states for unique dropdown options
    const [uniqueBankNames, setUniqueBankNames] = useState([]);
    const [uniqueTerms, setUniqueTerms] = useState([]);


    // GraphQL query for CD Rates (from DataCDRates.txt structure)
    const CD_RATES_QUERY = `
        query CdRates {
            cd_rates {
                apy
                effective_at
                ep_url
                institution {
                    advertiser_id
                    name
                }
                product {
                    name
                    term
                }
                min_to_open
            }
        }
    `;

    // GraphQL query for Bank Reviews (from BankReviews.txt structure)
    const BANK_REVIEWS_QUERY = `
        query BankReviews {
            bank_reviews {
                advertiser_id
                name
                cd_summary
                scorecard {
                    cd_min_deposit
                    cd_apy_term
                    cd_term_min
                    cd_term_max
                }
            }
        }
    `;

    // Helper function to parse date strings (e.g., "6/29/2025") into Date objects
    const parseDateString = (dateString) => {
        if (!dateString || dateString === 'N/A') return null;
        const [month, day, year] = dateString.split('/').map(Number);
        // Month is 0-indexed in JavaScript Date object
        return new Date(year, month - 1, day);
    };

    // Function to fetch both datasets and process them
    const fetchAndProcessData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch CD Rates
            const cdRatesResponse = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: CD_RATES_QUERY }),
            });
            const cdRatesResult = await cdRatesResponse.json();

            if (cdRatesResult.errors) {
                throw new Error(`CD Rates API Error: ${cdRatesResult.errors[0]?.message || 'Unknown error'}`);
            }

            const rawCdRates = cdRatesResult.data?.cd_rates || [];

            // Fetch Bank Reviews
            const bankReviewsResponse = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: BANK_REVIEWS_QUERY }),
            });
            const bankReviewsResult = await bankReviewsResponse.json();

            if (bankReviewsResult.errors) {
                throw new Error(`Bank Reviews API Error: ${bankReviewsResult.errors[0]?.message || 'Unknown error'}`);
            }

            const bankReviews = bankReviewsResult.data?.bank_reviews || [];
            const bankReviewsMap = new Map();
            bankReviews.forEach(review => {
                bankReviewsMap.set(String(review.advertiser_id), review);
            });

            // Process and enrich CD offers
            const processedOffers = rawCdRates.map(offer => {
                const institutionName = offer.institution?.name || 'N/A';
                const advertiserId = offer.institution?.advertiser_id;
                const bankReview = advertiserId ? bankReviewsMap.get(String(advertiserId)) : null;

                let minDeposit = offer.min_to_open ? `$${offer.min_to_open.toLocaleString()}` : 'N/A';
                let term = offer.product?.name;
                let cdSummary = 'No specific CD review available.';

                // Enrich from bank reviews if available
                if (bankReview) {
                    if (bankReview.scorecard) {
                        if (bankReview.scorecard.cd_min_deposit !== null) {
                            minDeposit = `$${bankReview.scorecard.cd_min_deposit.toLocaleString()}`;
                        }
                        // Attempt to derive term from scorecard or summary
                        if (bankReview.scorecard.cd_apy_term) {
                            term = `${bankReview.scorecard.cd_apy_term} months`;
                        } else if (bankReview.scorecard.cd_term_min !== null && bankReview.scorecard.cd_term_max !== null) {
                            if (bankReview.scorecard.cd_term_min === bankReview.scorecard.cd_term_max) {
                                term = `${bankReview.scorecard.cd_term_min} months`;
                            } else {
                                const minVal = bankReview.scorecard.cd_term_min;
                                const maxVal = bankReview.scorecard.cd_term_max;
                                if (minVal < 12 && maxVal >= 12 && maxVal % 12 === 0) {
                                    term = `${minVal} months - ${maxVal / 12} years`;
                                } else if (minVal >= 12 && minVal % 12 === 0 && maxVal % 12 === 0) {
                                     term = `${minVal / 12}-${maxVal / 12} years`;
                                } else if (minVal === 0 && maxVal > 0) {
                                     term = `up to ${maxVal} months`;
                                }
                                else {
                                    term = `${minVal}-${maxVal} months`;
                                }
                            }
                        }
                    }
                    cdSummary = bankReview.cd_summary || cdSummary;
                }

                return {
                    bankName: institutionName,
                    apy: offer.apy ? parseFloat(offer.apy) : null, // Store APY as number for comparison
                    apyDisplay: offer.apy ? `${offer.apy}%` : 'N/A', // For display
                    term: term,
                    minDeposit: parseFloat(String(minDeposit).replace(/[^0-9.-]+/g,"")) || null, // Store as number for comparison
                    minDepositDisplay: minDeposit, // For display
                    validAsOf: offer.effective_at || 'N/A',
                    validAsOfDate: parseDateString(offer.effective_at), // Parse date for sorting
                    cdSummary: cdSummary,
                    advertiserId: advertiserId // Keep advertiserId for potential future use
                };
            });

            // Extract unique bank names and terms for dropdowns
            const collectedBankNames = new Set();
            const collectedTerms = new Set();
            processedOffers.forEach(offer => {
                if (offer.bankName && offer.bankName !== 'N/A') {
                    collectedBankNames.add(offer.bankName);
                }
                if (offer.term && offer.term !== 'N/A') {
                    collectedTerms.add(offer.term);
                }
            });

            setUniqueBankNames(Array.from(collectedBankNames).sort());
            setUniqueTerms(Array.from(collectedTerms).sort((a, b) => {
                // Basic numeric sort for terms if they are numbers (e.g., "12 months" vs "6 months")
                const numA = parseInt(String(a.term));
                const numB = parseInt(String(b.term));
                if (!isNaN(numA) && !isNaN(numB)) {
                    return numA - numB;
                }
                // Fallback to alphabetical sort
                return a.localeCompare(b);
            }));

            setFullCdOffers(processedOffers);
            setLoading(false);

        } catch (err) {
            console.error("Error fetching or processing data:", err);
            setError(`Failed to load data: ${err.message}. Please try again.`);
            setLoading(false);
            setFullCdOffers([]);
            setVisibleOffers([]);
            setHasMore(false);
        }
    }, []);

    // Function to apply filters AND sorting to fullCdOffers
    const applyFilters = useCallback(() => {
        let currentFilteredOffers = [...fullCdOffers];

        // 1. Apply Filters
        // Filter by Max Deposit Amount
        if (depositAmountFilter) {
            const maxDepositValue = parseFloat(depositAmountFilter);
            if (!isNaN(maxDepositValue)) {
                currentFilteredOffers = currentFilteredOffers.filter(
                    offer => offer.minDeposit !== null && offer.minDeposit <= maxDepositValue
                );
            }
        }

        // Filter by Bank Name (exact match from dropdown)
        if (bankNameFilter && bankNameFilter !== 'All') {
            currentFilteredOffers = currentFilteredOffers.filter(offer =>
                offer.bankName === bankNameFilter
            );
        }

        // Filter by Minimum APY
        if (apyFilter) {
            const minApyValue = parseFloat(apyFilter);
            if (!isNaN(minApyValue)) {
                currentFilteredOffers = currentFilteredOffers.filter(
                    offer => offer.apy !== null && offer.apy >= minApyValue
                );
            }
        }

        // Filter by Term (exact match from dropdown)
        if (termFilter && termFilter !== 'All') {
            currentFilteredOffers = currentFilteredOffers.filter(offer => {
                return offer.term === termFilter;
            });
        }

        // Filter by Valid As Of Date (simple string includes for now)
        if (validAsOfFilter) {
            currentFilteredOffers = currentFilteredOffers.filter(offer =>
                String(offer.validAsOf).toLowerCase().includes(validAsOfFilter.toLowerCase())
            );
        }

        // 2. Apply Sorting
        if (sortBy) {
            currentFilteredOffers.sort((a, b) => {
                let valA, valB;

                switch (sortBy) {
                    case 'bankName':
                        valA = String(a.bankName).toLowerCase();
                        valB = String(b.bankName).toLowerCase();
                        break;
                    case 'apy':
                        valA = a.apy !== null ? a.apy : (sortOrder === 'asc' ? Infinity : -Infinity);
                        valB = b.apy !== null ? b.apy : (sortOrder === 'asc' ? Infinity : -Infinity);
                        break;
                    case 'minDeposit':
                        valA = a.minDeposit !== null ? a.minDeposit : (sortOrder === 'asc' ? Infinity : -Infinity);
                        valB = b.minDeposit !== null ? b.minDeposit : (sortOrder === 'asc' ? Infinity : -Infinity);
                        break;
                    case 'term':
                        // Attempt to sort terms numerically if possible (e.g., "6 months" < "12 months")
                        const numA = parseInt(String(a.term));
                        const numB = parseInt(String(b.term));
                        if (!isNaN(numA) && !isNaN(numB)) {
                            return sortOrder === 'asc' ? numA - numB : numB - numA;
                        }
                        // Fallback to alphabetical for mixed or non-numeric terms
                        valA = String(a.term).toLowerCase();
                        valB = String(b.term).toLowerCase();
                        break;
                    case 'validAsOf':
                        valA = a.validAsOfDate || (sortOrder === 'asc' ? new Date(0) : new Date()); // Treat null dates for sorting
                        valB = b.validAsOfDate || (sortOrder === 'asc' ? new Date(0) : new Date());
                        break;
                    default:
                        return 0; // No sorting
                }

                if (valA < valB) {
                    return sortOrder === 'asc' ? -1 : 1;
                }
                if (valA > valB) {
                    return sortOrder === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }


        setFilteredCdOffers(currentFilteredOffers);
        // Reset pagination for card view when filters are applied
        setVisibleOffers(currentFilteredOffers.slice(0, ITEMS_PER_PAGE));
        setStartIndex(ITEMS_PER_PAGE);
        setHasMore(currentFilteredOffers.length > ITEMS_PER_PAGE);
    }, [fullCdOffers, depositAmountFilter, bankNameFilter, apyFilter, termFilter, validAsOfFilter, sortBy, sortOrder]);


    // Load more offers for pagination (only for card view)
    const loadMoreOffers = useCallback(() => {
        setLoading(true);
        setTimeout(() => {
            const nextBatch = filteredCdOffers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
            setVisibleOffers(prev => [...prev, ...nextBatch]);
            setStartIndex(prev => prev + ITEMS_PER_PAGE);
            setHasMore(startIndex + ITEMS_PER_PAGE < filteredCdOffers.length);
            setLoading(false);
        }, 300);
    }, [filteredCdOffers, startIndex]);


    useEffect(() => {
        fetchAndProcessData(); // Initial data load on component mount
    }, [fetchAndProcessData]);

    // Apply filters whenever full data or filter criteria change
    useEffect(() => {
        if (fullCdOffers.length > 0 || !loading) {
            applyFilters();
        }
    }, [fullCdOffers, depositAmountFilter, bankNameFilter, apyFilter, termFilter, validAsOfFilter, sortBy, sortOrder, applyFilters, loading]);


    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    const handleViewChange = (view) => {
        setCurrentView(view);
        setIsViewOptionsOpen(false); // Close popover after selection
    };

    const viewOptionsRef = useRef(null);
    const viewButtonRef = useRef(null);

    // Close view options popover when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (viewOptionsRef.current && !viewOptionsRef.current.contains(event.target) &&
                viewButtonRef.current && !viewButtonRef.current.contains(event.target)) {
                setIsViewOptionsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Function to export filtered data to CSV
    const exportTableToCsv = useCallback(() => {
        if (filteredCdOffers.length === 0) {
            // Using a simple alert, in a real app this would be a custom modal
            alert("No data to export. Please ensure there are offers matching your filters.");
            return;
        }

        const headers = ['Bank Name', 'APY', 'Term', 'Minimum Deposit', 'Valid As Of', 'Summary'];
        // Ensure values are properly escaped for CSV, handling commas and quotes
        const escapeCsv = (value) => {
            if (value === null || value === undefined) return '';
            let stringValue = String(value);
            // If the string contains a comma, double quotes, or newline, enclose in double quotes
            // and escape existing double quotes by doubling them
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        };

        const rows = filteredCdOffers.map(offer => [
            escapeCsv(offer.bankName),
            escapeCsv(offer.apyDisplay),
            escapeCsv(offer.term),
            escapeCsv(offer.minDepositDisplay),
            escapeCsv(offer.validAsOf),
            escapeCsv(offer.cdSummary)
        ].join(','));

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'cd_offers.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [filteredCdOffers]);


    return (
        <div className={`min-h-screen font-sans relative ${theme === 'light' ? 'bg-gray-100' : 'bg-[#0D1117]'}`}>
            <style>
                {`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                body {
                    font-family: 'Inter', sans-serif;
                }
                .loader {
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #3498db; /* Default loader color */
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    animation: spin 2s linear infinite;
                }
                .loader.dark {
                    border-top: 4px solid #58A6FF; /* GitHub blue for dark theme */
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .sort-arrow {
                    margin-left: 5px;
                    display: inline-block;
                    width: 0;
                    height: 0;
                    border-left: 4px solid transparent;
                    border-right: 4px solid transparent;
                }
                .sort-arrow.asc {
                    border-bottom: 4px solid currentColor;
                }
                .sort-arrow.desc {
                    border-top: 4px solid currentColor;
                }
                `}
            </style>

            {/* Hamburger Icon */}
            <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="fixed top-4 left-4 z-50 p-2 bg-[#21262D] text-[#C9D1D9] rounded-md shadow-lg hover:bg-[#30363D] focus:outline-none focus:ring-2 focus:ring-[#58A6FF] focus:ring-offset-2 transition-all duration-300"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
            </button>

            {/* Theme Toggle Button */}
            <button
                onClick={toggleTheme}
                className={`fixed top-4 right-4 z-50 p-2 rounded-md shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-300
                    ${theme === 'light' ? 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-300' : 'bg-[#21262D] text-[#C9D1D9] hover:bg-[#30363D] focus:ring-[#58A6FF]'}`}
            >
                {theme === 'light' ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.325 3.325l-.707.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
                    </svg>
                ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9 9 0 008.354-5.646z"></path>
                    </svg>
                )}
            </button>


            {/* Sidebar Menu */}
            <div
                className={`fixed top-0 left-0 h-full w-64 transform transition-transform duration-300 ease-in-out z-40 p-4 flex flex-col ${
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                } ${theme === 'light' ? 'bg-gray-800 text-white' : 'bg-[#0D1117] text-[#C9D1D9]'}`}
            >
                <button
                    onClick={() => setIsSidebarOpen(false)}
                    className={`self-end p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${theme === 'light' ? 'text-white hover:text-gray-300 focus:ring-gray-600' : 'text-[#C9D1D9] hover:text-[#8B949E] focus:ring-[#58A6FF]'}`}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
                <nav className="mt-8 flex flex-col space-y-4">
                    {/* --- ADDED: The new link to the Live Rates page --- */}
                    <Link
                        to="/"
                        onClick={() => setIsSidebarOpen(false)}
                        className={`py-2 px-4 rounded-md text-left font-semibold transition-colors duration-200 ${theme === 'light' ? 'hover:bg-gray-700' : 'hover:bg-[#30363D]'}`}
                    >
                        Live Rates
                    </Link>
                    {/* --- ADDED: The new link to the Historical Dashboard --- */}
                    <Link
                        to="/history"
                        onClick={() => setIsSidebarOpen(false)}
                        className={`py-2 px-4 rounded-md text-left font-semibold transition-colors duration-200 ${theme === 'light' ? 'hover:bg-gray-700' : 'hover:bg-[#30363D]'}`}
                    >
                        Historical Dashboard
                    </Link>
                    <hr className={`my-2 ${theme === 'light' ? 'border-gray-600' : 'border-[#30363D]'}`} />
                    <button
                        onClick={() => { setCurrentView('card'); setIsSidebarOpen(false); }}
                        className={`py-2 px-4 rounded-md text-left font-semibold transition-colors duration-200 ${
                            currentView === 'card' ? (theme === 'light' ? 'bg-indigo-700' : 'bg-[#21262D]') : (theme === 'light' ? 'hover:bg-gray-700' : 'hover:bg-[#30363D]')
                        }`}
                    >
                        Card View
                    </button>
                    <button
                        onClick={() => { setCurrentView('table'); setIsSidebarOpen(false); }}
                        className={`py-2 px-4 rounded-md text-left font-semibold transition-colors duration-200 ${
                            currentView === 'table' ? (theme === 'light' ? 'bg-indigo-700' : 'bg-[#21262D]') : (theme === 'light' ? 'hover:bg-gray-700' : 'hover:bg-[#30363D]')
                        }`}
                    >
                        Table View
                    </button>
                    <button
                        onClick={() => { exportTableToCsv(); setIsSidebarOpen(false); }}
                        className={`py-2 px-4 rounded-md text-left font-semibold transition-colors duration-200 ${theme === 'light' ? 'hover:bg-gray-700' : 'hover:bg-[#30363D]'}`}
                    >
                        Export Table to CSV
                    </button>
                </nav>
            </div>

            {/* Overlay for when sidebar is open */}
            {isSidebarOpen && (
                <div
                    className={`fixed inset-0 bg-black opacity-50 z-30`}
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            {/* Main Content Area */}
            <div
                className={`flex flex-col items-center p-4 transition-all duration-300 ease-in-out ${
                    isSidebarOpen ? 'ml-0 md:ml-64' : 'ml-0'
                }`}
            >
                <header className="w-full max-w-4xl text-center mb-8 pt-4 md:pt-0">
                    <h1 className={`text-4xl font-bold mb-2 ${theme === 'light' ? 'text-gray-800' : 'text-[#C9D1D9]'}`}>CD Rate Finder</h1>
                    <p className={`text-lg ${theme === 'light' ? 'text-gray-600' : 'text-[#8B949E]'}`}>Find the best Certificate of Deposit rates</p>
                </header>

                {currentView === 'card' && (
                    <section className={`w-full max-w-4xl p-6 rounded-lg relative ${theme === 'light' ? 'bg-white shadow-md' : 'bg-[#161B22] shadow-lg shadow-gray-900'}`}>
                        <h2 className={`text-2xl font-semibold mb-4 ${theme === 'light' ? 'text-gray-700' : 'text-[#C9D1D9]'}`}>Available CD Offers (Card View)</h2>
                        
                        <div className="absolute top-4 right-4 z-10 flex items-center space-x-2">
                            <p className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-[#8B949E]'} mr-2`}>Updated: {lastUpdatedDate}</p>
                            <button
                                ref={viewButtonRef}
                                onClick={() => setIsViewOptionsOpen(!isViewOptionsOpen)}
                                className={`p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-300
                                    ${theme === 'light' ? 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-300' : 'bg-transparent text-[#C9D1D9] hover:bg-[#30363D] focus:ring-[#58A6FF]'}`}
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                </svg>
                            </button>
                            {isViewOptionsOpen && (
                                <div
                                    ref={viewOptionsRef}
                                    className={`absolute right-0 mt-2 w-40 rounded-md shadow-lg ring-1 ring-opacity-5 focus:outline-none z-10 ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#161B22] border-[#30363D]'}`}
                                >
                                    <div className="py-1">
                                        <button
                                            onClick={() => handleViewChange('card')}
                                            className={`block w-full text-left px-4 py-2 text-sm ${theme === 'light' ? 'text-gray-800 hover:bg-gray-100' : 'text-[#C9D1D9] hover:bg-[#30363D]'} ${currentView === 'card' ? 'font-bold' : ''}`}
                                        >
                                            Card View
                                        </button>
                                        <button
                                            onClick={() => handleViewChange('table')}
                                            className={`block w-full text-left px-4 py-2 text-sm ${theme === 'light' ? 'text-gray-800 hover:bg-gray-100' : 'text-[#C9D1D9] hover:bg-[#30363D]'} ${currentView === 'table' ? 'font-bold' : ''}`}
                                        >
                                            Table View
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                            <div>
                                <label htmlFor="bankNameFilterCard" className={`block text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-[#8B949E]'}`}>Bank Name</label>
                                <select
                                    id="bankNameFilterCard"
                                    className={`mt-1 block w-full rounded-md shadow-sm focus:border-[#58A6FF] focus:ring focus:ring-[#58A6FF] focus:ring-opacity50 p-2 text-sm ${theme === 'light' ? 'border-gray-300 bg-white text-gray-900' : 'border-[#30363D] bg-[#0D1117] text-[#C9D1D9]'}`}
                                    value={bankNameFilter}
                                    onChange={(e) => setBankNameFilter(e.target.value)}
                                >
                                    <option value="">All Banks</option>
                                    {uniqueBankNames.map(name => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="apyFilterCard" className={`block text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-[#8B949E]'}`}>Min. APY (%)</label>
                                <input
                                    type="number"
                                    id="apyFilterCard"
                                    className={`mt-1 block w-full rounded-md shadow-sm focus:border-[#58A6FF] focus:ring focus:ring-[#58A6FF] focus:ring-opacity-50 p-2 text-sm ${theme === 'light' ? 'border-gray-300 bg-white text-gray-900 placeholder-gray-400' : 'border-[#30363D] bg-[#0D1117] text-[#C9D1D9] placeholder-[#8B949E]'}`}
                                    placeholder="e.g., 4.0"
                                    value={apyFilter}
                                    onChange={(e) => setApyFilter(e.target.value)}
                                />
                            </div>
                            <div>
                                <label htmlFor="termFilterCard" className={`block text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-[#8B949E]'}`}>Term</label>
                                <select
                                    id="termFilterCard"
                                    className={`mt-1 block w-full rounded-md shadow-sm focus:border-[#58A6FF] focus:ring focus:ring-[#58A6FF] focus:ring-opacity-50 p-2 text-sm ${theme === 'light' ? 'border-gray-300 bg-white text-gray-900' : 'border-[#30363D] bg-[#0D1117] text-[#C9D1D9]'}`}
                                    value={termFilter}
                                    onChange={(e) => setTermFilter(e.target.value)}
                                >
                                    <option value="">All Terms</option>
                                    {uniqueTerms.map(term => (
                                        <option key={term} value={term}>{term}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="depositAmountFilterCard" className={`block text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-[#8B949E]'}`}>Max Deposit Amount</label>
                                <input
                                    type="number"
                                    id="depositAmountFilterCard"
                                    className={`mt-1 block w-full rounded-md shadow-sm focus:border-[#58A6FF] focus:ring focus:ring-[#58A6FF] focus:ring-opacity-50 p-2 text-sm ${theme === 'light' ? 'border-gray-300 bg-white text-gray-900 placeholder-gray-400' : 'border-[#30363D] bg-[#0D1117] text-[#C9D1D9] placeholder-[#8B949E]'}`}
                                    placeholder="e.g., 10000"
                                    value={depositAmountFilter}
                                    onChange={(e) => setDepositAmountFilter(e.target.value)}
                                />
                            </div>
                            <div>
                                <label htmlFor="validAsOfFilterCard" className={`block text-sm font-medium ${theme === 'light' ? 'text-gray-700' : 'text-[#8B949E]'}`}>Valid As Of (date contains)</label>
                                <input
                                    type="text"
                                    id="validAsOfFilterCard"
                                    className={`mt-1 block w-full rounded-md shadow-sm focus:border-[#58A6FF] focus:ring focus:ring-[#58A6FF] focus:ring-opacity-50 p-2 text-sm ${theme === 'light' ? 'border-gray-300 bg-white text-gray-900 placeholder-gray-400' : 'border-[#30363D] bg-[#0D1117] text-[#C9D1D9] placeholder-[#8B949E]'}`}
                                    placeholder="e.g., 6/29/2025"
                                    value={validAsOfFilter}
                                    onChange={(e) => setValidAsOfFilter(e.target.value)}
                                />
                            </div>
                        </div>
                        <p className={`text-sm mt-4 text-center ${theme === 'light' ? 'text-gray-600' : 'text-[#8B949E]'}`}>
                            Filters are applied locally after initial data load.
                        </p>
                        {loading && visibleOffers.length === 0 && (
                            <div className="flex justify-center items-center mt-6">
                                <div className={`loader ${theme === 'dark' ? 'dark' : ''}`}></div>
                                <p className={`ml-2 ${theme === 'light' ? 'text-gray-600' : 'text-[#8B949E]'}`}>Loading initial offers...</p>
                            </div>
                        )}
                        {error && (
                            <p className={`${theme === 'light' ? 'text-red-500' : 'text-red-400'} text-center mt-4`}>Error: {error}</p>
                        )}
                        {!loading && !error && visibleOffers.length === 0 && filteredCdOffers.length === 0 && (
                            <p className={`${theme === 'light' ? 'text-gray-600' : 'text-[#8B949E]'} text-center`}>No CD offers found matching your criteria. Try adjusting filters.</p>
                        )}
                        <div className="space-y-4">
                            {visibleOffers.map((offer, index) => (
                                <div key={index} className={`border p-4 rounded-md transition-colors duration-200 ${theme === 'light' ? 'border-gray-200 bg-white hover:bg-gray-100' : 'border-[#30363D] bg-[#161B22] hover:bg-[#30363D]'}`}>
                                    <h3 className={`text-xl font-semibold ${theme === 'light' ? 'text-indigo-700' : 'text-[#58A6FF]'}`}>{offer.bankName}</h3>
                                    <p className={`${theme === 'light' ? 'text-gray-800' : 'text-[#C9D1D9]'}`}>
                                        <span className="font-medium">APY:</span> {offer.apyDisplay}
                                    </p>
                                    <p className={`${theme === 'light' ? 'text-gray-800' : 'text-[#C9D1D9]'}`}>
                                        <span className="font-medium">Term:</span> {offer.term}
                                    </p>
                                    <p className={`${theme === 'light' ? 'text-gray-800' : 'text-[#C9D1D9]'}`}>
                                        <span className="font-medium">Minimum Deposit:</span> {offer.minDepositDisplay}
                                    </p>
                                    <p className={`${theme === 'light' ? 'text-gray-800' : 'text-[#C9D1D9]'}`}>
                                        <span className="font-medium">Valid As Of:</span> {offer.validAsOf}
                                    </p>
                                    {offer.cdSummary && (
                                        <p className={`text-sm mt-2 italic ${theme === 'light' ? 'text-gray-500' : 'text-[#8B949E]'}`}>
                                            Summary: {offer.cdSummary}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>

                        {loading && visibleOffers.length > 0 && (
                            <div className="flex justify-center items-center mt-6">
                                <div className={`loader ${theme === 'dark' ? 'dark' : ''}`}></div>
                                <p className={`ml-2 ${theme === 'light' ? 'text-gray-600' : 'text-[#8B949E]'}`}>Loading more offers...</p>
                            </div>
                        )}

                        {!hasMore && visibleOffers.length > 0 && (
                            <p className={`${theme === 'light' ? 'text-gray-600' : 'text-[#8B949E]'} text-center mt-6`}>All available offers loaded!</p>
                        )}
                        {hasMore && (
                            <div className="flex justify-center mt-6">
                                <button
                                    onClick={loadMoreOffers}
                                    className={`px-6 py-3 rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 ${theme === 'light' ? 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500' : 'bg-[#21262D] hover:bg-[#30363D] text-white focus:ring-[#58A6FF]'}`}
                                >
                                    Load More
                                </button>
                            </div>
                        )}
                    </section>
                )}

                {currentView === 'table' && (
                    <section className={`w-full max-w-4xl p-6 rounded-lg overflow-x-auto relative ${theme === 'light' ? 'bg-white shadow-md' : 'bg-[#161B22] shadow-lg shadow-gray-900'}`}>
                        <h2 className={`text-2xl font-semibold mb-4 ${theme === 'light' ? 'text-gray-700' : 'text-[#C9D1D9]'}`}>Available CD Offers (Table View)</h2>

                        <div className="absolute top-4 right-4 z-10 flex items-center space-x-2">
                            <p className={`text-xs ${theme === 'light' ? 'text-gray-600' : 'text-[#8B949E]'} mr-2`}>Updated: {lastUpdatedDate}</p>
                            <button
                                ref={viewButtonRef}
                                onClick={() => setIsViewOptionsOpen(!isViewOptionsOpen)}
                                className={`p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-300
                                    ${theme === 'light' ? 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-300' : 'bg-transparent text-[#C9D1D9] hover:bg-[#30363D] focus:ring-[#58A6FF]'}`}
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                </svg>
                            </button>
                            {isViewOptionsOpen && (
                                <div
                                    ref={viewOptionsRef}
                                    className={`absolute right-0 mt-2 w-40 rounded-md shadow-lg ring-1 ring-opacity-5 focus:outline-none z-10 ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-[#161B22] border-[#30363D]'}`}
                                >
                                    <div className="py-1">
                                        <button
                                            onClick={() => handleViewChange('card')}
                                            className={`block w-full text-left px-4 py-2 text-sm ${theme === 'light' ? 'text-gray-800 hover:bg-gray-100' : 'text-[#C9D1D9] hover:bg-[#30363D]'} ${currentView === 'card' ? 'font-bold' : ''}`}
                                        >
                                            Card View
                                        </button>
                                        <button
                                            onClick={() => handleViewChange('table')}
                                            className={`block w-full text-left px-4 py-2 text-sm ${theme === 'light' ? 'text-gray-800 hover:bg-gray-100' : 'text-[#C9D1D9] hover:bg-[#30363D]'} ${currentView === 'table' ? 'font-bold' : ''}`}
                                        >
                                            Table View
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {loading && (
                            <div className="flex justify-center items-center mt-6">
                                <div className={`loader ${theme === 'dark' ? 'dark' : ''}`}></div>
                                <p className={`ml-2 ${theme === 'light' ? 'text-gray-600' : 'text-[#8B949E]'}`}>Loading offers for table...</p>
                            </div>
                        )}
                        {error && (
                            <p className={`${theme === 'light' ? 'text-red-500' : 'text-red-400'} text-center mt-4`}>Error: {error}</p>
                        )}
                        {!loading && !error && filteredCdOffers.length === 0 && (
                            <p className={`${theme === 'light' ? 'text-gray-600' : 'text-[#8B949E]'} text-center`}>No CD offers found matching your criteria. Try adjusting filters.</p>
                        )}
                        {!loading && !error && filteredCdOffers.length > 0 && (
                            <div className="min-w-full">
                                <table className={`min-w-full divide-y ${theme === 'light' ? 'divide-gray-200' : 'divide-[#30363D]'}`}>
                                    <thead className={`${theme === 'light' ? 'bg-gray-50' : 'bg-[#0D1117]'}`}>
                                        <tr>
                                            <th scope="col" className="relative px-3 py-2 text-left text-xs font-medium uppercase tracking-wider rounded-tl-md">
                                                <ColumnFilterSortPopover
                                                    columnName="bankName"
                                                    filterValue={bankNameFilter}
                                                    setFilterValue={setBankNameFilter}
                                                    sortBy={sortBy}
                                                    setSortBy={setSortBy}
                                                    sortOrder={sortOrder}
                                                    setSortOrder={setSortOrder}
                                                    uniqueOptions={uniqueBankNames}
                                                    inputType="select"
                                                    placeholder="Bank Name"
                                                    onApply={applyFilters}
                                                    currentTheme={theme}
                                                >
                                                    Bank Name
                                                </ColumnFilterSortPopover>
                                            </th>
                                            <th scope="col" className="relative px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">
                                                <ColumnFilterSortPopover
                                                    columnName="apy"
                                                    filterValue={apyFilter}
                                                    setFilterValue={setApyFilter}
                                                    sortBy={sortBy}
                                                    setSortBy={setSortBy}
                                                    sortOrder={sortOrder}
                                                    setSortOrder={setSortOrder}
                                                    inputType="number"
                                                    placeholder="Min. APY"
                                                    onApply={applyFilters}
                                                    currentTheme={theme}
                                                >
                                                    APY
                                                </ColumnFilterSortPopover>
                                            </th>
                                            <th scope="col" className="relative px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">
                                                <ColumnFilterSortPopover
                                                    columnName="term"
                                                    filterValue={termFilter}
                                                    setFilterValue={setTermFilter}
                                                    sortBy={sortBy}
                                                    setSortBy={setSortBy}
                                                    sortOrder={sortOrder}
                                                    setSortOrder={setSortOrder}
                                                    uniqueOptions={uniqueTerms}
                                                    inputType="select"
                                                    placeholder="Term"
                                                    onApply={applyFilters}
                                                    currentTheme={theme}
                                                >
                                                    Term
                                                </ColumnFilterSortPopover>
                                            </th>
                                            <th scope="col" className="relative px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">
                                                <ColumnFilterSortPopover
                                                    columnName="minDeposit"
                                                    filterValue={depositAmountFilter}
                                                    setFilterValue={setDepositAmountFilter}
                                                    sortBy={sortBy}
                                                    setSortBy={setSortBy}
                                                    sortOrder={sortOrder}
                                                    setSortOrder={setSortOrder}
                                                    inputType="number"
                                                    placeholder="Max Deposit"
                                                    onApply={applyFilters}
                                                    currentTheme={theme}
                                                >
                                                    Min. Deposit
                                                </ColumnFilterSortPopover>
                                            </th>
                                            <th scope="col" className="relative px-3 py-2 text-left text-xs font-medium uppercase tracking-wider rounded-tr-md">
                                                <ColumnFilterSortPopover
                                                    columnName="validAsOf"
                                                    filterValue={validAsOfFilter}
                                                    setFilterValue={setValidAsOfFilter}
                                                    sortBy={sortBy}
                                                    setSortBy={setSortBy}
                                                    sortOrder={sortOrder}
                                                    setSortOrder={setSortOrder}
                                                    inputType="text"
                                                    placeholder="Valid As Of"
                                                    onApply={applyFilters}
                                                    currentTheme={theme}
                                                >
                                                    Valid As Of
                                                </ColumnFilterSortPopover>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${theme === 'light' ? 'bg-white divide-gray-200' : 'bg-[#161B22] divide-[#30363D]'}`}>
                                        {filteredCdOffers.map((offer, offerIndex) => (
                                            <tr key={offerIndex} className={`${theme === 'light' ? 'hover:bg-gray-50' : 'hover:bg-[#30363D]'}`}>
                                                <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${theme === 'light' ? 'text-gray-900' : 'text-[#C9D1D9]'}`}>{offer.bankName}</td>
                                                <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'light' ? 'text-gray-800' : 'text-[#8B949E]'}`}>{offer.apyDisplay}</td>
                                                <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'light' ? 'text-gray-800' : 'text-[#8B949E]'}`}>{offer.term}</td>
                                                <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'light' ? 'text-gray-800' : 'text-[#8B949E]'}`}>{offer.minDepositDisplay}</td>
                                                <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'light' ? 'text-gray-800' : 'text-[#8B949E]'}`}>{offer.validAsOf}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                )}
            </div>
        </div>
    );
}