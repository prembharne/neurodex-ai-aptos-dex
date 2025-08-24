// Quick test script for AI functionality
import 'dotenv/config';
import { IntentParser } from './src/intents/normalizer.js';

async function testAI() {
  console.log('🧪 Testing AI Agent...');
  console.log('GROQ_API_KEY:', process.env.GROQ_API_KEY ? 'SET ✅' : 'NOT SET ❌');
  console.log('DEEPSEEK_API_KEY:', process.env.DEEPSEEK_API_KEY ? 'SET ✅' : 'NOT SET ❌');
  
  try {
    console.log('\n📝 Creating IntentParser with Groq...');
    const parser = new IntentParser({ provider: 'groq' });
    
    console.log('🤖 Testing AI response...');
    const response = await parser.answer('Hello AI, please say hello back!');
    
    console.log('✅ AI Response:', response);
    console.log('\n🎉 AI Agent is working!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('🔧 Stack:', error.stack);
  }
}

testAI().catch(console.error);
