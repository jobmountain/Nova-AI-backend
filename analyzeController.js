/**
 * analyzeController.js
 * Handles POST /analyze — Financial analysis with personalized plan
 */

const { getOpenAI, NOVA_SYSTEM_PROMPT } = require('../openaiClient');

/**
 * POST /analyze
 * Body: { income, expenses, savings, debt, goals }
 */
exports.analyze = async (req, res) => {
  try {
    const { income, expenses, savings, debt, goals } = req.body;

    // ── Validation ─────────────────────────────────────
    if (income === undefined || expenses === undefined) {
      return res.status(400).json({ error: 'Income and expenses are required.' });
    }

    const incomeNum   = parseFloat(income)   || 0;
    const expensesNum = parseFloat(expenses) || 0;
    const savingsNum  = parseFloat(savings)  || 0;
    const debtNum     = parseFloat(debt)     || 0;

    if (incomeNum < 0 || expensesNum < 0 || savingsNum < 0 || debtNum < 0) {
      return res.status(400).json({ error: 'Financial values cannot be negative.' });
    }

    // ── Build prompt ───────────────────────────────────
    const surplus = incomeNum - expensesNum;
    const savingsRate = incomeNum > 0 ? ((surplus / incomeNum) * 100).toFixed(1) : 0;

    const prompt = `
Analyze this client's financial situation and provide a comprehensive, personalized assessment:

**FINANCIAL DATA:**
- Monthly Income: KES ${incomeNum.toLocaleString()}
- Monthly Expenses: KES ${expensesNum.toLocaleString()}
- Monthly Surplus/Deficit: KES ${surplus.toLocaleString()} (${surplus >= 0 ? 'surplus' : 'deficit'})
- Current Savings: KES ${savingsNum.toLocaleString()}
- Total Debt: KES ${debtNum.toLocaleString()}
- Savings Rate: ${savingsRate}%
- Financial Goals: ${goals || 'Not specified'}

**PROVIDE:**

### Financial Health Assessment
Brief overview of their current financial health. Be direct and honest but encouraging.

### Key Strengths
What they're doing well (if anything). 1-3 points.

### Critical Issues
The biggest financial problems or risks they face. Be specific.

### 3-Step Action Plan
**Step 1:** [Most urgent action to take this week]
**Step 2:** [Key change to implement this month]
**Step 3:** [Strategic move for the next 3 months]

### Motivational Insight
One powerful, personalized insight to motivate them. Reference their specific numbers. End with a quote or call to action.

Be specific with KES numbers. Speak directly to them (use "you"). Keep each section concise but impactful.`.trim();

    // ── Call OpenAI ────────────────────────────────────
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: NOVA_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      max_tokens: 900,
      temperature: 0.6,
    });

    const analysis = completion.choices[0]?.message?.content || 'Analysis could not be generated.';

    return res.json({ analysis, model: completion.model });

  } catch (err) {
    console.error('[Analyze Error]', err.message);
    handleOpenAIError(err, res);
  }
};

function handleOpenAIError(err, res) {
  if (err.status === 401) return res.status(500).json({ error: 'AI authentication failed. Check your API key.' });
  if (err.status === 429) return res.status(429).json({ error: 'AI service busy. Please try again shortly.' });
  return res.status(500).json({ error: 'Analysis failed. Please try again.' });
}
