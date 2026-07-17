import app from "./app.js";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";


async function main(): Promise<void> {
  await connectDb();

  // Firestore triggers and auto-approval are disabled because ride matching and dispatching
  // are handled in real-time by the mobile apps directly on Firestore.
  console.log("ℹ️  Firestore auto-approval triggers and startup scan are disabled (App handles matching).");


  app.listen(env.port, () => {
    console.log(`Server listening on port ${env.port} (${env.nodeEnv})`);
  });
}

main().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
