import React from 'react';
import './ModelResponse.css';

function ModelResponse({ modelName, modelKey, state }) {
  const { response, timeToFirstToken, totalTime, isComplete, error } = state;

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return '-';
    return `${(seconds * 1000).toFixed(0)}ms`;
  };

  return (
    <div className={`model-response-card ${isComplete ? 'complete' : ''} ${error ? 'error' : ''}`}>
      <div className="model-header">
        <h3 className="model-name">{modelName}</h3>
        <div className="model-status">
          {error ? (
            <span className="status-error">Error</span>
          ) : isComplete ? (
            <span className="status-complete">Complete</span>
          ) : response ? (
            <span className="status-streaming">Streaming...</span>
          ) : (
            <span className="status-waiting">Waiting...</span>
          )}
        </div>
      </div>

      <div className="model-metrics">
        <div className="metric">
          <span className="metric-label">Time to First Token:</span>
          <span className="metric-value">{formatTime(timeToFirstToken)}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Total Time:</span>
          <span className="metric-value">{formatTime(totalTime)}</span>
        </div>
      </div>

      <div className="model-response-content">
        {error ? (
          <div className="error-message">{error}</div>
        ) : response ? (
          <div className="response-text">{response}</div>
        ) : (
          <div className="placeholder">Waiting for response...</div>
        )}
        {!isComplete && response && (
          <span className="cursor">|</span>
        )}
      </div>
    </div>
  );
}

export default ModelResponse;

