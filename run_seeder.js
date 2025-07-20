const { seedDatabase } = require("./seeders/database_seeder");

console.log("🌱 Starting database seeding process...");
console.log("⚠️  WARNING: This will add sample data to your database!");
console.log("");

seedDatabase()
  .then(() => {
    console.log("");
    console.log("🎉 Database seeding completed successfully!");
    console.log("You can now test the application with sample data.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("");
    console.error("❌ Database seeding failed:");
    console.error(error.message);
    console.error("");
    console.error("Please check your database connection and try again.");
    process.exit(1);
  });
