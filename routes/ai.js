const express = require('express');
const router = express.Router();
const Listing = require('../models/Listing');

const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS) || 15000;

function hasConfiguredAnthropicKey() {
  const key = String(process.env.ANTHROPIC_API_KEY || '').trim();
  return key && !/^YOUR_/i.test(key) && key !== 'undefined' && key !== 'null';
}

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    if (!hasConfiguredAnthropicKey()) {
      console.warn('[AI] ANTHROPIC_API_KEY is not configured; frontend will use local fallback.');
      return res.status(503).json({ success: false, message: 'AI provider is not configured' });
    }

    // Fetch relevant listings to give AI context
    const listings = await Listing.find({ status: 'approved' })
      .select('title type location.area pricing.amount facilities avgRating gender')
      .limit(30);

    const listingContext = listings.map(l =>
      `${l.title} (${l.type}) | Area: ${l.location.area} | ₹${l.pricing.amount}/mo | Rating: ${l.avgRating} | Facilities: ${(l.facilities || []).join(', ')} | Gender: ${l.gender}`
    ).join('\n');

    const systemPrompt = `You are Nikunj AI, a premium, helpful conversational assistant for Nikunj — Jaipur's leading luxury and modern housing rental marketplace.
You help students, families, working professionals, roommates, and flat owners discover listings, map areas, and compare verified accommodations.

Current verified listings in our database:
${listingContext}

Features you support:
1. Discovery & Search: Parse parameters like budget (e.g., under 12k), location (e.g., JECRC or RTU), gender, and amenities (AC, Wi-Fi, food included).
2. Intelligent Intent Actions:
   - Map: If the user wants to see properties on a map, explicitly advise them they can toggle the "Map View" in the interface or click on listings directly.
   - Compare: If they ask to compare properties, highlight the differences in rent, ratings, facilities, and locality side-by-side.
3. Verification: Highlight properties with "Verified" or "Sponsored" tags as top recommendations.

Rules:
- Always respond in the same language the user uses (Hindi, English, or Hinglish).
- Recommend from the listings context above when matching.
- Be extremely polite, premium, friendly, and concise.
- For contact, tell users to click "Contact Owner" or request a callback directly on the property details.
- Keep responses short (3-5 lines max) unless comparing multiple properties.`;

    const messages = [
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message }
    ];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
    let response;
    try {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          system: systemPrompt,
          messages
        })
      });
    } finally {
      clearTimeout(timeout);
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('[AI] Provider error:', response.status, data.error?.message || data.message || data);
      return res.status(502).json({ success: false, message: 'AI provider error' });
    }
    const reply = data.content?.[0]?.text || 'Sorry, I could not process that. Please try again.';
    res.json({ success: true, reply });
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('[AI] Provider timeout after %sms', AI_TIMEOUT_MS);
      return res.status(504).json({ success: false, message: 'AI request timed out' });
    }
    console.error('[AI] Route error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
