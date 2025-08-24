// Minimal working AI server
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Simple AI response function
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

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ 
    ok: true, 
    provider: 'groq',
    hasKey: !!process.env.GROQ_API_KEY,
    model: 'llama3-70b-8192'
  });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }

    console.log('💬 Chat request:', message);
    const response = await callGroq(message);
    console.log('🤖 AI response:', response.substring(0, 100) + '...');
    
    res.json({ 
      response,
      provider: 'groq',
      model: 'llama3-70b-8192',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Chat error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🚀 Minimal AI server running on http://localhost:${PORT}`);
  console.log('✅ Using Groq AI provider');
  console.log('🔑 API key:', process.env.GROQ_API_KEY ? 'SET' : 'NOT SET');
});

export default app;
