// Direct LLM Client Test
import 'dotenv/config';
import { createLLMClient } from './src/api/llmClient.js';

async function testGroqDirect() {
  console.log('🔧 Testing Groq API directly...');
  console.log('API Key:', process.env.GROQ_API_KEY ? `${process.env.GROQ_API_KEY.substring(0, 10)}...` : 'NOT SET');
  
  try {
    const client = createLLMClient({
      provider: 'groq',
      apiKey: process.env.GROQ_API_KEY,
      model: 'llama3-70b-8192',
      temperature: 0
    });
    
    console.log('✅ LLM Client created successfully');
    console.log('🔍 Client config:', {
      provider: client.cfg?.provider || 'undefined',
      hasApiKey: !!client.cfg?.apiKey,
      model: client.cfg?.model
    });
    
    const response = await client.freeformAnswer('Say hello in one sentence.');
    console.log('🚀 Groq Response:', response);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testGroqDirect().catch(console.error);
