const mysql = require('mysql2');
const QRCode = require('qrcode');

// 1. Set your driver ID (replace with real value)
const driverId = 1; // Change this to the correct driver ID

// 2. Set up MySQL connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'MentraConnection1.0',
  database: 'gopay_db'
});

// 3. Generate QR code and save
async function generateAndSaveQR() {
  try {
    const qrData = `driver:${driverId}`; // this data will be embedded in the QR
    const qrImageBuffer = await QRCode.toBuffer(qrData); // generate image buffer

    // 4. Run SQL to save QR code blob in DB
    const sql = 'UPDATE driver SET qr_code = ? WHERE id = ?';
    connection.query(sql, [qrImageBuffer, driverId], (err, result) => {
      if (err) {
        console.error('Database error:', err);
      } else {
        console.log(`QR code saved successfully for driver ID ${driverId}`);
      }
      connection.end(); // Always close DB connection
    });
  } catch (error) {
    console.error('QR code generation failed:', error);
  }
}

generateAndSaveQR();
