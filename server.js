const path = require('path');
const express = require('express');
const cors = require('cors');
const {
  initDb,
  registerUser,
  loginUser,
  saveSubmission,
  getSubmissions,
  getBrowserProgress,
  saveBrowserProgress,
} = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'API is running' });
});

app.post('/api/register', async (req, res) => {
  try {
    const user = await registerUser(req.body || {});
    res.status(201).json({ success: true, user });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Registration failed.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const user = await loginUser(req.body || {});
    res.json({ success: true, user });
  } catch (error) {
    res.status(401).json({ success: false, message: error.message || 'Login failed.' });
  }
});

app.get('/api/submissions', async (req, res) => {
  try {
    const problem = req.query.problem || null;
    const submissions = await getSubmissions(problem);
    res.json({ success: true, data: submissions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Unable to retrieve submissions.' });
  }
});

app.post('/api/submissions', async (req, res) => {
  try {
    const submission = await saveSubmission(req.body || {});
    res.status(201).json({ success: true, submission });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Unable to save submission.' });
  }
});

app.get('/api/progress/:visitorId', async (req, res) => {
  const { visitorId } = req.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(visitorId)) {
    return res.status(400).json({ success: false, message: 'A valid visitor ID is required.' });
  }

  try {
    const progress = await getBrowserProgress(visitorId);
    res.json({ success: true, data: progress });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Unable to retrieve progress.' });
  }
});

app.put('/api/progress/:visitorId', async (req, res) => {
  const { visitorId } = req.params;
  const solved = req.body && req.body.solved;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(visitorId)) {
    return res.status(400).json({ success: false, message: 'A valid visitor ID is required.' });
  }

  if (!Array.isArray(solved) || solved.length > 100 ||
      solved.some((id) => !Number.isInteger(id) || id < 1 || id > 100)) {
    return res.status(400).json({ success: false, message: 'Solved problems must be an array of valid IDs.' });
  }

  try {
    const progress = await saveBrowserProgress(visitorId, [...new Set(solved)]);
    res.json({ success: true, data: progress });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Unable to save progress.' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });
