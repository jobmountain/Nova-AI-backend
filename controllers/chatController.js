/**
 * chatController.js
 * Handles POST /chat — AI financial chat endpoint
 * Uses OpenAI GPT-4o-mini with conversation history support
 */

const { getOpenAI, NOVA_SYSTEM_PROMPT } = require('../openaiClient');

/**
 * POST /chat
 * Body: { message: string, history?: Array<{role, content}> }
 */
exports.chat = async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    // ── Validation ────────────────────────────────────
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required.' });
    }
    if (message.trim().length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }
    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message too long. Max 2000 characters.' });
    }

    // ── Build conversation ─────────────────────────────
    // Include conversation history for context (max 10 turns)
    const conversationHistory = Array.isArray(history)
      ? history.slice(-10).filter(m => m.role && m.content)
      : [];

    const messages = [
      { role: 'system', content: NOVA_SYSTEM_PROMPT },
      ...conversationHistory,
      { role: 'user', content: message.trim() },
    ];

    // ── Call OpenAI ────────────────────────────────────
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 600,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content || 'I could not generate a response.';

    return res.json({
      reply,
      model: completion.model,
      usage: completion.usage,
    });

  } catch (err) {
    console.error('[Chat Error]', err.message);
    handleOpenAIError(err, res);
  }
};

// ── Shared error handler ──────────────────────────────
function handleOpenAIError(err, res) {
  if (err.status === 401 || err.code === 'invalid_api_key') {
    return res.status(500).json({ error: 'AI service authentication failed. Please check your API key.' });
  }
  if (err.status === 429 || err.code === 'rate_limit_exceeded') {
    return res.status(429).json({ error: 'AI service is busy. Please try again in a moment.' });
  }
  if (err.code === 'insufficient_quota') {
    return res.status(500).json({ error: 'AI service quota exceeded. Please check your OpenAI billing.' });
  }
  return res.status(500).json({ error: 'AI service temporarily unavailable. Please try again.' });
}
