// AI Server that works around networking issues
import 'dotenv/config';
import { writeFileSync, readFileSync } from 'fs';

console.log('🚀 File-based AI Server starting...');

// Simple AI response function using Groq
async function callGroq(message) {
  const body = {
    model: 'llama3-70b-8192',
    messages: [
      { role: 'system', content: 'You are NeuroDex AI, a helpful blockchain and trading assistant.' },
      { role: 'user', content: message }
    ],
    temperature: 0,
    max_tokens: 1000,
  };

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(`Groq API error: ${JSON.stringify(json)}`);
  }
  
  return json?.choices?.[0]?.message?.content || 'No response from AI';
}

// File-based request handling
async function processRequests() {
  const requestFile = './ai_request.json';
  const responseFile = './ai_response.json';
  
  // Check for new requests every second
  setInterval(async () => {
    try {
      if (require('fs').existsSync(requestFile)) {
        const request = JSON.parse(readFileSync(requestFile, 'utf8'));
        console.log('📨 Processing request:', request.message);
        
        const response = await callGroq(request.message);
        
        // Write response
        writeFileSync(responseFile, JSON.stringify({
          response,
          provider: 'groq',
          model: 'llama3-70b-8192',
          timestamp: new Date().toISOString(),
          requestId: request.id
        }));
        
        // Clean up request file
        require('fs').unlinkSync(requestFile);
        
        console.log('✅ Response written to file');
      }
    } catch (error) {
      console.error('❌ Error processing request:', error.message);
      
      // Write error response
      writeFileSync(responseFile, JSON.stringify({
        error: error.message,
        provider: 'groq',
        timestamp: new Date().toISOString()
      }));
    }
  }, 1000);
}

console.log('✅ File-based AI server ready');
console.log('📝 Send requests by creating ai_request.json with: {"id": "1", "message": "your message"}');
console.log('📖 Read responses from ai_response.json');

processRequests();
