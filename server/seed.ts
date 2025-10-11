// Seed script to create initial admin user and test approved emails
import { db } from "./db";
import { users, approvedEmails } from "@shared/schema";

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // Create admin user
    console.log("Creating admin user...");
    await db
      .insert(users)
      .values({
        id: "admin-001",
        email: "admin@imk.com",
        firstName: "Admin",
        lastName: "User",
        isAdmin: true,
      })
      .onConflictDoNothing();

    // Create some approved test emails
    console.log("Creating approved test emails...");
    const testEmails = [
      "krish1@gmail.com",
      "radha1@gmail.com",
      "uni@gmail.com",
      "test@example.com",
    ];

    for (const email of testEmails) {
      await db
        .insert(approvedEmails)
        .values({
          email,
          status: 'active',
        })
        .onConflictDoNothing();
    }

    console.log("✅ Seeding completed successfully!");
    console.log("\n📧 Admin Login: admin@imk.com");
    console.log("📧 Test Emails:");
    testEmails.forEach(email => console.log(`   - ${email}`));
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

seed();
