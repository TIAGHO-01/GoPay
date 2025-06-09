const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const session = require('express-session');
const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(__dirname));

// Session config
app.use(session({
  secret: 'gopay-secret-key',
  resave: false,
  saveUninitialized: true
}));

// MySQL setup
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'MentraConnection1.0',
  database: 'gopay_db'
});

connection.connect(err => {
  if (err) {
    console.error('MySQL connection error:', err);
    return;
  }
  console.log('Connected to MySQL');
});

// Handle login
app.post('/login', (req, res) => {
  const { username, phone } = req.body;
  const sql = 'SELECT * FROM client WHERE username = ? AND phone = ?';

  connection.query(sql, [username, phone], (err, results) => {
    if (err) {
      console.error('Login error:', err);
      return res.status(500).send('Internal Server Error');
    }

    if (results.length > 0) {
      // Store user info in session
      req.session.user = {
        id: results[0].id,
        username: results[0].username,
        phone: results[0].phone
      };
      res.redirect('/main.html');
    } else {
      res.send('Invalid username or phone');
    }
  });
});

// Endpoint to get session user info
app.get('/api/user', (req, res) => {
  if (req.session.user) {
    res.json(req.session.user);
  } else {
    res.status(401).json({ error: 'Not logged in' });
  }
});

app.get('/api/driver/:id', (req, res) => {
  const driverId = req.params.id;
  const sql = 'SELECT name, matricule, phone, profile_img FROM driver WHERE id = ?';

  connection.query(sql, [driverId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    res.json(results[0]);
  });
});

app.get('/driver/:id/qr', (req, res) => {
  const sql = 'SELECT qr_code FROM driver WHERE id = ?';
  connection.query(sql, [req.params.id], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).send('Not found');
    }

    const qr = results[0].qr_code;
    res.setHeader('Content-Type', 'image/png');
    res.send(qr);
  });
});



app.get('/favicon.ico', (req, res) => res.status(204));

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
