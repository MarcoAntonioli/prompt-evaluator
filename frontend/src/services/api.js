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

export const streamPrompt = (promptId, onUpdate) => {
  const eventSource = new EventSource(`${API_BASE_URL}/prompts/${promptId}/stream`);
  
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

