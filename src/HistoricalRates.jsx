import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// A dedicated component for the chart to keep our code clean
function HistoricalChart({ fullHistory, selectedProduct }) {
    const [chartData, setChartData] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!selectedProduct || !fullHistory || fullHistory.length === 0) {
            setChartData([]);
            return;
        }
        
        setError(null);
        // This is the core logic: build the chart data from the history
        const dataForChart = fullHistory.map(historyEntry => {
            // Find the specific product in this day's snapshot
            const productData = historyEntry.data.find(
                p => p.accountId === selectedProduct.accountId
            );
            
            // Return an object with the date and the APY for that date
            return {
                date: new Date(historyEntry.date).toLocaleDateString(), // Format the date nicely
                apy: productData ? productData.apy : null, // Get the APY, or null if it wasn't found that day
            };
        }).filter(p => p.apy !== null); // Remove any days where this product wasn't listed

        if (dataForChart.length === 0) {
            setError(`No historical data found for "${selectedProduct.account_name}".`);
        } else {
            setChartData(dataForChart);
        }

    }, [selectedProduct, fullHistory]); // Re-run this logic whenever the selection or the main data changes

    // Initial state before a selection is made
    if (!selectedProduct) {
        return (
            <div className="mt-8 p-8 text-center bg-gray-800 rounded-lg shadow-lg">
                <p className="text-gray-400">Click a row in the table above to view its historical APY trend.</p>
            </div>
        );
    }
    
    // Display an error if no history was found for the selected product
    if (error) {
        return (
            <div className="mt-8 p-8 text-center bg-gray-800 rounded-lg shadow-lg">
                <p className="text-red-400">{error}</p>
            </div>
        );
    }

    return (
        <div className="mt-8 p-6 bg-gray-800 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold text-center mb-6 text-cyan-400">{`Historical APY for: ${selectedProduct.bank_name} - ${selectedProduct.account_name}`}</h2>
            <ResponsiveContainer width="100%" height={400}>
                <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                    <XAxis dataKey="date" stroke="#A0AEC0" />
                    <YAxis 
                        stroke="#A0AEC0" 
                        domain={['dataMin - 0.05', 'dataMax + 0.05']} 
                        tickFormatter={(value) => `${value.toFixed(2)}%`} 
                    />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#2D3748', border: '1px solid #4A5568' }}
                        labelStyle={{ color: '#E2E8F0' }}
                        itemStyle={{ color: '#68D391' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="apy" stroke="#68D391" strokeWidth={2} activeDot={{ r: 8 }} name="APY (%)" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

// The main page component
function HistoricalRates() {
  const [fullHistory, setFullHistory] = useState([]);
  const [latestRates, setLatestRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'apy', direction: 'desc' });
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch('/BankR/bank-rates-history.json');
        if (!response.ok) throw new Error(`Could not fetch data from server. (Status: ${response.status})`);
        
        const data = await response.json();
        if (!data || data.length === 0) throw new Error("History file is empty. The scraper may need to run first.");
        
        setFullHistory(data);
        const latestEntryData = data[data.length - 1].data;
        setLatestRates(latestEntryData);
        
        if (latestEntryData.length > 0) {
            // Set the first product in the latest list as the default selected one
            setSelectedProduct(latestEntryData[0]);
        }
      } catch (err) {
        console.error("Fetch Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const sortedRates = [...latestRates].sort((a, b) => {
    const valA = a[sortConfig.key];
    const valB = b[sortConfig.key];
    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const requestSort = (key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return '▼▲';
    return sortConfig.direction === 'desc' ? '▼' : '▲';
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      <div className="container mx-auto p-4">
        <header className="text-center my-8">
            <h1 className="text-4xl font-bold mb-2 text-cyan-400">Historical Rate Dashboard</h1>
            <p className="text-lg text-gray-400">Daily Scraped Data from DepositAccounts.com</p>
        </header>
        
        {loading && <p className="text-center text-xl">Loading historical data...</p>}
        {error && <p className="text-center text-xl text-red-500">Error: {error}</p>}
        
        {!loading && !error && (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-gray-800 rounded-lg shadow-lg">
                <thead>
                  <tr className="bg-gray-700">
                    <th className="p-4 text-left cursor-pointer" onClick={() => requestSort('bank_name')}>Bank {getSortIndicator('bank_name')}</th>
                    <th className="p-4 text-left">Account Name</th>
                    <th className="p-4 text-right cursor-pointer" onClick={() => requestSort('apy')}>APY {getSortIndicator('apy')}</th>
                    <th className="p-4 text-right">Min. Deposit</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRates.map((rate, index) => (
                    <tr 
                      key={rate.accountId} 
                      className={`border-t border-gray-700 hover:bg-gray-700/50 transition-colors cursor-pointer ${selectedProduct?.accountId === rate.accountId ? 'bg-cyan-900/50 ring-2 ring-cyan-400' : ''}`}
                      onClick={() => setSelectedProduct(rate)}
                    >
                      <td className="p-4">{rate.bank_name}</td>
                      <td className="p-4">{rate.account_name}</td>
                      <td className="p-4 text-right font-bold text-green-400">{rate.apy.toFixed(2)}%</td>
                      <td className="p-4 text-right">{rate.min_deposit}</td>
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