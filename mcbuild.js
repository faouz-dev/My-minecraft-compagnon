// @ts-nocheck
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

const PACK_NAME = "my-compagnon";
const ROOT_DIR = __dirname;
const OUTPUT = path.join(ROOT_DIR, `${PACK_NAME}.mcpack`);

const IGNORED = new Set([
  ".git",
  ".gitignore",
  ".vscode",
  "node_modules",
  "src",
  "esbuild.js",
  "jsconfig.json",
  "mcbuild.js",
  "package.json",
  "package-lock.json",
  `${PACK_NAME}.mcpack`,
  "README.md",
]);

function shouldIgnore(name) {
  return IGNORED.has(name);
}

function addDirectory(archive, dir, relative = "") {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const name = entry.name;

    if (shouldIgnore(name)) {
      console.log(`⏭️  Ignoré : ${path.join(relative, name)}`);
      continue;
    }

    const fullPath = path.join(dir, name);
    const archivePath = path.join(relative, name);

    if (entry.isDirectory()) {
      addDirectory(archive, fullPath, archivePath);
    } else {
      console.log(`📦 Ajouté : ${archivePath}`);
      archive.file(fullPath, {
        name: archivePath.replace(/\\/g, "/"),
      });
    }
  }
}

function buildMcpack() {
  console.log("🚀 Création du pack Minecraft...\n");

  if (fs.existsSync(OUTPUT)) {
    fs.unlinkSync(OUTPUT);
  }

  const output = fs.createWriteStream(OUTPUT);
  const archive = archiver("zip", {
    zlib: { level: 9 },
  });

  output.on("close", () => {
    console.log("\n✅ Pack créé !");
    console.log(`📁 ${OUTPUT}`);
    console.log(`📦 Taille : ${archive.pointer()} octets`);
  });

  archive.on("warning", (err) => {
    if (err.code === "ENOENT") {
      console.warn("⚠️", err.message);
    } else {
      throw err;
    }
  });

  archive.on("error", (err) => {
    throw err;
  });

  archive.pipe(output);

  addDirectory(archive, ROOT_DIR);

  archive.finalize();
}

buildMcpack();
