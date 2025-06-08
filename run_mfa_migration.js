const pool = require('./db');
const fs = require('fs');

async function runMigration() {
  try {
    const migrationSQL = fs.readFileSync(
      "./migrations/fix_mfa_secret_key_length.sql",
      "utf8"
    );
    console.log("Running migration to fix MFA secret_key column length...");
    await pool.query(migrationSQL);
    console.log("Migration completed successfully!");

    const result = await pool.query(
      "SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = $1 AND column_name = $2",
      ["mfa_settings", "secret_key"]
    );
    console.log("Updated column info:", result.rows[0]);

    await pool.end();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
