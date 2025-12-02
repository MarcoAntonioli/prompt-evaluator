import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import PromptForm from './components/PromptForm';
import PromptHistory from './components/PromptHistory';
import PromptDetail from './components/PromptDetail';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <div className="nav-container">
            <Link to="/" className="nav-logo">
              OCI LLM Comparison
            </Link>
            <div className="nav-links">
              <Link to="/" className="nav-link">Home</Link>
              <Link to="/history" className="nav-link">History</Link>
            </div>
          </div>
        </nav>
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<PromptForm />} />
            <Route path="/history" element={<PromptHistory />} />
            <Route path="/prompt/:id" element={<PromptDetail />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

