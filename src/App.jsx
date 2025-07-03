// src/App.jsx - The Master Layout component

import React from 'react';
import { Outlet } from 'react-router-dom';

function App() {
  return (
    // This top-level div can be used for global styles if needed
    <div className="font-sans">
      <main>
        {/* The active page component (BankrateRates or HistoricalRates) will be rendered here */}
        <Outlet />
      </main>
    </div>
  );
}

export default App;