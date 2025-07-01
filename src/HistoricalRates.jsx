// src/HistoricalRates.jsx

import React, { useState, useEffect } from 'react'; // <-- The corrected import
import Papa from 'papaparse';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// This is a new, separate component for the chart
function HistoricalChart({ selectedProduct }) {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!selectedProduct) return;

    setLoading(true);
    setError(null);
    
    Papa.parse('/BankR/rate-history.csv', {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const filteredData = results.data
          .filter(
            (row) =>
              row.bank_name === selectedProduct.bank_name &&
              row.account_name === selectedProduct.account_name
          )
          .map(row => ({
            date: row.history_date,
            apy: parseFloat(row.history_apy)
          }));
        
        if (filteredData.length === 0) {
            setError('No historical data available for this specific product.');
        } else {
            setChartData(filteredData);
        }
        setLoading(false);
      },
      error: (err) => {
        console.error("Error parsing CSV:", err);
        setError('Could not load chart data.');
        setLoading(false);
      }
    });
  }, [selectedProduct]);

  if (!selectedProduct) {
    return (
      <div className="mt-8 p-8 text-center bg-gray-800 rounded-lg">
        <p className="text-gray-400">Click a row in the table above to view its historical APY trend.</p>
      </div>
    );
  }
  
  if (loading) return <p className="text-center mt-8">Loading chart data...</p>;
  
  if (error) return <p className="text-center mt-8 text-red-500">{error}</p>;

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
  const [history, setHistory] = useState([]);
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
        
        const latestEntry = data[data.length - 1].data;
        setHistory(latestEntry);
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

  const sortedHistory = [...history].sort((a, b) => {
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
    <div className="bg-gray-900 text-white">
      <div className="container mx-auto p-4">
        <header className="text-center my-8">
            <h1 className="text-4xl font-bold mb-2 text-cyan-400">Historical Rate Dashboard</h1>
            <p className="text-lg text-gray-400">Daily Scraped Data from DepositAccounts.com</p>
        </header>
        
        {loading && <p className="text-center">Loading data...</p>}
        {error && <p className="text-center text-red-500">Error: {error}</p>}
        
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
                  {sortedHistory.map((rate, index) => (
                    <tr 
                      key={`${rate.accountId || index}`} 
                      className={`border-t border-gray-700 hover:bg-gray-700/50 transition-colors cursor-pointer ${selectedProduct?.accountId === rate.accountId ? 'bg-cyan-900/50' : (index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-800/50')}`}
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
            
            <HistoricalChart selectedProduct={selectedProduct} />
          </>
        )}
      </div>
    </div>
  );
}

export default HistoricalRates;