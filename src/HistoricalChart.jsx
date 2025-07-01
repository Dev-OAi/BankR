// src/HistoricalChart.jsx

import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function HistoricalChart({ selectedProduct }) {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedProduct) return;

    setLoading(true);
    // Fetch and parse the CSV data
    Papa.parse('/BankR/rate-history.csv', {
      download: true,
      header: true,
      complete: (results) => {
        // Filter the data to find history for the selected product
        const filteredData = results.data.filter(
          (row) =>
            row.bank_name === selectedProduct.bank_name &&
            row.account_name === selectedProduct.account_name
        ).map(row => ({
            date: row.history_date,
            apy: parseFloat(row.history_apy)
        }));

        setChartData(filteredData);
        setLoading(false);
      },
      error: (err) => {
        console.error("Error parsing CSV:", err);
        setLoading(false);
      }
    });
  }, [selectedProduct]); // Rerun this effect when the selected product changes

  if (!selectedProduct) {
    return (
      <div className="mt-8 p-8 text-center bg-gray-800 rounded-lg">
        <p className="text-gray-400">Click on a row in the table above to view its historical APY trend.</p>
      </div>
    );
  }
  
  if (loading) return <p className="text-center mt-8">Loading chart data...</p>;
  
  if (chartData.length === 0) {
     return (
        <div className="mt-8 p-8 text-center bg-gray-800 rounded-lg">
            <h2 className="text-2xl font-bold text-cyan-400">{selectedProduct.account_name}</h2>
            <p className="text-gray-400 mt-2">No historical rate data available for this product.</p>
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

export default HistoricalChart;