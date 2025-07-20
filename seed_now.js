const { clearAndSeedDatabase } = require("./seeders/fresh_seeder");

console.log("🌱 Starting FRESH database seeding process...");
console.log(
  "⚠️  WARNING: This will CLEAR existing data and create fresh sample data!"
);
console.log("");

clearAndSeedDatabase()
  .then(() => {
    console.log("");
    console.log("🎉 Fresh database seeding completed successfully!");
    console.log("You can now test the application with fresh sample data.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("");
    console.error("❌ Fresh database seeding failed:");
    console.error(error.message);
    console.error("");
    console.error("Please check your database connection and try again.");
    process.exit(1);
  });
