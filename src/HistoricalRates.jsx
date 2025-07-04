import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const sanitizeBankName = (name) => {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '_');
};

// A dedicated component for the chart to keep our code clean
function HistoricalChart({ selectedProduct, theme }) {
    const [chartData, setChartData] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!selectedProduct) {
            setChartData([]);
            return;
        }

        const fetchChartData = async () => {
            setLoading(true);
            setError(null);
            try {
                const sanitizedName = sanitizeBankName(selectedProduct.bank_name);
                const response = await fetch(`/BankR/history/${sanitizedName}.json`);
                if (!response.ok) throw new Error(`Could not fetch history for ${selectedProduct.bank_name}.`);
                
                const history = await response.json();
                
                const dataForChart = history.map(historyEntry => {
                    const productData = historyEntry.data.find(p => p.accountId === selectedProduct.accountId);
                    return {
                        date: new Date(historyEntry.date).toLocaleDateString(),
                        apy: productData ? productData.apy : null,
                    };
                }).filter(p => p.apy !== null);

                if (dataForChart.length === 0) {
                    setError(`No historical data found for "${selectedProduct.account_name}".`);
                } else {
                    setChartData(dataForChart);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchChartData();
    }, [selectedProduct]);

    if (!selectedProduct) {
        return (
            <div className={`mt-8 p-8 text-center rounded-lg shadow-lg ${theme === 'light' ? 'bg-white' : 'bg-[#161B22]'}`}>
                <p className={`${theme === 'light' ? 'text-gray-600' : 'text-[#8B949E]'}`}>Click a row in the table below to view its historical APY trend.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className={`mt-8 p-8 text-center rounded-lg shadow-lg ${theme === 'light' ? 'bg-white' : 'bg-[#161B22]'}`}>
                <p className={`${theme === 'light' ? 'text-gray-600' : 'text-[#8B949E]'}`}>Loading chart data...</p>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className={`mt-8 p-8 text-center rounded-lg shadow-lg ${theme === 'light' ? 'bg-red-50' : 'bg-[#161B22]'}`}>
                <p className={`${theme === 'light' ? 'text-red-700' : 'text-red-400'}`}>{error}</p>
            </div>
        );
    }

    return (
        <div className={`mt-8 p-6 rounded-lg shadow-lg ${theme === 'light' ? 'bg-white' : 'bg-[#161B22]'}`}>
            <h2 className={`text-2xl font-bold text-center mb-6 ${theme === 'light' ? 'text-gray-700' : 'text-[#C9D1D9]'}`}>{`Historical APY for: ${selectedProduct.bank_name} - ${selectedProduct.account_name}`}</h2>
            <ResponsiveContainer width="100%" height={400}>
                <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'light' ? '#ccc' : '#30363D'} />
                    <XAxis dataKey="date" stroke={theme === 'light' ? '#666' : '#8B949E'} />
                    <YAxis 
                        stroke={theme === 'light' ? '#666' : '#8B949E'}
                        domain={['dataMin - 0.05', 'dataMax + 0.05']} 
                        tickFormatter={(value) => `${value.toFixed(2)}%`} 
                    />
                    <Tooltip 
                        contentStyle={theme === 'light' ? { backgroundColor: '#ffffff', border: '1px solid #ccc' } : { backgroundColor: '#0D1117', border: '1px solid #30363D' }}
                        labelStyle={theme === 'light' ? { color: '#333' } : { color: '#C9D1D9' }}
                        itemStyle={theme === 'light' ? { color: '#8884d8' } : { color: '#8884d8' }}
                    />
                    <Legend wrapperStyle={theme === 'dark' ? { color: '#C9D1D9' } : {}}/>
                    <Line type="monotone" dataKey="apy" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 8 }} name="APY (%)" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

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
                        {columnName === 'bank_name' && (
                            <>
                                <button onClick={() => handleSortOptionClick('asc')} className={`block w-full text-left px-2 py-1 text-sm rounded-md ${currentTheme === 'light' ? 'text-gray-700 hover:bg-gray-100' : 'text-[#C9D1D9] hover:bg-[#30363D]'}`}>A-Z</button>
                                <button onClick={() => handleSortOptionClick('desc')} className={`block w-full text-left px-2 py-1 text-sm rounded-md ${currentTheme === 'light' ? 'text-gray-700 hover:bg-gray-100' : 'text-[#C9D1D9] hover:bg-[#30363D]'}`}>Z-A</button>
                            </>
                        )}
                        {columnName === 'account_name' && (
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
                        {columnName === 'min_deposit' && (
                            <>
                                <button onClick={() => handleSortOptionClick('desc')} className={`block w-full text-left px-2 py-1 text-sm rounded-md ${currentTheme === 'light' ? 'text-gray-700 hover:bg-gray-100' : 'text-[#C9D1D9] hover:bg-[#30363D]'}`}>Highest</button>
                                <button onClick={() => handleSortOptionClick('asc')} className={`block w-full text-left px-2 py-1 text-sm rounded-md ${currentTheme === 'light' ? 'text-gray-700 hover:bg-gray-100' : 'text-[#C9D1D9] hover:bg-[#30363D]'}`}>Lowest</button>
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

function HistoricalRates() {
  const [latestRates, setLatestRates] = useState([]);
  const [filteredRates, setFilteredRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('apy');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [theme, setTheme] = useState('light'); // Add theme state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State for sidebar visibility

  // Filters
  const [bankNameFilter, setBankNameFilter] = useState('');
  const [accountNameFilter, setAccountNameFilter] = useState('');
  const [apyFilter, setApyFilter] = useState('');
  const [minDepositFilter, setMinDepositFilter] = useState('');

  // Unique options for filters
  const [uniqueBankNames, setUniqueBankNames] = useState([]);
  const [uniqueAccountNames, setUniqueAccountNames] = useState([]);

  // Add theme toggle function
  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const applyFiltersAndSort = useCallback(() => {
    let rates = [...latestRates];

    // Apply filters
    if (bankNameFilter) {
        rates = rates.filter(rate => rate.bank_name === bankNameFilter);
    }
    if (accountNameFilter) {
        rates = rates.filter(rate => rate.account_name === accountNameFilter);
    }
    if (apyFilter) {
        rates = rates.filter(rate => rate.apy >= parseFloat(apyFilter));
    }
    if (minDepositFilter) {
        rates = rates.filter(rate => parseFloat(rate.min_deposit.replace(/[^0-9.-]+/g,"")) <= parseFloat(minDepositFilter));
    }

    // Apply sorting
    rates.sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];

        if (sortBy === 'min_deposit') {
            valA = parseFloat(String(valA).replace(/[^0-9.-]+/g,""));
            valB = parseFloat(String(valB).replace(/[^0-9.-]+/g,""));
        } else if (sortBy === 'apy') {
            valA = a.apy;
            valB = b.apy;
        }


        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    setFilteredRates(rates);
  }, [latestRates, bankNameFilter, accountNameFilter, apyFilter, minDepositFilter, sortBy, sortOrder]);


  useEffect(() => {
    const fetchLatestRates = async () => {
      setLoading(true);
      try {
        const response = await fetch('/BankR/latest_rates.json');
        if (!response.ok) throw new Error(`Could not fetch latest rates. (Status: ${response.status})`);
        
        const data = await response.json();
        if (!data || data.length === 0) throw new Error("Latest rates file is empty.");
        
        const sortedData = data.sort((a, b) => b.apy - a.apy); // Sort by APY desc by default
        setLatestRates(sortedData);
        setUniqueBankNames([...new Set(sortedData.map(rate => rate.bank_name))].sort());
        setUniqueAccountNames([...new Set(sortedData.map(rate => rate.account_name))].sort());
        
        if (sortedData.length > 0) {
            setSelectedProduct(sortedData[0]);
        }
      } catch (err) {
        console.error("Fetch Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchLatestRates();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [applyFiltersAndSort]);

  return (
    <div className={`min-h-screen font-sans relative ${theme === 'light' ? 'bg-gray-100' : 'bg-[#0D1117]'}`}>
        <style>
            {`
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
              <Link
                  to="/"
                  onClick={() => setIsSidebarOpen(false)}
                  className={`py-2 px-4 rounded-md text-left font-semibold transition-colors duration-200 ${theme === 'light' ? 'hover:bg-gray-700' : 'hover:bg-[#30363D]'}`}
              >
                  Live Rates (Bankrate)
              </Link>
              <Link
                  to="/history"
                  onClick={() => setIsSidebarOpen(false)}
                  className={`py-2 px-4 rounded-md text-left font-semibold transition-colors duration-200 ${theme === 'light' ? 'hover:bg-gray-700' : 'hover:bg-[#30363D]'}`}
              >
                  Historical Dashboard
              </Link>
          </nav>
      </div>

      {/* Overlay for when sidebar is open */}
      {isSidebarOpen && (
          <div
              className={`fixed inset-0 bg-black opacity-50 z-30`}
              onClick={() => setIsSidebarOpen(false)}
          ></div>
      )}

      <div className={`flex flex-col items-center p-4 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'ml-0 md:ml-64' : 'ml-0'}`}>
        <header className="w-full max-w-4xl text-center my-8 pt-4 md:pt-0">
            <h1 className={`text-4xl font-bold mb-2 ${theme === 'light' ? 'text-gray-800' : 'text-[#C9D1D9]'}`}>Historical Rate Dashboard</h1>
            <p className={`text-lg ${theme === 'light' ? 'text-gray-600' : 'text-[#8B949E]'}`}>View APY trends for savings accounts and CDs</p>
        </header>
        
        {loading && <p className={`text-center text-xl ${theme === 'light' ? 'text-gray-700' : 'text-[#8B949E]'}`}>Loading historical data...</p>}
        {error && <p className={`text-center text-xl ${theme === 'light' ? 'text-red-600' : 'text-red-400'}`}>Error: {error}</p>}
        
        {!loading && !error && (
          <div className="w-full max-w-6xl">
            <HistoricalChart selectedProduct={selectedProduct} theme={theme} />
            
            <section className={`w-full p-6 mt-8 rounded-lg overflow-x-auto relative ${theme === 'light' ? 'bg-white shadow-md' : 'bg-[#161B22] shadow-lg shadow-gray-900'}`}>
                <h2 className={`text-2xl font-semibold mb-4 ${theme === 'light' ? 'text-gray-700' : 'text-[#C9D1D9]'}`}>Latest Rates</h2>
                <div className="min-w-full">
                    <table className={`min-w-full divide-y ${theme === 'light' ? 'divide-gray-200' : 'divide-[#30363D]'}`}>
                        <thead className={`${theme === 'light' ? 'bg-gray-50' : 'bg-[#0D1117]'}`}>
                        <tr>
                            <th scope="col" className="relative px-3 py-2 text-left text-xs font-medium uppercase tracking-wider rounded-tl-md">
                                <ColumnFilterSortPopover
                                    columnName="bank_name"
                                    filterValue={bankNameFilter}
                                    setFilterValue={setBankNameFilter}
                                    sortBy={sortBy}
                                    setSortBy={setSortBy}
                                    sortOrder={sortOrder}
                                    setSortOrder={setSortOrder}
                                    uniqueOptions={uniqueBankNames}
                                    inputType="select"
                                    placeholder="Bank Name"
                                    onApply={applyFiltersAndSort}
                                    currentTheme={theme}
                                >
                                    Bank
                                </ColumnFilterSortPopover>
                            </th>
                            <th scope="col" className="relative px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">
                                <ColumnFilterSortPopover
                                    columnName="account_name"
                                    filterValue={accountNameFilter}
                                    setFilterValue={setAccountNameFilter}
                                    sortBy={sortBy}
                                    setSortBy={setSortBy}
                                    sortOrder={sortOrder}
                                    setSortOrder={setSortOrder}
                                    uniqueOptions={uniqueAccountNames}
                                    inputType="select"
                                    placeholder="Account Name"
                                    onApply={applyFiltersAndSort}
                                    currentTheme={theme}
                                >
                                    Account Name
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
                                    onApply={applyFiltersAndSort}
                                    currentTheme={theme}
                                >
                                    APY
                                </ColumnFilterSortPopover>
                            </th>
                            <th scope="col" className="relative px-3 py-2 text-left text-xs font-medium uppercase tracking-wider rounded-tr-md">
                                <ColumnFilterSortPopover
                                    columnName="min_deposit"
                                    filterValue={minDepositFilter}
                                    setFilterValue={setMinDepositFilter}
                                    sortBy={sortBy}
                                    setSortBy={setSortBy}
                                    sortOrder={sortOrder}
                                    setSortOrder={setSortOrder}
                                    inputType="number"
                                    placeholder="Min. Deposit"
                                    onApply={applyFiltersAndSort}
                                    currentTheme={theme}
                                >
                                    Min. Deposit
                                </ColumnFilterSortPopover>
                            </th>
                        </tr>
                        </thead>
                        <tbody className={`divide-y ${theme === 'light' ? 'bg-white divide-gray-200' : 'bg-[#161B22] divide-[#30363D]'}`}>
                        {filteredRates.map((rate) => (
                            <tr 
                            key={rate.accountId} 
                            className={`transition-colors cursor-pointer 
                                ${theme === 'light' ? 'hover:bg-gray-100' : 'hover:bg-[#30363D]'}
                                ${selectedProduct?.accountId === rate.accountId ? (theme === 'light' ? 'bg-indigo-100 ring-2 ring-indigo-400' : 'bg-cyan-900/50 ring-2 ring-cyan-400') : ''}`}
                            onClick={() => setSelectedProduct(rate)}
                            >
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${theme === 'light' ? 'text-gray-900' : 'text-[#C9D1D9]'}`}>{rate.bank_name}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'light' ? 'text-gray-800' : 'text-[#8B949E]'}`}>{rate.account_name}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${theme === 'light' ? 'text-green-600' : 'text-green-400'}`}>{rate.apy.toFixed(2)}%</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'light' ? 'text-gray-800' : 'text-[#8B949E]'}`}>{rate.min_deposit}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

// The main page component
export default HistoricalRates;
