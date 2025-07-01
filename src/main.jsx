// src/main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import App from './App.jsx'; // The new Master Layout
import BankrateRates from './BankrateRates.jsx'; // Your renamed original app
import HistoricalRates from './HistoricalRates.jsx'; // The new dashboard page
import './index.css';

// Define the routes for our application using a nested structure
const router = createBrowserRouter(
  [
    {
      path: "/", // This path is now relative to the basename
      element: <App />, // The App component provides the shared layout (nav bar)
      children: [
        {
          index: true, // This makes BankrateRates the default page for "/"
          element: <BankrateRates />,
        },
        {
          path: "history", // The path is relative, resulting in "/BankR/history"
          element: <HistoricalRates />,
        },
      ],
    },
  ],
  {
    // We keep your correct basename setting here
    basename: "/BankR",
  }
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);