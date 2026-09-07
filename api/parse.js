// Vercel serverless function.
// Receives a base64 timetable screenshot, asks Claude to extract every
// class session as structured JSON, and returns it to the frontend.
//
// Requires an environment variable ANTHROPIC_API_KEY (set it in your
// Vercel project settings — Project → Settings → Environment Variables).

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';

const TOOL_SCHEMA = {
  name: 'extract_schedule',
  description: 'Extract every class session shown in the timetable image.',
  input_schema: {
    type: 'object',
    properties: {
      courses: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            course_name: {
              type: 'string',
              description: 'Course name. Prefer the English name if the image shows one; otherwise use the name as printed.'
            },
            session_type: {
              type: 'string',
              description: 'What kind of session this is, e.g. "Lecture", "Lab", "Practical" — infer from any symbol/legend on the timetable (e.g. a star vs. a diamond) or from column labels.'
            },
            day: {
              type: 'string',
              enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
              description: 'Day of week column this session is in.'
            },
            period_start: { type: 'integer', description: 'First period number of this session (e.g. 1, 3, 9).' },
            period_end: { type: 'integer', description: 'Last period number of this session (e.g. 2, 4, 10). Equal to period_start if it is a single period.' },
            week_start: { type: 'integer', description: 'First week number (of the term) this session runs.' },
            week_end: { type: 'integer', description: 'Last week number (of the term) this session runs.' },
            location: { type: 'string', description: 'Building/room/campus text shown for this session.' },
            teacher: { type: 'string', description: 'Teacher/instructor name shown for this session.' }
          },
          required: ['course_name', 'day', 'period_start', 'period_end', 'week_start', 'week_end']
        }
      }
    },
    required: ['courses']
  }
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).send('Server is missing ANTHROPIC_API_KEY.');
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const { image, mediaType } = body || {};
  if (!image) {
    res.status(400).send('No image provided.');
    return;
  }

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        tools: [TOOL_SCHEMA],
        tool_choice: { type: 'tool', name: 'extract_schedule' },
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType || 'image/png', data: image }
              },
              {
                type: 'text',
                text: 'This is a screenshot of a university class timetable. Extract every class session into the extract_schedule tool. Read the whole table carefully — a course can appear more than once (e.g. a lecture and a separate lab session), and each occupies its own row/cell block. Do not skip any cell that has text in it.'
              }
            ]
          }
        ]
      })
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      res.status(502).send('Anthropic API error: ' + errText);
      return;
    }

    const data = await anthropicRes.json();
    const toolUse = (data.content || []).find(block => block.type === 'tool_use' && block.name === 'extract_schedule');
    if (!toolUse) {
      res.status(502).send('Model did not return structured data.');
      return;
    }

    res.status(200).json(toolUse.input);
  } catch (err) {
    res.status(500).send('Server error: ' + err.message);
  }
};
