const pool = require("./db");

async function checkGoogleUsers() {
  try {
    const result = await pool.query(`
      SELECT email, username, google_id, created_at 
      FROM users 
      WHERE email LIKE '%@gmail.com%' 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    console.log("Recent Google users:");
    result.rows.forEach((user) => {
      console.log(`- Email: ${user.email}`);
      console.log(`  Username: ${user.username}`);
      console.log(`  Google ID: ${user.google_id ? "Yes" : "No"}`);
      console.log(`  Created: ${user.created_at}`);
      console.log("---");
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    pool.end();
  }
}

checkGoogleUsers();
