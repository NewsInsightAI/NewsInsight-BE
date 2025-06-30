const pool = require("../db");
const fs = require("fs");
const path = require("path");

async function runMigration(migrationFile) {
  try {
    console.log(`Running migration: ${migrationFile}`);

    const migrationPath = path.join(__dirname, "../migrations", migrationFile);

    if (!fs.existsSync(migrationPath)) {
      console.log(`⚠️  Migration file not found: ${migrationFile}`);
      return;
    }

    const sql = fs.readFileSync(migrationPath, "utf8");

    if (!sql.trim()) {
      console.log(`⚠️  Migration file is empty: ${migrationFile}`);
      return;
    }

    await pool.query(sql);

    console.log(`✅ Migration completed: ${migrationFile}`);
  } catch (error) {
    console.error(`❌ Migration failed: ${migrationFile}`, error);
    throw error;
  }
}

async function runBookmarksAndHistoryMigrations() {
  try {
    console.log("🚀 Setting up bookmarks and reading history tables...");

    await runMigration("create_bookmarks_table.sql");

    await runMigration("create_reading_history_table.sql");

    console.log("✅ Bookmarks and reading history database setup completed!");
  } catch (error) {
    console.error("❌ Database setup failed:", error);
    throw error;
  }
}

if (require.main === module) {
  runBookmarksAndHistoryMigrations()
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
  runBookmarksAndHistoryMigrations,
};
