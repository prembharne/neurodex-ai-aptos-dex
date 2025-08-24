import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import './App.css';
import TradingDashboard from './components/TradingDashboard';

function App() {
  return (
    <Router>
      <div className="App">
        <TradingDashboard />
      </div>
    </Router>
  );
}

export default App;
