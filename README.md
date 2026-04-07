# market-bot

Telegram bot com painel admin para venda de packs de conteúdo via PIX (OrionPay).

## Estrutura

```
server/          Backend Node.js + Express + Mongoose
client/          Frontend React + Vite + TailwindCSS
```

## Pré-requisitos

- Node.js 20+
- MongoDB local ou remoto

## Instalação

### Server

```bash
cd server
cp .env.example .env   # preencha as variáveis
npm install
```

### Client

```bash
cd client
npm install
```

## Rodando em desenvolvimento

**Server:**
```bash
cd server
npm run dev
```

**Client:**
```bash
cd client
npm run dev
```

**Cloudflare Tunnel (para Webhook):**
```bash
cloudflared tunnel --url http://localhost:3001
```
Copie a URL gerada e coloque em `TELEGRAM_WEBHOOK_URL` no `.env`.

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `TELEGRAM_TOKEN` | Token do bot no Telegram |
| `ORION_API_KEY` | API Key da OrionPay |
| `ORION_BASEURL` | Base URL da API OrionPay |
| `CLOUDINARY_*` | Credenciais do Cloudinary |
| `WEBHOOK_SECRET` | Secret para validar webhook da OrionPay |
| `DRIVE_LINK_PACK_*` | Links do Google Drive por produto |

## Admin — Gerar token de acesso

```bash
curl -X POST http://localhost:3001/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email": "seu@email.com"}'
```

Use o token retornado para logar no painel admin em `http://localhost:5173/login`.
