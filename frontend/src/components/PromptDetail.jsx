import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getPromptDetail } from '../services/api';
import ModelResponse from './ModelResponse';
import Statistics from './Statistics';
import './PromptDetail.css';

const MODEL_DISPLAY_NAMES = {
  cohere: 'Cohere',
  gemini: 'Gemini',
  grok: 'Grok',
  llama: 'Llama',
};

function PromptDetail() {
  const { id } = useParams();
  const [prompt, setPrompt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modelStates, setModelStates] = useState({});

  useEffect(() => {
    loadPromptDetail();
  }, [id]);

  const loadPromptDetail = async () => {
    try {
      setLoading(true);
      const data = await getPromptDetail(id);
      setPrompt(data);
      
      // Convert model responses to state format
      const states = {};
      data.model_responses.forEach((response) => {
        states[response.model_name] = {
          response: response.response_text,
          timeToFirstToken: response.time_to_first_token,
          totalTime: response.total_time,
          isComplete: true,
          error: null,
        };
      });
      setModelStates(states);
      
      setError(null);
    } catch (err) {
      setError('Failed to load prompt details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="detail-container">
        <div className="loading">Loading prompt details...</div>
      </div>
    );
  }

  if (error || !prompt) {
    return (
      <div className="detail-container">
        <div className="error-message">{error || 'Prompt not found'}</div>
      </div>
    );
  }

  return (
    <div className="detail-container">
      <div className="detail-header">
        <h1>Prompt Details</h1>
        <button onClick={() => window.history.back()} className="back-button">
          ← Back
        </button>
      </div>

      <div className="prompt-display-card">
        <h2>Original Prompt</h2>
        <p className="prompt-text">{prompt.text}</p>
        <p className="prompt-meta">
          Created: {new Date(prompt.created_at).toLocaleString()}
        </p>
      </div>

      {Object.keys(modelStates).length > 0 ? (
        <>
          <div className="models-grid">
            {Object.entries(modelStates).map(([modelKey, state]) => (
              <ModelResponse
                key={modelKey}
                modelName={MODEL_DISPLAY_NAMES[modelKey] || modelKey}
                modelKey={modelKey}
                state={state}
              />
            ))}
          </div>

          <Statistics modelStates={modelStates} />
        </>
      ) : (
        <div className="empty-state">
          <p>No model responses available for this prompt.</p>
        </div>
      )}
    </div>
  );
}

export default PromptDetail;

