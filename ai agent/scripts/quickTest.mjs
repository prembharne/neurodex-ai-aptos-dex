import fetch from 'node-fetch';

const base = process.env.BASE_URL || 'http://localhost:3000';

async function main(){
  const prompt = process.argv.slice(2).join(' ') || 'send 1 apt to 0x1';
  console.log('Prompt:', prompt);
  const chatResp = await fetch(base + '/api/ai/chat', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ messages:[{role:'user', content: prompt}], mode:'plan' })});
  const chatJson = await chatResp.json();
  console.log('\n--- /api/ai/chat reply ---\n');
  console.log(chatJson.reply);

  const execResp = await fetch(base + '/api/plan', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ prompt })});
  const execJson = await execResp.json();
  console.log('\n--- /api/plan intents ---');
  console.log(execJson.intents);
}
main().catch(e=>{console.error(e); process.exit(1);});
