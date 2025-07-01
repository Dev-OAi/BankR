import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// This is a new, separate component for the chart
function HistoricalChart({ fullHistory, selectedProduct }) {
    const [chartData, setChartData] = useState([]);

    useEffect(() => {
        if (!selectedProduct || !fullHistory || fullHistory.length === 0) {
            return;
        }

        // This is the core logic: build the chart data from the history
        const dataForChart = fullHistory.map(historyEntry => {
            const productData = historyEntry.data.find(
                p => p.accountId === selectedProduct.accountId
            );
            return {
                date: new Date(historyEntry.date).toLocaleDateString(), // Format the date nicely
                apy: productData ? productData.apy : null, // Get the APY for that day
            };
        }).filter(p => p.apy !== null); // Remove days where this product wasn't found

        setChartData(dataForChart);

    }, [selectedProduct, fullHistory]); // Re-run when the selection or data changes


    if (!selectedProduct) {
        return (
            <div className="mt-8 p-8 text-center bg-gray-800 rounded-lg">
                <p className="text-gray-400">Click a row in the table to view its historical APY trend.</p>
            </div>
        );
    }

    return (
        <div className="mt-8 p-4 bg-gray-800 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold text-center mb-4 text-cyan-400">{`Historical APY for: ${selectedProduct.bank_name} - ${selectedProduct.account_name}`}</h2>
            <ResponsiveContainer width="100%" height={400}>
                <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                    <XAxis dataKey="date" stroke="#A0AEC0" />
                    <YAxis stroke="#A0AEC0" domain={['dataMin - 0.1', 'dataMax + 0.1']} tickFormatter={(value) => `${value.toFixed(2)}%`} />
                    <Tooltip contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568' }} />
                    <Legend />
                    <Line type="monotone" dataKey="apy" stroke="#38B2AC" strokeWidth={2} activeDot={{ r: 8 }} name="APY" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}


// This is the main page component
function HistoricalRates() {
  const [fullHistory, setFullHistory] = useState([]); // Store the entire history
  const [latestRates, setLatestRates] = useState([]); // Just for the table
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'apy', direction: 'desc' });
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch('/BankR/bank-rates-history.json');
        if (!response.ok) throw new Error(`Could not fetch data. Status: ${response.status}`);
        
        const data = await response.json();
        if (!data || data.length === 0) throw new Error("No data found.");
        
        setFullHistory(data); // Save the entire history for the chart
        const latestEntry = data[data.length - 1].data;
        setLatestRates(latestEntry);
        
        if (latestEntry.length > 0) {
            setSelectedProduct(latestEntry[0]);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const sortedHistory = [...latestRates].sort((a, b) => {
    // Sorting logic remains the same...
    const valA = a[sortConfig.key];
    const valB = b[sortConfig.key];
    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const requestSort = (key) => { /* ... same as before ... */ };
  const getSortIndicator = (key) => { /* ... same as before ... */ };

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <div className="container mx-auto p-4">
        {/* ... Header remains the same ... */}
        <header className="text-center my-8">
            <h1 className="text-4xl font-bold mb-2 text-cyan-400">Historical Rate Dashboard</h1>
            <p className="text-lg text-gray-400">Daily Scraped Data from DepositAccounts.com</p>
        </header>

        {loading && <p className="text-center">Loading data...</p>}
        {error && <p className="text-center text-red-500">Error: {error}</p>}
        
        {!loading && !error && (
          <>
            <div className="overflow-x-auto">
              {/* Table logic is the same, but uses 'latestRates' */}
              <table className="min-w-full bg-gray-800 rounded-lg shadow-lg">
                <thead>
                  {/* ... Table headers ... */}
                </thead>
                <tbody>
                  {sortedHistory.map((rate, index) => (
                    <tr 
                      key={`${rate.accountId || index}`} 
                      className={`border-t border-gray-700 hover:bg-gray-700/50 transition-colors cursor-pointer ${selectedProduct?.accountId === rate.accountId ? 'bg-cyan-900/50' : (index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-800/50')}`}
                      onClick={() => setSelectedProduct(rate)}
                    >
                      {/* ... Table cells ... */}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <HistoricalChart fullHistory={fullHistory} selectedProduct={selectedProduct} />
          </>
        )}
      </div>
    </div>
  );
}

export default HistoricalRates;