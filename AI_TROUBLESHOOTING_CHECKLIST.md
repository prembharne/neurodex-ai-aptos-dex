# 🤖 AI Response Troubleshooting Checklist

## ✅ **Complete Checklist for AI Response Issues**

### 🔧 **1. Environment & Configuration**

#### **Backend Environment (.env file)**
- [ ] `.env` file exists in `ai agent/` directory (not just `.env.example`)
- [ ] `DEEPSEEK_API_KEY` is set with valid key: `sk-a4e84c211190427da2b5c32078de00d5`
- [ ] `PORT=3002` or your preferred port
- [ ] No extra spaces or quotes around environment variables
- [ ] File is saved (Ctrl+S) after editing

#### **API Key Validation**
```bash
# Test your DeepSeek API key directly
curl -X POST https://api.deepseek.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-a4e84c211190427da2b5c32078de00d5" \
  -d '{"model":"deepseek-chat","messages":[{"role":"user","content":"Hello"}]}'
```

### 🚀 **2. Server Status**

#### **Backend Server Running**
- [ ] AI agent backend is running on port 3002
- [ ] No errors in terminal when starting server
- [ ] Server responds to health check: http://localhost:3002/health
- [ ] Debug endpoint works: http://localhost:3002/debug

#### **Server Logs**
```bash
# Enable detailed logging
set LOG_LLM=1
npm run dev
```

### 📡 **3. API Endpoints**

#### **Health Check**
```bash
# Should return provider info and API key status
curl http://localhost:3002/health
```
Expected response:
```json
{
  "status": "ok",
  "provider": "deepseek",
  "model": "deepseek-chat",
  "hasApiKey": true
}
```

#### **Chat Endpoint Test**
```bash
# Test direct API call
curl -X POST http://localhost:3002/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is 2+2?"}'
```

### 🌐 **4. Frontend-Backend Connection**

#### **Network Configuration**
- [ ] Frontend proxy is configured in `vite.config.js`
- [ ] Backend URL is correct in frontend environment
- [ ] No CORS errors in browser console
- [ ] Network tab shows successful API calls

#### **Frontend Environment (.env.local)**
```bash
REACT_APP_AI_AGENT_API=http://localhost:3002/api
```

### 🔍 **5. Browser Debugging**

#### **Browser Console Checks**
- [ ] Open Developer Tools (F12)
- [ ] Check Console tab for JavaScript errors
- [ ] Check Network tab for failed API requests
- [ ] Look for CORS or 404 errors

#### **Network Tab Analysis**
```javascript
// In browser console, test direct API call
fetch('http://localhost:3002/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Hello AI' })
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

### ⚙️ **6. Code Configuration**

#### **Provider Selection Logic**
Check `src/api/llmClient.ts`:
- [ ] Provider is correctly identified as "deepseek"
- [ ] API key is being passed to requests
- [ ] HTTP error handling is working
- [ ] Response parsing is successful

#### **Server Route Configuration**
Check `server/index.ts`:
- [ ] `/api/chat` endpoint is defined
- [ ] LLM client is properly initialized
- [ ] Error handling is in place

### 🧪 **7. Step-by-Step Testing**

#### **Test 1: Environment Variables**
```bash
# In ai agent directory
node -e "require('dotenv').config(); console.log('DEEPSEEK_API_KEY:', process.env.DEEPSEEK_API_KEY ? 'SET' : 'NOT SET')"
```

#### **Test 2: Direct LLM Client**
```bash
# Test the LLM client directly
node -e "
require('dotenv').config();
const { createLLMClient } = require('./dist/src/api/llmClient.js');
const client = createLLMClient({
  provider: 'deepseek',
  apiKey: process.env.DEEPSEEK_API_KEY,
  model: 'deepseek-chat'
});
client.freeformAnswer('Hello AI').then(console.log).catch(console.error);
"
```

#### **Test 3: Server Response**
```bash
# Start server and test endpoint
curl -v http://localhost:3002/api/chat -H "Content-Type: application/json" -d '{"message":"test"}'
```

#### **Test 4: Frontend Integration**
1. Open browser to http://localhost:5173/
2. Open Developer Tools (F12)
3. Try AI chat feature
4. Check Console and Network tabs for errors

### 🚨 **8. Common Issues & Solutions**

#### **Issue: "Provider not found" or "API key missing"**
**Solution:**
```bash
# Verify environment file
cd "d:\NEURODEX\ai agent"
type .env
# Should show DEEPSEEK_API_KEY=sk-a4e84c211190427da2b5c32078de00d5
```

#### **Issue: "Connection refused" or "Network error"**
**Solution:**
```bash
# Check if backend is running
netstat -an | findstr :3002
# Should show LISTENING on port 3002
```

#### **Issue: "CORS policy error"**
**Solution:**
- Check `vite.config.js` has proxy configuration
- Ensure server has CORS middleware enabled

#### **Issue: "JSON parsing error"**
**Solution:**
```bash
# Enable detailed logging
set LOG_LLM=1
npm run dev
# Check terminal for HTTP request/response details
```

#### **Issue: "DeepSeek API rate limit"**
**Solution:**
- Check API key quota at https://platform.deepseek.com/
- Implement retry logic with exponential backoff
- Consider switching to OpenAI temporarily

### 🔧 **9. Emergency Debugging Commands**

#### **Quick Health Check**
```bash
# All-in-one health check
cd "d:\NEURODEX\ai agent"
echo "Checking .env..." && type .env
echo "Checking server..." && curl http://localhost:3002/health
echo "Testing API..." && curl -X POST http://localhost:3002/api/chat -H "Content-Type: application/json" -d "{\"message\":\"test\"}"
```

#### **Reset Everything**
```bash
# If all else fails, restart from scratch
cd "d:\NEURODEX\ai agent"
npm install
copy .env.example .env
# Edit .env with your API key
npm run dev
```

### 📊 **10. Success Indicators**

#### **✅ Working System Should Show:**
- [ ] Backend server starts without errors
- [ ] `curl http://localhost:3002/health` returns valid JSON
- [ ] Browser console shows no errors
- [ ] AI chat responses appear in frontend
- [ ] Network tab shows successful 200 responses

#### **✅ Expected Response Format:**
```json
{
  "response": "Your AI response text here",
  "intents": [...],
  "timestamp": "2025-08-24T04:18:14.547Z"
}
```

### 🆘 **11. Last Resort Checklist**

If nothing works:
- [ ] Try a different API key
- [ ] Switch to OpenAI temporarily (set `OPENAI_API_KEY`)
- [ ] Check Windows Defender/Firewall isn't blocking port 3002
- [ ] Try running on a different port (change `PORT` in .env)
- [ ] Clear browser cache and cookies
- [ ] Restart VS Code and terminals
- [ ] Check system proxy settings

---

## 🎯 **Quick 2-Minute Test**

```bash
# 1. Check environment
cd "d:\NEURODEX\ai agent" && type .env

# 2. Start server (new terminal)
npm run dev

# 3. Test health (new terminal)
curl http://localhost:3002/health

# 4. Test chat
curl -X POST http://localhost:3002/api/chat -H "Content-Type: application/json" -d "{\"message\":\"Hello\"}"

# 5. Open frontend
# Go to http://localhost:5173/ and try AI chat
```

**If all steps work → ✅ AI is working!**
**If any step fails → ❌ Check that specific section above**
