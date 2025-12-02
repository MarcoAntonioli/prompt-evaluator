import React, { useState, useEffect, useRef } from 'react';
import { submitPrompt, streamPrompt } from '../services/api';
import ModelResponse from './ModelResponse';
import Statistics from './Statistics';
import './PromptForm.css';

const MODEL_NAMES = ['cohere', 'gemini', 'grok', 'llama'];
const MODEL_DISPLAY_NAMES = {
  cohere: 'Cohere',
  gemini: 'Gemini',
  grok: 'Grok',
  llama: 'Llama',
};

function PromptForm() {
  const [promptText, setPromptText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promptId, setPromptId] = useState(null);
  const [modelStates, setModelStates] = useState({});
  const [allComplete, setAllComplete] = useState(false);
  const cleanupRef = useRef(null);

  const initializeModelStates = () => {
    const states = {};
    MODEL_NAMES.forEach(model => {
      states[model] = {
        response: '',
        timeToFirstToken: null,
        totalTime: null,
        isComplete: false,
        error: null,
      };
    });
    return states;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!promptText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setModelStates(initializeModelStates());
    setAllComplete(false);

    let cleanup = null;

    try {
      // Submit prompt and get prompt ID
      const result = await submitPrompt(promptText);
      setPromptId(result.id);

      // Start streaming
      cleanup = streamPrompt(result.id, (update) => {
        cleanupRef.current = cleanup;
        setModelStates((prev) => {
          const newState = { ...prev };
          const modelName = update.model_name;
          
          if (!newState[modelName]) {
            newState[modelName] = {
              response: '',
              timeToFirstToken: null,
              totalTime: null,
              isComplete: false,
              error: null,
            };
          }

          if (update.error) {
            newState[modelName].error = update.error;
            newState[modelName].isComplete = true;
          } else if (update.token) {
            newState[modelName].response += update.token;
            if (update.time_to_first_token !== null && newState[modelName].timeToFirstToken === null) {
              newState[modelName].timeToFirstToken = update.time_to_first_token;
            }
            if (update.total_time !== null) {
              newState[modelName].totalTime = update.total_time;
            }
          }

          if (update.is_complete) {
            newState[modelName].isComplete = true;
            newState[modelName].timeToFirstToken = update.time_to_first_token;
            newState[modelName].totalTime = update.total_time;
          }

          // Check if all models are complete
          const allDone = Object.values(newState).every(
            state => state.isComplete || state.error
          );
          if (allDone && cleanup) {
            setAllComplete(true);
            cleanup();
            setIsSubmitting(false);
          }

          return newState;
        });
      });
    } catch (error) {
      console.error('Error submitting prompt:', error);
      alert('Failed to submit prompt. Please try again.');
      setIsSubmitting(false);
      if (cleanup) {
        cleanup();
      }
    }
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  const handleNewPrompt = () => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    setPromptText('');
    setPromptId(null);
    setModelStates({});
    setIsSubmitting(false);
    setAllComplete(false);
  };

  return (
    <div className="prompt-form-container">
      <div className="prompt-form-card">
        <h1>Compare OCI LLM Models</h1>
        <p className="subtitle">Enter a prompt to compare responses from Cohere, Gemini, Grok, and Llama</p>
        
        <form onSubmit={handleSubmit} className="prompt-form">
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="Enter your prompt here..."
            className="prompt-input"
            rows={4}
            disabled={isSubmitting}
          />
          <div className="form-actions">
            <button
              type="submit"
              disabled={!promptText.trim() || isSubmitting}
              className="submit-button"
            >
              {isSubmitting ? 'Processing...' : 'Compare Models'}
            </button>
            {promptId && (
              <button
                type="button"
                onClick={handleNewPrompt}
                className="new-prompt-button"
              >
                New Prompt
              </button>
            )}
          </div>
        </form>
      </div>

      {promptId && (
        <>
          <div className="models-grid">
            {MODEL_NAMES.map((modelName) => (
              <ModelResponse
                key={modelName}
                modelName={MODEL_DISPLAY_NAMES[modelName]}
                modelKey={modelName}
                state={modelStates[modelName] || initializeModelStates()[modelName]}
              />
            ))}
          </div>

          {allComplete && (
            <Statistics modelStates={modelStates} />
          )}
        </>
      )}
    </div>
  );
}

export default PromptForm;

