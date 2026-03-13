const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'db.sqlite');
const db = new sqlite3.Database(dbPath);

// Add assignedAdminId column to users table
db.run("ALTER TABLE users ADD COLUMN assignedAdminId VARCHAR", (err) => {
  if (err) {
    console.error('Error adding column:', err.message);
  } else {
    console.log('Successfully added assignedAdminId column to users table');
  }
  db.close();
});
