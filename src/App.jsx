// src/App.jsx - The Master Layout

import React from 'react';
import { Link, Outlet } from 'react-router-dom';

function App() {
  return (
    <div className="bg-gray-900 text-white min-h-screen">
      {/* This navigation bar will appear on EVERY page */}
      <nav className="bg-gray-800 p-4 text-center sticky top-0 z-10">
        <Link to="/" className="text-xl font-bold text-cyan-400 mx-4 hover:text-white transition-colors">
          Live Rates (Bankrate)
        </Link>
        <Link to="/history" className="text-xl font-bold text-cyan-400 mx-4 hover:text-white transition-colors">
          Historical Dashboard (DepositAccounts)
        </Link>
      </nav>
      
      <main>
        {/* The active page component will be rendered here */}
        <Outlet />
      </main>
    </div>
  );
}

export default App;