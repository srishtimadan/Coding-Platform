const crypto = require('crypto');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database(process.env.DATABASE_PATH || path.join(__dirname, 'app.db'));

function hashPassword(password, salt) {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, generatedSalt, 100000, 64, 'sha512').toString('hex');
  return { salt: generatedSalt, hash };
}

function initDb() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          full_name TEXT NOT NULL DEFAULT '',
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          salt TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) return reject(err);

        db.all('PRAGMA table_info(users)', (columnsErr, columns) => {
          if (columnsErr) return reject(columnsErr);

          const createRemainingTables = () => {
            db.run(`
              CREATE TABLE IF NOT EXISTS submissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                problem TEXT NOT NULL,
                email TEXT,
                language TEXT,
                verdict TEXT,
                runtime_ms INTEGER,
                message TEXT,
                code TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
              )
            `, (tableErr) => {
              if (tableErr) return reject(tableErr);

              db.run(`
                CREATE TABLE IF NOT EXISTS browser_progress (
                  visitor_id TEXT PRIMARY KEY,
                  solved_ids TEXT NOT NULL DEFAULT '[]',
                  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
              `, (progressErr) => {
                if (progressErr) return reject(progressErr);
                resolve();
              });
            });
          };

          if (columns.some((column) => column.name === 'full_name')) {
            createRemainingTables();
            return;
          }

          db.run(
            "ALTER TABLE users ADD COLUMN full_name TEXT NOT NULL DEFAULT ''",
            (alterErr) => {
              if (alterErr) return reject(alterErr);
              createRemainingTables();
            }
          );
        });
      });
    });
  });
}

function registerUser({ fullName = '', email, password }) {
  return new Promise((resolve, reject) => {
    if (!email || !password) {
      return reject(new Error('Email and password are required.'));
    }

    if (typeof password !== 'string' || password.length < 8) {
      return reject(new Error('Password must be at least 8 characters long.'));
    }

    if (typeof fullName !== 'string' || fullName.trim().length > 100) {
      return reject(new Error('Full name must be 100 characters or fewer.'));
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return reject(new Error('Please enter a valid email address.'));
    }

    const { salt, hash } = hashPassword(password);

    db.run(
      'INSERT INTO users (full_name, email, password, salt) VALUES (?, ?, ?, ?)',
      [fullName.trim(), normalizedEmail, hash, salt],
      function (err) {
        if (err) {
          if (err.code === 'SQLITE_CONSTRAINT') {
            return reject(new Error('An account with this email already exists.'));
          }
          return reject(err);
        }

        resolve({ id: this.lastID, fullName: fullName.trim(), email: normalizedEmail });
      }
    );
  });
}

function loginUser({ email, password }) {
  return new Promise((resolve, reject) => {
    if (!email || !password) {
      return reject(new Error('Email and password are required.'));
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    db.get('SELECT * FROM users WHERE email = ?', [normalizedEmail], (err, row) => {
      if (err) return reject(err);
      if (!row) return reject(new Error('User not found. Please register first.'));

      const submittedHash = crypto.pbkdf2Sync(password, row.salt, 100000, 64, 'sha512').toString('hex');
      if (submittedHash !== row.password) {
        return reject(new Error('Incorrect password.'));
      }

      resolve({ id: row.id, fullName: row.full_name || '', email: row.email });
    });
  });
}

function saveSubmission({ problem, email, language, verdict, runtime_ms, message, code }) {
  return new Promise((resolve, reject) => {
    if (!problem) {
      return reject(new Error('Problem is required.'));
    }

    db.run(
      `INSERT INTO submissions (problem, email, language, verdict, runtime_ms, message, code)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [problem, email || null, language || null, verdict || 'Unknown', runtime_ms || 0, message || null, code || null],
      function (err) {
        if (err) return reject(err);
        resolve({ id: this.lastID, problem, verdict, runtime_ms });
      }
    );
  });
}

function getSubmissions(problem) {
  return new Promise((resolve, reject) => {
    const sql = problem
      ? 'SELECT * FROM submissions WHERE problem = ? ORDER BY created_at DESC LIMIT 20'
      : 'SELECT * FROM submissions ORDER BY created_at DESC LIMIT 50';
    const params = problem ? [problem] : [];

    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

function getBrowserProgress(visitorId) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT solved_ids, updated_at FROM browser_progress WHERE visitor_id = ?',
      [visitorId],
      (err, row) => {
        if (err) return reject(err);
        if (!row) return resolve({ solved: [] });

        try {
          resolve({ solved: JSON.parse(row.solved_ids), updatedAt: row.updated_at });
        } catch (parseErr) {
          reject(new Error('Saved progress data is invalid.'));
        }
      }
    );
  });
}

function saveBrowserProgress(visitorId, solvedIds) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO browser_progress (visitor_id, solved_ids, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(visitor_id) DO UPDATE SET
         solved_ids = excluded.solved_ids,
         updated_at = CURRENT_TIMESTAMP`,
      [visitorId, JSON.stringify(solvedIds)],
      (err) => {
        if (err) return reject(err);
        resolve({ visitorId, solved: solvedIds });
      }
    );
  });
}

module.exports = {
  initDb,
  registerUser,
  loginUser,
  saveSubmission,
  getSubmissions,
  getBrowserProgress,
  saveBrowserProgress,
};
