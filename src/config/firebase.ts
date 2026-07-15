/**
 * src/config/firebase.ts
 * Initialises Firebase Admin SDK using the service account key file.
 *
 * The key file must be at:  <project-root>/serviceAccountKey.json
 *
 * process.cwd() always resolves to the project root (Northtravina-Server/)
 * regardless of whether the server is run via ts-node (src/) or compiled (dist/).
 */

import * as path from "node:path";
import * as fs from "node:fs";
import * as admin from "firebase-admin";
import type { ServiceAccount } from "firebase-admin";

// Resolve from the working directory (project root) — works for both
// `ts-node src/server.ts` and `node dist/server.js`
const keyPath = path.resolve(process.cwd(), "serviceAccountKey.json");

if (!fs.existsSync(keyPath)) {
  throw new Error(
    `Firebase service account key not found at: ${keyPath}\n` +
    `Make sure serviceAccountKey.json is in the Northtravina-Server/ root folder.`
  );
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf-8")) as ServiceAccount;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const db = admin.firestore();
export default admin;
