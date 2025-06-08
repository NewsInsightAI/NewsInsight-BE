const pool = require("../db");
const fs = require("fs");
const path = require("path");

async function runMigration(migrationFile) {
  try {
    console.log(`Running migration: ${migrationFile}`);
    
    const migrationPath = path.join(__dirname, '../migrations', migrationFile);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await pool.query(sql);
    
    console.log(`✅ Migration completed: ${migrationFile}`);
  } catch (error) {
    console.error(`❌ Migration failed: ${migrationFile}`, error);
    throw error;
  }
}

async function setupCitiesDatabase() {
  try {
    console.log("🚀 Setting up cities database...");

    await runMigration("create_cities_tables.sql");

    console.log("✅ Cities database setup completed!");
  } catch (error) {
    console.error("❌ Database setup failed:", error);
    throw error;
  }
}


if (require.main === module) {
  setupCitiesDatabase()
    .then(() => {
      console.log("Setup completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Setup failed:", error);
      process.exit(1);
    });
}

module.exports = {
  runMigration,
  setupCitiesDatabase
};
