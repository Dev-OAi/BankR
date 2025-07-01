// src/HistoricalRates.jsx


import HistoricalChart from './HistoricalChart'; // Import our new chart component

function HistoricalRates() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'apy', direction: 'desc' });
  const [selectedProduct, setSelectedProduct] = useState(null); // State for the selected row

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch('/BankR/bank-rates-history.json');
        if (!response.ok) throw new Error(`Could not fetch data. Status: ${response.status}`);
        
        const data = await response.json();
        if (!data || data.length === 0) throw new Error("No historical data found.");
        
        const latestEntry = data[data.length - 1].data;
        setHistory(latestEntry);
        // Set the first product as the default selected one
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
    if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
    if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
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
        
        {loading && <p className="text-center">Loading historical data...</p>}
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
                      onClick={() => setSelectedProduct(rate)} // CLICK HANDLER
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

            {/* Render the chart component, passing the selected product */}
            <HistoricalChart selectedProduct={selectedProduct} />
          </>
        )}
      </div>
    </div>
  );
}

export default HistoricalRates;