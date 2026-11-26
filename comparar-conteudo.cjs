const fs = require("fs");
const cp = require("child_process");

const path = "prisma/migrations/20261106010000_adiciona_checkout_key/migration.sql";

const local = fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");
const git = cp.execFileSync("git", ["show", `HEAD:${path}`]).toString("utf8").replace(/\r\n/g, "\n");

console.log("Conteúdo local igual ao Git:", local === git);
console.log("Local:", JSON.stringify(local));
console.log("Git:   ", JSON.stringify(git));
