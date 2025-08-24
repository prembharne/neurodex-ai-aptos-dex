// Simple AI Agent service for direct API calls
import aiBridge from './aiBridge.js';

// Export getChatResponse function
export async function getChatResponse(messages, signal) {
  try {
    const lastMessage = messages[messages.length - 1];
    const prompt = lastMessage?.content || 'Hello';
    
    const response = await aiBridge.chat(prompt);
    return response.response || 'No response';
  } catch (error) {
    console.error('AI chat failed:', error);
    throw new Error(`AI service unavailable: ${error.message}`);
  }
}

// Export other required functions as simple stubs for now
export async function getAgentStreamer(messages, signal, mode = 'plan') {
  try {
    const lastMessage = messages[messages.length - 1];
    const prompt = lastMessage?.content || 'Hello';
    
    const response = await aiBridge.chat(prompt);
    const fullResponse = response.response || 'No response';
    
    return {
      mode: 'simple',
      async *[Symbol.asyncIterator]() {
        yield fullResponse;
      },
    };
  } catch (error) {
    return {
      mode: 'simple',
      async *[Symbol.asyncIterator]() {
        yield 'AI service temporarily unavailable. Please try again.';
      },
    };
  }
}
