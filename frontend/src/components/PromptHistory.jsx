import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPrompts } from '../services/api';
import './PromptHistory.css';

function PromptHistory() {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      setLoading(true);
      const data = await getPrompts();
      setPrompts(data);
      setError(null);
    } catch (err) {
      setError('Failed to load prompts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const truncateText = (text, maxLength = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="history-container">
        <div className="loading">Loading prompts...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="history-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="history-container">
      <div className="history-header">
        <h1>Prompt History</h1>
        <button onClick={loadPrompts} className="refresh-button">
          Refresh
        </button>
      </div>

      {prompts.length === 0 ? (
        <div className="empty-state">
          <p>No prompts yet. Go to the home page to create your first comparison!</p>
        </div>
      ) : (
        <div className="prompts-table-container">
          <table className="prompts-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Prompt</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {prompts.map((prompt) => (
                <tr key={prompt.id}>
                  <td>{prompt.id}</td>
                  <td className="prompt-text">{truncateText(prompt.text)}</td>
                  <td>{formatDate(prompt.created_at)}</td>
                  <td>
                    <button
                      onClick={() => navigate(`/prompt/${prompt.id}`)}
                      className="view-button"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default PromptHistory;

