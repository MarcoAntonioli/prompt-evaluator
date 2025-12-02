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
  const [selectedModels, setSelectedModels] = useState(
    MODEL_NAMES.reduce((acc, model) => {
      acc[model] = true;
      return acc;
    }, {})
  );
  const cleanupRef = useRef(null);

  const initializeModelStates = () => {
    const states = {};
    const modelsToInitialize = MODEL_NAMES.filter(model => selectedModels[model]);
    modelsToInitialize.forEach(model => {
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

  const getSelectedModelList = () => {
    return MODEL_NAMES.filter(model => selectedModels[model]);
  };

  const handleModelToggle = (modelName) => {
    setSelectedModels(prev => ({
      ...prev,
      [modelName]: !prev[modelName]
    }));
  };

  const handleSelectAll = () => {
    const allSelected = MODEL_NAMES.every(model => selectedModels[model]);
    const newSelection = MODEL_NAMES.reduce((acc, model) => {
      acc[model] = !allSelected;
      return acc;
    }, {});
    setSelectedModels(newSelection);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!promptText.trim() || isSubmitting) return;
    
    const selectedModelList = getSelectedModelList();
    if (selectedModelList.length === 0) {
      alert('Please select at least one model to compare.');
      return;
    }

    setIsSubmitting(true);
    setModelStates(initializeModelStates());
    setAllComplete(false);

    let cleanup = null;

    try {
      // Submit prompt and get prompt ID
      const result = await submitPrompt(promptText);
      setPromptId(result.id);

      // Start streaming with selected models
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

          // Check if all selected models are complete
          const allDone = selectedModelList.every(
            modelName => newState[modelName] && (newState[modelName].isComplete || newState[modelName].error)
          );
          if (allDone && cleanup) {
            setAllComplete(true);
            cleanup();
            setIsSubmitting(false);
          }

          return newState;
        });
      }, selectedModelList);
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

  const allModelsSelected = MODEL_NAMES.every(model => selectedModels[model]);
  const someModelsSelected = MODEL_NAMES.some(model => selectedModels[model]);

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
          
          <div className="model-selection">
            <div className="model-selection-header">
              <label className="model-selection-label">Select Models to Compare:</label>
              <button
                type="button"
                onClick={handleSelectAll}
                className="select-all-button"
                disabled={isSubmitting}
              >
                {allModelsSelected ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="model-checkboxes">
              {MODEL_NAMES.map((modelName) => (
                <label key={modelName} className="model-checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedModels[modelName]}
                    onChange={() => handleModelToggle(modelName)}
                    disabled={isSubmitting}
                    className="model-checkbox"
                  />
                  <span>{MODEL_DISPLAY_NAMES[modelName]}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div className="form-actions">
            <button
              type="submit"
              disabled={!promptText.trim() || isSubmitting || !someModelsSelected}
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
            {getSelectedModelList().map((modelName) => (
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

