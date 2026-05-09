const express = require('express');
const router = express.Router();
const Listing = require('../models/Listing');

// POST /api/ai/chat
router.post('/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    // Fetch relevant listings to give AI context
    const listings = await Listing.find({ status: 'approved' })
      .select('title type location.area pricing.amount facilities avgRating gender')
      .limit(30);

    const listingContext = listings.map(l =>
      `${l.title} (${l.type}) | Area: ${l.location.area} | ₹${l.pricing.amount}/mo | Rating: ${l.avgRating} | Facilities: ${(l.facilities || []).join(', ')} | Gender: ${l.gender}`
    ).join('\n');

    const systemPrompt = `You are Nikunj AI, a helpful assistant for a student accommodation platform in Jaipur, India. 
You help students find hostels, PG rooms, flats, and tiffin/food services.

Current verified listings in our database:
${listingContext}

Rules:
- Always respond in the same language the user uses (Hindi or English)
- Recommend from the listings above when relevant
- Be friendly, concise, and helpful
- If asked about budget, suggest appropriate options
- For contact, tell students to click "Contact Owner" on the listing
- Keep responses short (3-5 lines max) unless giving a detailed comparison`;

    const messages = [
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message }
    ];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
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

    const data = await response.json();
    const reply = data.content?.[0]?.text || 'Sorry, I could not process that. Please try again.';
    res.json({ success: true, reply });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
