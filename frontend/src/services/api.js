const API_BASE_URL = '/api';

export const submitPrompt = async (promptText) => {
  const response = await fetch(`${API_BASE_URL}/prompts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: promptText }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to submit prompt');
  }
  
  return response.json();
};

export const getPrompts = async () => {
  const response = await fetch(`${API_BASE_URL}/prompts`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch prompts');
  }
  
  return response.json();
};

export const getPromptDetail = async (promptId) => {
  const response = await fetch(`${API_BASE_URL}/prompts/${promptId}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch prompt details');
  }
  
  return response.json();
};

export const streamPrompt = (promptId, onUpdate, selectedModels = null) => {
  // Build URL with model query parameters if models are selected
  let url = `${API_BASE_URL}/prompts/${promptId}/stream`;
  if (selectedModels && selectedModels.length > 0) {
    const params = selectedModels.map(model => `models=${encodeURIComponent(model)}`).join('&');
    url += `?${params}`;
  }
  
  const eventSource = new EventSource(url);
  
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onUpdate(data);
    } catch (error) {
      console.error('Error parsing SSE data:', error);
    }
  };
  
  eventSource.onerror = (error) => {
    console.error('SSE error:', error);
    eventSource.close();
  };
  
  return () => {
    eventSource.close();
  };
};

