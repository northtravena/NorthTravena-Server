/**
 * seed-admin.ts
 * Creates (or updates) the admin user in the database.
 *
 * Usage:
 *   npx tsx src/scripts/seed-admin.ts
 *
 * Override defaults via env vars:
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=secret npx tsx src/scripts/seed-admin.ts
 */

import "../config/env.js"; // load .env first
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { User } from "../models/user.model.js";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@northtravena.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "12345123";
const ADMIN_NAME = process.env.ADMIN_NAME ?? "Admin";
const ADMIN_PHONE = process.env.ADMIN_PHONE ?? "0000000000";

async function main() {
  console.log("Connecting to MongoDB…");
  await mongoose.connect(env.mongodbUri);
  console.log("Connected.");

  const existing = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });

  if (existing) {
    // Update role to admin and reset password if needed
    existing.role = "admin";
    existing.password = ADMIN_PASSWORD; // pre-save hook will hash it
    await existing.save();
    console.log(`✅ Existing user updated to admin: ${ADMIN_EMAIL}`);
  } else {
    await User.create({
      email: ADMIN_EMAIL,
      fullName: ADMIN_NAME,
      phoneNo: ADMIN_PHONE,
      password: ADMIN_PASSWORD,
      role: "admin",
    });
    console.log(`✅ Admin user created: ${ADMIN_EMAIL}`);
  }

  console.log(`   Email:    ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  await mongoose.disconnect();
  console.log("Done.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
