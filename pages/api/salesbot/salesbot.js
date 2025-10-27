const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

const SYSTEM_PROMPT = `...` // I will fill this in for you in the next message with the full system prompt (same as before but compressed into one clean variable)
 
router.post('/salesbot', async (req, res) => {
  const userMessage = req.body.message;
  const previousMessages = req.body.messages || []; // optional chat history

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...previousMessages,
    { role: 'user', content: userMessage }
  ];

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages
      })
    });

    const data = await response.json();

    if (!data.choices || !data.choices[0]) {
      return res.status(500).json({ error: 'Invalid AI response', data });
    }

    const aiMessage = data.choices[0].message.content;

    // === Optional: capture leads when user provides email or phone ===
    const emailMatch = aiMessage.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}/);
    if (emailMatch) {
      console.log('Captured lead email:', emailMatch[0]);
      // TODO: Next step - store in MySQL
    }

    res.json({ reply: aiMessage });
  } catch (error) {
    console.error('OpenAI API Error:', error);
    res.status(500).json({ error: 'AI request failed', details: error.message });
  }
});

module.exports = router;
