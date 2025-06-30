const pool = require("../db");
const { runMigration } = require("./setupDatabase");

async function setupNewsDatabase() {
  try {
    console.log("🚀 Setting up news database...");

    await runMigration("create_news_table.sql");

    console.log("✅ News database setup completed!");
  } catch (error) {
    console.error("❌ News database setup failed:", error);
    throw error;
  }
}

if (require.main === module) {
  setupNewsDatabase()
    .then(() => {
      console.log("News setup completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("News setup failed:", error);
      process.exit(1);
    });
}

module.exports = {
  setupNewsDatabase,
};
