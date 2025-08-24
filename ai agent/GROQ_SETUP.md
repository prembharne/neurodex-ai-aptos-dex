# 🚀 Groq API Setup Guide

## ✅ **Step 1: Get Your Groq API Key**

1. **Visit:** https://console.groq.com/
2. **Sign up** with your email (no credit card required)
3. **Navigate to:** API Keys section
4. **Click:** "Create API Key"
5. **Copy the key** (starts with `gsk_...`)

## ✅ **Step 2: Update Your .env File**

Open `d:\NEURODEX\ai agent\.env` and add your Groq API key:

```bash
# Groq (recommended - fast and free)
GROQ_API_KEY="gsk_YOUR_ACTUAL_API_KEY_HERE"
GROQ_MODEL="llama-3.1-70b-versatile"

# Server
PORT=3002

# Optional: Keep other providers as backup
DEEPSEEK_API_KEY="sk-a4e84c211190427da2b5c32078de00d5"
```

## ✅ **Step 3: Test Your Setup**

```bash
# 1. Start your AI agent backend
cd "d:\NEURODEX\ai agent"
npm run dev

# 2. Test health endpoint (new terminal)
Invoke-RestMethod -Uri "http://localhost:3002/health" -Method GET

# Expected response:
# {
#   "ok": true,
#   "provider": "groq",
#   "hasKey": true
# }

# 3. Test AI chat
Invoke-RestMethod -Uri "http://localhost:3002/api/chat" -Method POST -ContentType "application/json" -Body '{"message":"Hello Groq!"}'
```

## ✅ **Step 4: Groq Models Available**

Choose your preferred model in the `.env` file:

```bash
# Fast models (recommended)
GROQ_MODEL="llama-3.1-70b-versatile"    # Best overall
GROQ_MODEL="llama-3.1-8b-instant"       # Fastest
GROQ_MODEL="mixtral-8x7b-32768"         # Good for long context

# Code models
GROQ_MODEL="llama-3.1-70b-specdec"      # Good for coding
```

## 🎯 **Why Groq is Excellent:**

✅ **Free Tier:** 14,400 requests/day (plenty for development)
✅ **Speed:** Up to 800 tokens/sec (extremely fast)
✅ **Quality:** Llama 3.1 70B is very capable
✅ **Reliability:** Professional API with good uptime
✅ **No Credit Card:** Start immediately

## 🔧 **Troubleshooting:**

### Issue: "Missing Groq API key"
**Solution:** Make sure your API key is in `.env` file and starts with `gsk_`

### Issue: "Provider still showing deepseek"
**Solution:** Restart your server after updating `.env`

### Issue: "Rate limit exceeded" 
**Solution:** Groq free tier: 30 requests/minute, 14,400/day

## 🎉 **Success!**

Once configured, your AI agent will:
- ✅ Use Groq as primary provider (fastest responses)
- ✅ Fall back to DeepSeek if Groq fails
- ✅ Show "provider": "groq" in health checks
- ✅ Deliver lightning-fast AI responses!

Your AI agent is now powered by Groq! 🚀
