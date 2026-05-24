/**
 * Run once to generate your admin password hash.
 * Usage: node scripts/hash-password.js
 *
 * Copy the output into ADMIN_PASSWORD_HASH in your .env file.
 */

const bcrypt   = require("bcryptjs");
const readline = require("readline");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question("Enter the admin password you want to use: ", async (password) => {
  rl.close();
  if (!password || password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 12);
  console.log("\nAdd this to your .env file:");
  console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
});
