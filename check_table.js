const pool = require("./db");

async function checkTable() {
  try {
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log("Available tables:");
    console.table(tables.rows);

    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    console.log("\nUsers table structure:");
    console.table(result.rows);

    const profileResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'profile'
      ORDER BY ordinal_position
    `);
    console.log("\nProfile table structure:");
    console.table(profileResult.rows);

    pool.end();
  } catch (err) {
    console.error("Error:", err);
    pool.end();
  }
}

checkTable();
