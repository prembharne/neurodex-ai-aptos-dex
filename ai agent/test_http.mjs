// Direct HTTP test to Groq API
import 'dotenv/config';

async function testGroqHTTP() {
  console.log('🌐 Testing Groq API HTTP call directly...');
  
  const body = {
    model: 'llama3-70b-8192',
    messages: [
      { role: 'user', content: 'Say hello in one sentence.' }
    ],
    temperature: 0,
    max_tokens: 100
  };

  try {
    console.log('🚀 Making request to Groq...');
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify(body)
    });

    console.log('📡 Response status:', response.status);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success! Groq response:', data.choices[0].message.content);
    } else {
      console.error('❌ Error from Groq:', data);
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

testGroqHTTP().catch(console.error);
