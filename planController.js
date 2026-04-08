/**
 * planController.js
 * Handles POST /plan — 90-Day personalized financial plan generator
 */

const { getOpenAI, NOVA_SYSTEM_PROMPT } = require('../openaiClient');

/**
 * POST /plan
 * Body: { income, expenses, goal, challenges }
 */
exports.generatePlan = async (req, res) => {
  try {
    const { income, expenses, goal, challenges } = req.body;

    // ── Validation ─────────────────────────────────────
    if (!income || !goal) {
      return res.status(400).json({ error: 'Income and goal are required.' });
    }
    if (typeof goal !== 'string' || goal.trim().length < 5) {
      return res.status(400).json({ error: 'Please provide a more detailed goal.' });
    }

    const incomeNum   = parseFloat(income)   || 0;
    const expensesNum = parseFloat(expenses) || 0;
    const surplus     = incomeNum - expensesNum;

    // ── Build prompt ───────────────────────────────────
    const prompt = `
Create a detailed, actionable 90-Day Financial Plan for this person:

**SITUATION:**
- Monthly Income: KES ${incomeNum.toLocaleString()}
- Monthly Expenses: KES ${expensesNum.toLocaleString()}
- Monthly Available: KES ${surplus.toLocaleString()}
- Primary Goal: ${goal.trim()}
- Current Challenges: ${challenges?.trim() || 'Not specified'}

**CREATE A STRUCTURED 3-MONTH PLAN:**

Month 1 — Foundation (Days 1-30):
Focus on immediate actions, habit building, and fixing the biggest leaks. Include:
- Specific weekly targets with KES amounts
- 3-4 concrete action items
- What to stop doing immediately
- First measurable milestone

Month 2 — Momentum (Days 31-60):
Build on Month 1 wins, introduce new strategies. Include:
- Investment or savings vehicle to open
- Specific KES targets to hit by end of month
- One new income or savings strategy to implement
- Mid-point check: what success looks like

Month 3 — Mastery (Days 61-90):
Consolidate, automate, and set up for long-term success. Include:
- Systems to automate (auto-transfers, etc.)
- Progress review checklist
- KES milestone to achieve by Day 90
- Next 90-day preview (what comes after)

Each month should feel distinct and progressive. Use specific KES numbers based on their income. Be practical, not generic.`.trim();

    // ── Call OpenAI ────────────────────────────────────
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: NOVA_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1200,
      temperature: 0.65,
    });

    const plan = completion.choices[0]?.message?.content || 'Plan could not be generated.';

    return res.json({ plan, model: completion.model });

  } catch (err) {
    console.error('[Plan Error]', err.message);
    handleOpenAIError(err, res);
  }
};

function handleOpenAIError(err, res) {
  if (err.status === 401) return res.status(500).json({ error: 'AI authentication failed. Check your API key.' });
  if (err.status === 429) return res.status(429).json({ error: 'AI service busy. Please try again shortly.' });
  return res.status(500).json({ error: 'Plan generation failed. Please try again.' });
}
