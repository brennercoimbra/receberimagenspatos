const fs = require("fs");
const path = require("path");
require("dotenv").config();

const LOCAL_PATH = process.env.LOCAL_PATH?.trim() || "./images";
const JSON_PATH =
  process.env.JSON_PATH?.trim() || "./documentosgeraisprincipais.json"; // caminho do json

// Garante que a pasta existe
if (!fs.existsSync(LOCAL_PATH)) {
  console.error(`❌ Pasta de imagens não encontrada: ${LOCAL_PATH}`);
  process.exit(1);
}

// Lê o JSON com a lista de imagens esperadas
// Exemplo de JSON: ["img1.jpg", "img2.png", "subpasta/img3.webp"]
let expectedImages;
try {
  const raw = fs.readFileSync(JSON_PATH, "utf-8");
  expectedImages = JSON.parse(raw);
} catch (err) {
  console.error(`❌ Erro ao ler/parsing o JSON em ${JSON_PATH}:`, err.message);
  process.exit(1);
}

if (!Array.isArray(expectedImages)) {
  console.error(
    "❌ O JSON deve ser um array de strings ou objetos contendo o nome do arquivo.",
  );
  process.exit(1);
}

const normalizedImages = expectedImages
  .map((item, index) => {
    if (typeof item === "string") {
      return item;
    }

    if (item && typeof item === "object") {
      if (typeof item.nome_arquivo === "string") {
        return item.nome_arquivo;
      }

      const values = Object.values(item).filter(
        (value) => typeof value === "string",
      );
      if (values.length === 1) {
        return values[0];
      }
    }

    console.warn(
      `⚠️ Entrada ignorada no índice ${index}: esperado string ou objeto com nome do arquivo.`,
    );
    return null;
  })
  .filter(Boolean);

const stats = {
  totalExpected: normalizedImages.length,
  found: 0,
  missing: 0,
  missingList: [],
  skipped: expectedImages.length - normalizedImages.length,
  deleted: 0,
  deletedList: [],
};

const expectedSet = new Set(
  normalizedImages.map((item) => item.replace(/\\/g, "/")),
);

const listFilesRecursively = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursively(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
};

const localFiles = listFilesRecursively(LOCAL_PATH);
for (const filePath of localFiles) {
  const relativePath = path.relative(LOCAL_PATH, filePath).replace(/\\/g, "/");

  if (!expectedSet.has(relativePath)) {
    fs.unlinkSync(filePath);
    stats.deleted++;
    stats.deletedList.push(relativePath);
  }
}

for (const item of normalizedImages) {
  // se no JSON você só tiver o nome do arquivo:
  const localFilePath = path.join(LOCAL_PATH, item);
  if (fs.existsSync(localFilePath)) {
    stats.found++;
  } else {
    stats.missing++;
    stats.missingList.push(item);
  }
}

// Resultado
console.log("=".repeat(60));
console.log("📊 VERIFICAÇÃO DE IMAGENS LOCAL:");
console.log("=".repeat(60));
console.log(`🖼️  Total esperado: ${stats.totalExpected}`);
console.log(`✅ Encontradas: ${stats.found}`);
console.log(`❌ Ausentes: ${stats.missing}`);
if (stats.skipped) {
  console.log(`⚠️  Ignoradas: ${stats.skipped}`);
}
console.log(`🗑️  Excluidas: ${stats.deleted}`);

if (stats.missingList.length) {
  console.log("\n❌ Lista de imagens ausentes:");
  for (const name of stats.missingList) {
    console.log(` - ${name}`);
  }
}
console.log("=".repeat(60));
