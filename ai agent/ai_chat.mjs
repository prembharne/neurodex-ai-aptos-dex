#!/usr/bin/env node

// Direct AI Chat Tool - Works without network server
import 'dotenv/config';

const args = process.argv.slice(2);
const message = args.join(' ') || 'Hello AI!';

console.log('💬 Your message:', message);
console.log('🤖 AI is thinking...\n');

async function directGroqCall(userMessage) {
  const body = {
    model: 'llama3-70b-8192',
    messages: [
      { role: 'system', content: 'You are NeuroDex AI, a helpful blockchain and trading assistant. Respond naturally and conversationally. Provide clear, accurate information about blockchain, DeFi, trading, cryptocurrencies, and related topics.' },
      { role: 'user', content: userMessage }
    ],
    temperature: 0.1,
    max_tokens: 1000,
  };

  try {
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
    
    const aiResponse = json?.choices?.[0]?.message?.content || 'No response from AI';
    
    console.log('🎯 AI Response:');
    console.log('═'.repeat(50));
    console.log(aiResponse);
    console.log('═'.repeat(50));
    console.log(`\n✅ Response generated using Groq (${body.model})`);
    console.log(`📊 Tokens used: ~${aiResponse.length / 4} tokens`);
    
    return aiResponse;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

directGroqCall(message).then(response => {
  if (response) {
    console.log('\n🎉 AI chat successful!');
    console.log('\n💡 Usage examples:');
    console.log('   node ai_chat.mjs "What is DeFi?"');
    console.log('   node ai_chat.mjs "How does APT token work?"');
    console.log('   node ai_chat.mjs "Explain smart contracts"');
  }
}).catch(console.error);
