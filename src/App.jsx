// src/App.jsx - The Master Layout component

import React from 'react';
import { Link, Outlet } from 'react-router-dom';

function App() {
  return (
    // This top-level div can be used for global styles if needed
    <div className="font-sans">
      
      {/* --- THIS IS THE MISSING NAVIGATION BAR --- */}
      <nav className="bg-gray-800 p-4 text-center sticky top-0 z-10">
        <Link to="/" className="text-xl font-bold text-cyan-400 mx-4 hover:text-white transition-colors">
          Live Rates (Bankrate)
        </Link>
        <Link to="/history" className="text-xl font-bold text-cyan-400 mx-4 hover:text-white transition-colors">
          Historical Dashboard (DepositAccounts)
        </Link>
      </nav>
      {/* --- END NAVIGATION BAR --- */}
      
      <main>
        {/* The active page component (BankrateRates or HistoricalRates) will be rendered here */}
        <Outlet />
      </main>
    </div>
  );
}

export default App;