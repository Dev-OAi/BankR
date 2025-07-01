// src/main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import App from './App.jsx'; // Our Master Layout
import BankrateRates from './BankrateRates.jsx'; // Your sophisticated Bankrate app
import HistoricalRates from './HistoricalRates.jsx'; // Our new dashboard
import './index.css';

// This nested structure is key
const router = createBrowserRouter(
  [
    {
      path: "/", // The base path of the app
      element: <App />, // ALWAYS render the App layout component
      children: [ // Render these components INSIDE the App's <Outlet />
        {
          index: true, // This makes BankrateRates the default for "/"
          element: <BankrateRates />,
        },
        {
          path: "history", // This path becomes "/history"
          element: <HistoricalRates />,
        },
      ],
    },
  ],
  {
    // Your basename for GitHub Pages deployment remains the same
    basename: "/BankR",
  }
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);