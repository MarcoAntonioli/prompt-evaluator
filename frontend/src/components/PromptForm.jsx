import React, { useState, useEffect, useRef } from 'react';
import { submitPrompt, streamPrompt, getModelRegistry } from '../services/api';
import ModelResponse from './ModelResponse';
import Statistics from './Statistics';
import './PromptForm.css';

// Helper function to format model display names
const formatModelName = (modelKey) => {
  // Remove provider prefix and format nicely
  if (modelKey.startsWith('xai.')) {
    return modelKey.replace('xai.', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  } else if (modelKey.startsWith('meta.')) {
    return modelKey.replace('meta.', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  } else if (modelKey.startsWith('cohere.')) {
    return modelKey.replace('cohere.', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  } else if (modelKey.startsWith('google.')) {
    return modelKey.replace('google.', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  return modelKey;
};

function PromptForm() {
  const [promptText, setPromptText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promptId, setPromptId] = useState(null);
  const [modelStates, setModelStates] = useState({});
  const [allComplete, setAllComplete] = useState(false);
  const [modelRegistry, setModelRegistry] = useState(null);
  const [expandedProviders, setExpandedProviders] = useState({});
  const [selectedModels, setSelectedModels] = useState({});
  const cleanupRef = useRef(null);

  // Fetch model registry on mount
  useEffect(() => {
    const fetchRegistry = async () => {
      try {
        const registry = await getModelRegistry();
        setModelRegistry(registry);
        // Initialize expanded state - all collapsed by default
        const expanded = {};
        Object.keys(registry).forEach(provider => {
          expanded[provider] = false;
        });
        setExpandedProviders(expanded);
        // Initialize selected models - none selected by default
        const selected = {};
        Object.values(registry).flat().forEach(modelKey => {
          selected[modelKey] = false;
        });
        setSelectedModels(selected);
      } catch (error) {
        console.error('Error fetching model registry:', error);
        // Set a fallback registry so UI can still render
        const fallbackRegistry = {
        "xAI Grok": [
            "xai.grok-4",
            "xai.grok-4-fast-reasoning",
            "xai.grok-4-fast-non-reasoning",
            "xai.grok-3",
            "xai.grok-3-fast",
            "xai.grok-3-mini",
            "xai.grok-3-mini-fast"
        ],
          "Meta Llama": [
            "meta.llama-4-maverick-17b-128e-instruct-fp8",
            "meta.llama-4-scout-17b-16e-instruct",
            "meta.llama-3.3-70b-instruct",
            "meta.llama-3.2-90b-vision-instruct",
            "meta.llama-3.1-405b-instruct"
          ],
          "Cohere": [
            "cohere.command-latest",
            "cohere.command-a-03-2025",
            "cohere.command-plus-latest"
          ],
          "Google Gemini": [
            "google.gemini-2.5-pro",
            "google.gemini-2.5-flash",
            "google.gemini-2.5-flash-lite"
          ]
        };
        setModelRegistry(fallbackRegistry);
        const expanded = {};
        Object.keys(fallbackRegistry).forEach(provider => {
          expanded[provider] = false;
        });
        setExpandedProviders(expanded);
        const selected = {};
        Object.values(fallbackRegistry).flat().forEach(modelKey => {
          selected[modelKey] = false;
        });
        setSelectedModels(selected);
      }
    };
    fetchRegistry();
  }, []);

  const initializeModelStates = () => {
    const states = {};
    const modelsToInitialize = Object.keys(selectedModels).filter(model => selectedModels[model]);
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
    return Object.keys(selectedModels).filter(model => selectedModels[model]);
  };

  const handleModelToggle = (modelKey) => {
    setSelectedModels(prev => ({
      ...prev,
      [modelKey]: !prev[modelKey]
    }));
  };

  const handleProviderToggle = (provider) => {
    setExpandedProviders(prev => ({
      ...prev,
      [provider]: !prev[provider]
    }));
  };

  const handleSelectAll = () => {
    if (!modelRegistry) return;
    const allSelected = Object.keys(selectedModels).every(model => selectedModels[model]);
    const newSelection = {};
    Object.values(modelRegistry).flat().forEach(modelKey => {
      newSelection[modelKey] = !allSelected;
    });
    setSelectedModels(newSelection);
  };

  const handleSelectProvider = (provider) => {
    if (!modelRegistry || !modelRegistry[provider]) return;
    const providerModels = modelRegistry[provider];
    const allProviderSelected = providerModels.every(model => selectedModels[model]);
    
    setSelectedModels(prev => {
      const newSelection = { ...prev };
      providerModels.forEach(modelKey => {
        newSelection[modelKey] = !allProviderSelected;
      });
      return newSelection;
    });
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

          // Don't process updates if model is already complete (prevents duplicates)
          if (newState[modelName].isComplete && !update.is_complete) {
            return prev;
          }

          if (update.error) {
            newState[modelName].error = update.error;
            newState[modelName].isComplete = true;
          } else if (update.token && !update.is_complete && !newState[modelName].isComplete) {
            // Only process tokens if not complete (check both update flag and current state)
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
            if (update.time_to_first_token !== null) {
              newState[modelName].timeToFirstToken = update.time_to_first_token;
            }
            if (update.total_time !== null) {
              newState[modelName].totalTime = update.total_time;
            }
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

  if (!modelRegistry) {
    return (
      <div className="prompt-form-container">
        <div className="prompt-form-card">
          <p>Loading model registry...</p>
        </div>
      </div>
    );
  }

  const allModelsSelected = Object.keys(selectedModels).length > 0 && 
    Object.keys(selectedModels).every(model => selectedModels[model]);
  const someModelsSelected = Object.keys(selectedModels).some(model => selectedModels[model]);

  return (
    <div className="prompt-form-container">
      <div className="prompt-form-card">
        <h1>Compare OCI LLM Models</h1>
        <p className="subtitle">Enter a prompt to compare responses from multiple models</p>
        
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
            <div className="provider-groups">
              {Object.entries(modelRegistry).map(([provider, models]) => {
                const isExpanded = expandedProviders[provider];
                const providerSelectedCount = models.filter(m => selectedModels[m]).length;
                const allProviderSelected = models.length > 0 && providerSelectedCount === models.length;
                const someProviderSelected = providerSelectedCount > 0;

                return (
                  <div key={provider} className="provider-group">
                    <div 
                      className="provider-header"
                      onClick={() => handleProviderToggle(provider)}
                    >
                      <div className="provider-header-left">
                        <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▶</span>
                        <span className="provider-name">{provider}</span>
                        {someProviderSelected && (
                          <span className="provider-selection-count">
                            ({providerSelectedCount}/{models.length})
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="provider-select-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectProvider(provider);
                        }}
                        disabled={isSubmitting}
                      >
                        {allProviderSelected ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="provider-models">
                        {models.map((modelKey) => (
                          <label key={modelKey} className="model-checkbox-label">
                            <input
                              type="checkbox"
                              checked={selectedModels[modelKey] || false}
                              onChange={() => handleModelToggle(modelKey)}
                              disabled={isSubmitting}
                              className="model-checkbox"
                            />
                            <span>{formatModelName(modelKey)}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
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
            {getSelectedModelList().map((modelKey) => (
              <ModelResponse
                key={modelKey}
                modelName={formatModelName(modelKey)}
                modelKey={modelKey}
                state={modelStates[modelKey] || initializeModelStates()[modelKey]}
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
