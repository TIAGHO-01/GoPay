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

const axios = require('axios'); // Make sure axios is installed

app.get('/api/reverse-geocode', (req, res) => {
  const { lat, lon } = req.query;

  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;

  axios.get(url, {
    headers: {
      'User-Agent': 'GoPayApp/1.0 (your-email@example.com)'
    }
  })
  .then(response => {
    res.json(response.data);
  })
  .catch(error => {
    console.error('Reverse geocoding error:', error.message);
    res.status(500).json({ error: 'Failed to reverse geocode location' });
  });
});

const multer = require('multer');

// Multer setup (save in root project folder)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, __dirname); // same folder as HTML files
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `driver_${Date.now()}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({ storage });


// Handle login
app.post('/login', (req, res) => {
  const { username, phone } = req.body;

  // First, try to log in as a client
  const clientSql = 'SELECT * FROM client WHERE username = ? AND phone = ?';
  connection.query(clientSql, [username, phone], (err, clientResults) => {
    if (err) {
      console.error('Client login error:', err);
      return res.status(500).send('Internal Server Error');
    }

    if (clientResults.length > 0) {
      req.session.user = {
        type: 'client',
        id: clientResults[0].id,
        username: clientResults[0].username,
        phone: clientResults[0].phone
      };
      return res.redirect('/main.html');
    }

    // If not a client, check if it's a driver
    const driverSql = 'SELECT * FROM driver WHERE username = ? AND phone = ?';

    connection.query(driverSql, [username, phone], (err, driverResults) => {

      if (err) {
        console.error('Driver login error:', err);
        return res.status(500).send('Internal Server Error');
      }

      if (driverResults.length > 0) {
        req.session.user = {
  type: 'driver',
  id: driverResults[0].id,
  username: driverResults[0].username,  // ✅ fixed
  phone: driverResults[0].phone,
  matricule: driverResults[0].matricule,
  profile_img: driverResults[0].profile_img
};

        return res.redirect('/driver_profile.html');
      }

      // If neither, invalid login
      res.send('Invalid username or phone');
    });
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
  const sql = 'SELECT id, username, matricule, phone, profile_img FROM driver WHERE id = ?';



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

// Handle client signup
app.post('/signup', (req, res) => {
  const { username, phone } = req.body;

  const insertSql = 'INSERT INTO client (username, phone) VALUES (?, ?)';

  connection.query(insertSql, [username, phone], (err, result) => {
    if (err) {
      console.error('Signup error:', err);
      return res.status(500).send('Error during signup');
    }

    // Optional: Store the session for the new client
    req.session.user = {
      type: 'client',
      id: result.insertId,
      username,
      phone
    };

    res.redirect('/main.html'); // redirect to client dashboard after signup
  });
});

// Handle driver signup
app.post('/driver-signup', (req, res) => {
  const { username, phone, matricule } = req.body;

  const insertSql = 'INSERT INTO driver (username, phone, matricule) VALUES (?, ?, ?)';

  connection.query(insertSql, [username, phone, matricule], (err, result) => {
    if (err) {
      console.error('Driver signup error:', err);
      return res.status(500).send('Error during driver signup');
    }

    // Optional: Store driver session
    req.session.user = {
      type: 'driver',
      id: result.insertId,
      username,
      phone,
      matricule
    };

    res.redirect('/driver_profile.html'); // Change this path if needed
  });
});


// Upload driver profile image
app.post('/upload-profile-img', upload.single('profile_img'), (req, res) => {
  const driverId = req.session.user?.id;
  if (!driverId) return res.status(401).send('Unauthorized');

  const imgPath = req.file.filename;
  const sql = 'UPDATE driver SET profile_img = ? WHERE id = ?';
  connection.query(sql, [imgPath, driverId], (err) => {
    if (err) {
      console.error('Image upload error:', err);
      return res.status(500).json({ success: false, error: 'Server error' });
    }
    req.session.user.profile_img = imgPath;
    res.json({ success: true, imageUrl: `/${imgPath}` });
  });
});




app.get('/favicon.ico', (req, res) => res.status(204));

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${port}`);
});
