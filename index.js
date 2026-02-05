const ftp = require("basic-ftp");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Configurações do FTP (carregadas do .env)
const FTP_HOST = process.env.FTP_HOST?.trim();
const FTP_PORT = process.env.FTP_PORT || 21;
const FTP_USER = process.env.FTP_USER?.trim();
const FTP_PASSWORD = process.env.FTP_PASSWORD?.trim();
const FTP_REMOTE_PATH = process.env.FTP_REMOTE_PATH?.trim() || "/";
const LOCAL_PATH = process.env.LOCAL_PATH?.trim() || "./images";

// Validação de configurações obrigatórias
if (!FTP_HOST || !FTP_USER || !FTP_PASSWORD) {
  console.error("❌ ERRO: Configurações FTP incompletas!");
  console.error("\nVerifique se o arquivo .env existe e contém:");
  console.error("  - FTP_HOST");
  console.error("  - FTP_USER");
  console.error("  - FTP_PASSWORD\n");
  console.error(
    "Exemplo: copie o arquivo .env.example para .env e preencha os dados corretos.\n",
  );
  process.exit(1);
}

// Extensões de imagens suportadas
const IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".bmp",
  ".webp",
  ".svg",
];

// Cria a pasta local se não existir
if (!fs.existsSync(LOCAL_PATH)) {
  fs.mkdirSync(LOCAL_PATH, { recursive: true });
  console.log(`📁 Pasta criada: ${LOCAL_PATH}`);
}

// Função recursiva para coletar lista de imagens
async function collectImages(client, remotePath, imageList) {
  try {
    const fileList = await client.list(remotePath);

    for (const item of fileList) {
      const remoteFilePath = path.posix.join(remotePath, item.name);

      if (item.type === 2) {
        // Diretório
        await collectImages(client, remoteFilePath, imageList);
      } else if (item.type === 1) {
        // Arquivo
        const ext = path.extname(item.name).toLowerCase();
        if (IMAGE_EXTENSIONS.includes(ext)) {
          imageList.push({
            remotePath: remoteFilePath,
            name: item.name,
            size: item.size,
            ext: ext,
          });
        }
      }
    }
  } catch (error) {
    console.error(
      `❌ Erro ao processar diretório ${remotePath}:`,
      error.message,
    );
  }
}

// Função para baixar uma imagem
async function downloadImage(client, image, stats) {
  try {
    // Prepara nome do arquivo local
    let localFileName = image.name;
    let localFilePath = path.join(LOCAL_PATH, localFileName);

    // Verifica duplicatas
    let counter = 1;
    const originalName = image.name;
    while (fs.existsSync(localFilePath)) {
      const nameWithoutExt = path.basename(image.name, image.ext);
      localFileName = `${nameWithoutExt}_${counter}${image.ext}`;
      localFilePath = path.join(LOCAL_PATH, localFileName);
      counter++;
    }

    if (localFileName !== originalName) {
      console.log(`⚠️  Duplicata: "${originalName}" → "${localFileName}"`);
      stats.duplicates++;
    }

    const percent = ((stats.downloaded / stats.totalImages) * 100).toFixed(1);
    process.stdout.write(
      `\r⬇️  [${stats.downloaded}/${stats.totalImages}] ${percent}% - ${image.name.substring(0, 40)}...`,
    );

    await client.downloadTo(localFilePath, image.remotePath);
    stats.downloaded++;
    stats.totalBytes += image.size;
  } catch (error) {
    console.error(`\n❌ Erro ao baixar ${image.remotePath}:`, error.message);
    stats.errors++;
  }
}

async function downloadImagesFromFTP() {
  const client = new ftp.Client();
  client.ftp.verbose = false;

  const stats = {
    totalImages: 0,
    downloaded: 0,
    duplicates: 0,
    errors: 0,
    totalBytes: 0,
  };

  const startTime = Date.now();

  try {
    console.log("🔌 Conectando ao servidor FTP...");
    console.log(`   Host: ${FTP_HOST}`);
    console.log(`   Porta: ${FTP_PORT}`);
    console.log(`   Usuário: ${FTP_USER}\n`);

    await client.access({
      host: FTP_HOST,
      port: FTP_PORT,
      user: FTP_USER,
      password: FTP_PASSWORD,
      secure: false,
    });

    console.log("✅ Conectado com sucesso!");
    console.log(`📂 Escaneando diretório: ${FTP_REMOTE_PATH}`);
    console.log("🔍 Coletando lista de imagens...\n");

    // Coleta todas as imagens primeiro
    const imageList = [];
    await collectImages(client, FTP_REMOTE_PATH, imageList);

    stats.totalImages = imageList.length;
    console.log(`🖼️  ${stats.totalImages} imagens encontradas!\n`);

    if (stats.totalImages === 0) {
      console.log("⚠️  Nenhuma imagem encontrada no diretório especificado");
      client.close();
      return;
    }

    console.log("📥 Iniciando download...\n");

    // Baixa todas as imagens sequencialmente (mais rápido que múltiplas conexões)
    for (const image of imageList) {
      await downloadImage(client, image, stats);
    }

    client.close();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const mbDownloaded = (stats.totalBytes / (1024 * 1024)).toFixed(2);
    const speed = (parseFloat(mbDownloaded) / parseFloat(duration)).toFixed(2);

    // Mostra resumo
    console.log("\n\n" + "=".repeat(60));
    console.log("📊 RESUMO DO DOWNLOAD:");
    console.log("=".repeat(60));
    console.log(`🖼️  Total de imagens: ${stats.totalImages}`);
    console.log(`✅ Imagens baixadas: ${stats.downloaded}`);
    if (stats.duplicates) {
      console.log(`⚠️  Duplicatas renomeadas: ${stats.duplicates}`);
    }
    console.log(`❌ Erros: ${stats.errors}`);
    console.log(`📦 Volume total: ${mbDownloaded} MB`);
    console.log(`⏱️  Tempo total: ${duration}s`);
    console.log(
      `🚀 Velocidade: ${speed} MB/s (${(stats.downloaded / parseFloat(duration)).toFixed(2)} img/s)`,
    );
    console.log("=".repeat(60));
  } catch (error) {
    if (error.code === 530) {
      console.error("\n❌ ERRO DE AUTENTICAÇÃO (530 Login incorrect)");
      console.error("\n⚠️  O usuário ou senha estão incorretos!");
      console.error("\nVerifique no arquivo .env:");
      console.error(`   FTP_USER=${FTP_USER}`);
      console.error(`   FTP_PASSWORD=${FTP_PASSWORD ? "****" : "(vazio)"}`);
      console.error(
        "\nConfirme as credenciais corretas com o administrador do servidor FTP.\n",
      );
    } else {
      console.error("\n❌ Erro:", error.message);
    }
    throw error;
  } finally {
    if (client) {
      client.close();
    }
    console.log("\n🔌 Conexão FTP fechada");
  }
}

// Executa o script
console.log("🚀 Iniciando download de imagens do FTP...\n");
downloadImagesFromFTP()
  .then(() => {
    console.log("\n✨ Processo finalizado com sucesso!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Processo finalizado com erro:", error);
    process.exit(1);
  });
