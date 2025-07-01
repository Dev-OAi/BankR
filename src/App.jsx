// src/App.jsx - This is the new Master Layout component

import React from 'react';
import { Link, Outlet } from 'react-router-dom';

function App() {
  // This component now only contains the shared layout
  return (
    <div className="min-h-screen font-sans">
      {/* The navigation bar lives here, and will be on every page */}
      <nav className="bg-gray-800 p-4 text-center sticky top-0 z-10">
        <Link to="/" className="text-xl font-bold text-cyan-400 mx-4 hover:text-white transition-colors">
          Live Rates (Bankrate)
        </Link>
        <Link to="/history" className="text-xl font-bold text-cyan-400 mx-4 hover:text-white transition-colors">
          Historical Dashboard (DepositAccounts)
        </Link>
      </nav>
      
      <main>
        {/* The active page component (BankrateRates or HistoricalRates) will be rendered here */}
        <Outlet />
      </main>
    </div>
  );
}

export default App;