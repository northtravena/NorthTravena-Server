import "../config/env.js";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { User } from "../models/user.model.js";

const NEW_EMAIL = "admin@northtravena.com";
const NEW_PASSWORD = "12345123";
const NEW_NAME = "NorthTravena Admin";

async function updateAdminCredentials() {
  console.log("Connecting to MongoDB…");
  await mongoose.connect(env.mongodbUri);

  // Check if admin@northtravena.com already exists
  let admin = await User.findOne({ email: NEW_EMAIL.toLowerCase() });

  if (admin) {
    admin.password = NEW_PASSWORD;
    admin.role = "admin";
    admin.fullName = NEW_NAME;
    await admin.save();
    console.log(`✅ Updated existing admin user ${NEW_EMAIL} with new password.`);
  } else {
    // Check if previous admin@gmail.com exists and update it, or create new
    const oldAdmin = await User.findOne({ email: "admin@gmail.com" });
    if (oldAdmin) {
      oldAdmin.email = NEW_EMAIL;
      oldAdmin.password = NEW_PASSWORD;
      oldAdmin.fullName = NEW_NAME;
      oldAdmin.role = "admin";
      await oldAdmin.save();
      console.log(`✅ Renamed old admin user (admin@gmail.com) to ${NEW_EMAIL} and updated password.`);
    } else {
      await User.create({
        email: NEW_EMAIL,
        password: NEW_PASSWORD,
        fullName: NEW_NAME,
        phoneNo: "0000000000",
        role: "admin",
      });
      console.log(`✅ Created new admin account ${NEW_EMAIL}.`);
    }
  }

  await mongoose.disconnect();
  console.log("=== CREDENTIALS UPDATED SUCCESSFULLY ===");
  process.exit(0);
}

updateAdminCredentials().catch((err) => {
  console.error("Update failed:", err);
  process.exit(1);
});
