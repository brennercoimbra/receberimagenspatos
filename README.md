# Receber Imagens de FTP

Aplicação Node.js para baixar imagens de um servidor FTP e salvá-las localmente.

## 📋 Pré-requisitos

- Node.js (versão 14 ou superior)
- npm ou yarn
- Acesso a um servidor FTP

## 🚀 Instalação

1. Instale as dependências:

```bash
npm install
```

2. Configure o arquivo `.env`:

```bash
# Copie o arquivo de exemplo
copy .env.example .env

# Edite o arquivo .env com suas credenciais FTP
```

3. Edite o arquivo `.env` com suas configurações:

```env
FTP_HOST=ftp.seu-servidor.com
FTP_PORT=21
FTP_USER=seu_usuario
FTP_PASSWORD=sua_senha
FTP_REMOTE_PATH=/caminho/das/imagens
LOCAL_PATH=./images
```

## 💻 Como usar

Execute o script para baixar as imagens:

```bash
npm start
```

Para desenvolvimento com auto-reload:

```bash
npm run dev
```

## 📁 Estrutura do Projeto

```
receberimagenspatos/
├── index.js          # Script principal
├── package.json      # Dependências e scripts
├── .env              # Configurações (não versionado)
├── .env.example      # Exemplo de configurações
├── .gitignore        # Arquivos ignorados pelo git
├── images/           # Pasta onde as imagens são salvas
└── README.md         # Este arquivo
```

## 🎯 Funcionalidades

- ✅ Conecta a servidores FTP
- ✅ Lista arquivos no diretório remoto
- ✅ Filtra apenas arquivos de imagem (jpg, jpeg, png, gif, bmp, webp, svg)
- ✅ Baixa imagens que ainda não existem localmente
- ✅ Mostra progresso e tamanho dos arquivos
- ✅ Logs detalhados de todas as operações
- ✅ Tratamento de erros

## 📝 Notas

- As imagens já existentes na pasta local não serão baixadas novamente
- Os logs mostram o progresso de cada download
- Se usar FTPS (FTP seguro), altere `secure: false` para `secure: true` no arquivo [index.js](index.js)

## 🔧 Dependências

- **basic-ftp**: Cliente FTP para Node.js
- **dotenv**: Carrega variáveis de ambiente do arquivo .env
- **nodemon** (dev): Auto-reload durante desenvolvimento

## 📄 Licença

ISC
