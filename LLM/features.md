# Prompt de Construção — TelegramBot + Admin Panel (Monolito)

## Visão Geral do Projeto

Construa um sistema monolítico completo com as seguintes responsabilidades:

1. **Bot do Telegram** que recepciona usuários, exibe uma oferta com produtos e processa pagamentos via PIX (QR Code) integrado à OrionPay.
2. **Backend Node.js/Express** com MongoDB/Mongoose para persistência de dados.
3. **Painel Admin em React** para gerenciar mensagens, imagens e visualizar transações.

O repositório deve ser organizado em três pastas na raiz:

```
/
├── server/   ← Backend Node.js + Express + Mongoose
├── client/   ← Frontend React + Vite + TailwindCSS
└── LLM/      ← Este prompt de contexto
```

## Requisitos do Bot do Telegram

### Fluxo principal

Quando qualquer usuário iniciar uma conversa com o bot (`/start` ou qualquer mensagem inicial):

1. O bot envia **1 imagem** (URL armazenada no banco, hospedada no Cloudinary).
2. O bot envia **1 mensagem de texto** (conteúdo editável via painel admin).
3. O bot exibe **N botões inline** — um por produto cadastrado no BotConfig (renderizados dinamicamente). Se não houver produtos cadastrados, usa 2 produtos default:
   - `Pack de 50 conteúdos — R$ 27,90`
   - `Pack de 20 conteúdos — R$ 19,90`

### Ao clicar em um botão

1. O backend chama a API da OrionPay para gerar um PIX QR Code com o valor do produto clicado.
2. O bot responde ao usuário com:
   - A imagem do QR Code PIX (URL direta da OrionPay, sem upload para Cloudinary).
   - O código **Pix Copia e Cola** em formato de texto com botão "Copiar".
   - Uma mensagem orientando o pagamento.
3. A transação é registrada no MongoDB com status `PENDING` e `expiresAt` definido como `createdAt + 10 minutos`.

### Confirmação de pagamento

O sistema usa **duas camadas complementares** para confirmar o pagamento, sem polling:

#### Camada 1 — Webhook da OrionPay (automático)
- A OrionPay envia um `POST` ao endpoint `/api/payment/webhook` quando o pagamento é confirmado.
- O backend valida a assinatura HMAC-SHA256 do payload antes de processar.
- Ao confirmar, atualiza a Transaction para `PAID` e emite um evento WebSocket `payment_success` para o canal global `admin_events` e para o room da transação.
- O bot envia automaticamente o link do Google Drive ao usuário via Telegram.

#### Camada 2 — Botão "Já paguei — Verificar" (manual/fallback)
- Após exibir o QR Code, o bot exibe um botão inline: `✅ Já paguei — Verificar`.
- Ao clicar, o backend consulta o status da Transaction no MongoDB.
- Se `PAID`: envia o link imediatamente.
- Se ainda `PENDING`: responde com mensagem amigável pedindo aguardar mais alguns instantes.
- Se `EXPIRED`: informa e oferece gerar um novo PIX.
- Este é o fallback definitivo caso o webhook falhe ou não seja recebido. Não há mecanismo de retry de webhook externo.

#### Camada 3 — WebSocket no Admin Panel
- O painel admin abre uma conexão WebSocket com o servidor.
- Ouve o canal global `admin_events` para receber todas as atualizações de pagamento em tempo real, atualizando a tabela de transações sem necessidade de recarregar a página.
- Opcionalmente, pode entrar em rooms por `transactionId` para escutar eventos específicos.

---

## Stack e Dependências

### server/

- **Runtime**: Node.js 20+
- **Framework**: Express 4
- **Bot**: `node-telegram-bot-api` (modo webhook em produção, polling em dev)
- **Webhook dev**: `cloudflared tunnel` apontando para localhost
- **Banco**: MongoDB via Mongoose
- **HTTP Client**: Axios
- **Upload de imagens**: Cloudinary SDK (`cloudinary` npm package)
- **Variáveis de ambiente**: `dotenv`
- **Validação**: `zod` ou `joi`
- **WebSocket**: `socket.io`
- **Jobs**: `node-cron` para expiração de transações

Variáveis de ambiente necessárias (`.env`):

```env
PORT=3001
MONGO_URI=mongodb://localhost:27017/telegrambot
TELEGRAM_TOKEN=seu_token_aqui
TELEGRAM_WEBHOOK_URL=https://seudominio.com/webhook/telegram

ORION_API_KEY=sua_chave_orion
ORION_BASEURL=https://api.orionpay.com/v1/

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

DRIVE_LINK_PACK_50=https://drive.google.com/...
DRIVE_LINK_PACK_20=https://drive.google.com/...

ADMIN_SECRET=token_admin_para_painel
```

### client/

- **Framework**: React 18 + Vite
- **Estilo**: TailwindCSS
- **HTTP**: Axios ou fetch nativo
- **Estado**: React Context ou Zustand (leve)
- **Roteamento**: React Router v6
- **WebSocket**: `socket.io-client`

---

## Modelos MongoDB (Mongoose)

### `BotConfig`
Documento singleton — sempre haverá apenas 1 no banco.

```js
{
  welcomeImageUrl: String,       // URL Cloudinary
  welcomeMessage: String,        // Texto da mensagem de boas-vindas
  products: [
    {
      label: String,             // ex: "Pack de 50 conteúdos"
      price: Number,             // ex: 27.90
      driveLink: String          // Link do Google Drive
    }
  ],
  updatedAt: Date
}
```

### `Session`
Documento por sessão — cada `/start` cria um novo registro.

```js
{
  telegramUserId: String,
  username: String,
  firstName: String,
  startedAt: Date
}
```

### `Transaction`
Documento por transação — cada pagamento gerado cria um novo registro.

```js
{
  telegramUserId: String,
  productIndex: Number,
  productLabel: String,
  amount: Number,
  pixCode: String,               // Copia e Cola
  pixQrCodeUrl: String,          // URL direta da OrionPay
  gatewayTransactionId: String,  // ID retornado pela OrionPay
  status: { type: String, enum: ['PENDING', 'PAID', 'EXPIRED'], default: 'PENDING' },
  createdAt: Date,
  paidAt: Date,
  expiresAt: Date                // createdAt + 10 minutos
}
```

### `AdminToken`
Documento por token de admin — gerado via endpoint de login com email.

```js
{
  email: String,
  token: String,                 // UUID ou JWT
  createdAt: Date,
  expiresAt: Date                // createdAt + 24 horas
}
```

---

## Rotas do Backend

### Bot / Telegram
- `POST /webhook/telegram` — recebe updates do Telegram (modo produção)
- Bot em polling para desenvolvimento local

### Pagamentos

- `POST /api/payment/generate`
  - Body: `{ telegramUserId, productIndex }`
  - Gera PIX via OrionPay, salva Transaction com status `PENDING` e `expiresAt = now + 10min`
  - Retorna `{ pixCode, pixQrCodeUrl, transactionId }`

- `POST /api/payment/webhook` — callback da OrionPay
  - Valida assinatura HMAC-SHA256 conforme exemplo abaixo
  - Atualiza Transaction para `PAID`, registra `paidAt`
  - Emite evento WebSocket `payment_success` para `admin_events` e room da transação
  - Envia link do Google Drive ao usuário via bot
  - Retorna `{ received: true }`

- `GET /api/payment/check/:transactionId` — chamado pelo botão "Já paguei"
  - Retorna o status atual da Transaction no banco
  - Não faz chamada externa à OrionPay

### Admin API (protegido por `x-admin-token` no header)

- `POST /api/admin/login`
  - Body: `{ email }`
  - Gera e salva um token único no MongoDB
  - Retorna `{ token }`
  - Não requer autenticação prévia

- `GET /api/admin/config` — retorna BotConfig atual
- `PUT /api/admin/config` — atualiza mensagem, imagem, produtos e links Drive
- `POST /api/admin/upload-image` — faz upload de imagem para Cloudinary e retorna URL
- `GET /api/admin/transactions` — lista transações com filtro por status e data
- `GET /api/admin/transactions/pending-expired` — retorna transações expiradas para o cron job pode usar internamente
- `GET /api/admin/sessions` — lista sessões iniciadas

---

## WebSocket

Usar `socket.io` no servidor e `socket.io-client` no painel admin.

### Canais

- **`admin_events`** (canal broadcast global): todos os eventos de pagamento são emitidos aqui para que o painel admin receba todas as atualizações sem depender de rooms.

- **`transactionId`** (rooms individuais): para escuta pontual. O admin pode entrar em um room específico se quiser detalhes de uma transação.

```js
// Ao webhook confirmar pagamento
io.to(`admin_events`).emit('payment_success', {
  transactionId,
  telegramUserId,
  productLabel,
  amount,
  paidAt
});
```

---

## Validação do Webhook OrionPay

Implementar exatamente conforme o padrão HMAC-SHA256 da OrionPay:

```javascript
const crypto = require('crypto');

function validateWebhook(req, secret) {
  const signature = req.headers['x-webhook-signature'];
  const payload = req.body;

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  const expectedSignature = hmac.digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

O handler do webhook deve tratar os eventos:

| Evento | Ação |
|---|---|
| `payment.success` | Atualizar Transaction para `PAID`, emitir WebSocket, enviar Drive link via bot |
| `purchase.created` | Log opcional — registrar no campo `gatewayTransactionId` da Transaction |

O payload `payment.success` terá o formato:
```json
{
  "event": "payment.success",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "data": {
    "purchaseId": 999,
    "transactionId": "txn_abc123def456",
    "buyerEmail": "comprador@exemplo.com",
    "buyerName": "João Silva",
    "accessToken": "acc_token_abc123",
    "price": 27.90,
    "netAmount": 25.00,
    "platformFee": 2.90,
    "timestamp": "2024-01-15T10:30:45.123Z"
  }
}
```

Para correlacionar o webhook com a Transaction local, salvar o `transactionId`
retornado pela OrionPay no campo `gatewayTransactionId` ao criar a transação.
Ao receber o webhook, buscar a Transaction por `gatewayTransactionId`.

### Decisões de Implementação

**BotConfig como singleton**: Sempre haverá apenas 1 documento no banco. Um helper `getBotConfig()` retorna ou cria o documento se não existir.

**Produtos dinâmicos**: O array `products` no BotConfig é totalmente dinâmico. O bot renderiza 1 botão inline por produto. Se não houver produtos cadastrados, usa 2 defaults: `Pack de 50 conteúdos — R$ 27,90` e `Pack de 20 conteúdos — R$ 19,90`.

**Webhook dev com Cloudflare Tunnel**: Em desenvolvimento, usar `cloudflared tunnel` apontando para localhost. Produção usará domínio próprio. Detectar via `NODE_ENV`.

**Expiração de transações**: Cron job a cada 1 minuto marca transações `PENDING` com `expiresAt < now` como `EXPIRED`. Tempo de 10 minutos definido pela API OrionPay.

**Fallback do webhook**: Botão "Já paguei — Verificar" é o fallback definitivo. Sem retry de webhook externo.

**Admin auth com token por email**: Endpoint `POST /api/admin/login` recebe `{ email }`, gera token UUID, salva no MongoDB. Token expira em 24h. Frontend pede email + token para login.

**QR Code PIX**: URL direta da OrionPay, sem upload para Cloudinary. Enviado como imagem inline ao usuário.

**Seed inicial**: Na primeira execução, se não existir BotConfig, criar com:
- Mensagem de boas-vindas padrão
- Imagem placeholder (URL vazia, a ser configurada no admin)
- Produtos defaults: `[{ label: "Pack de 50 conteúdos", price: 27.90, driveLink: "" }, { label: "Pack de 20 conteúdos", price: 19.90, driveLink: "" }]`

---

## Integração OrionPay

Use exatamente o seguinte padrão para gerar pagamentos PIX:

```javascript
const GATEWAY_APIKEY = process.env.ORION_API_KEY;
const GATEWAY_BASEURL = process.env.ORION_BASEURL;

const paymentBody = {
  amount: Number(amount),
  name: user.name || "Cliente PIX",
  email: user.email || "telegramuser@gmail.com",
};

const gatewayResponse = await axios.post(
  `${GATEWAY_BASEURL}pix/generate`,
  paymentBody,
  {
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": GATEWAY_APIKEY,
    },
  }
);

// gatewayResponse.data contém pixCode, qrCodeUrl e transactionId
```

Mapeie os campos retornados pela OrionPay para os campos do model `Transaction`.

---

## Painel Admin (client/)

### Páginas

#### `/` — Dashboard
- Cards com métricas: total de sessões, transações pendentes, transações pagas, receita total.

#### `/config` — Configuração do Bot
- Campo para editar a **mensagem de boas-vindas** (textarea).
- Upload de **imagem de boas-vindas** (envia para `/api/admin/upload-image`, salva URL no BotConfig).
- Preview da imagem atual.
- Campos editáveis para cada produto: label, preço e link Google Drive.
- Botão para adicionar novo produto e botão para remover produto existente.
- Botão Salvar chama `PUT /api/admin/config`.

#### `/transactions` — Transações
- Tabela com: ID, usuário Telegram, produto, valor, status (badge colorido), data.
- Filtros por status (PENDING / PAID / EXPIRED).
- Atualização em tempo real via WebSocket (`admin_events`).

### Autenticação Admin
- Tela de login com campo de **email** e **token**.
- O usuário primeiro chama `POST /api/admin/login` (ou a UI pode ter um botão "Gerar token" que chama o endpoint externamente) — na prática, o token é gerado via chamada externa (cURL, script, ou página interna não protegida).
- O usuário insere email + token para logar.
- Token salvo no `localStorage` e incluído em todas as requisições no header `x-admin-token`.
- Token expira após 24h.

---

## Estrutura de Pastas Detalhada

```
server/
├── src/
│   ├── bot/
│   │   ├── bot.js              # Inicialização e handlers do Telegram
│   │   └── messages.js         # Templates de mensagens
│   ├── models/
│   │   ├── BotConfig.js
│   │   ├── Session.js
│   │   ├── Transaction.js
│   │   └── AdminToken.js
│   ├── routes/
│   │   ├── payment.routes.js
│   │   └── admin.routes.js
│   ├── services/
│   │   ├── orionpay.service.js  # Toda lógica com a OrionPay
│   │   ├── cloudinary.service.js
│   │   ├── socket.service.js    # WebSocket + rooms + broadcast
│   │   └── bot.service.js       # Envio de mensagens ao usuário
│   ├── middleware/
│   │   └── adminAuth.js         # Valida x-admin-token
│   ├── config/
│   │   ├── db.js                # Conexão Mongoose
│   │   └── seed.js              # Seed inicial do BotConfig
│   ├── jobs/
│   │   └── expireTransactions.job.js  # Cron de expiração
│   └── index.js                 # Entry point Express
├── .env
└── package.json

client/
├── src/
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── BotConfig.jsx
│   │   ├── Transactions.jsx
│   │   └── Login.jsx
│   ├── components/
│   │   ├── MetricCard.jsx
│   │   ├── ImageUploader.jsx
│   │   ├── ProductEditor.jsx
│   │   └── TransactionTable.jsx
│   ├── api/
│   │   └── admin.api.js         # Funções centralizadas de fetch
│   ├── context/
│   │   └── AuthContext.jsx      # Auth com token
│   ├── lib/
│   │   └── socket.js            # WebSocket client
│   └── main.jsx
├── .env
└── package.json
```

---

## Regras de Implementação

1. **Modularidade**: cada responsabilidade em seu próprio arquivo/serviço. Não colocar lógica de negócio diretamente nas routes.
2. **Sem imagens locais no servidor**: todas as imagens passam pelo Cloudinary. Exceção: URL do QR Code PIX da OrionPay é usada diretamente.
3. **Webhook em produção (Cloudflare Tunnel em dev)**: detectar via `NODE_ENV`.
4. **Erros tratados**: todos os `async/await` com `try/catch`. Erros retornam JSON padronizado `{ error: true, message: "..." }`.
5. **Seed inicial**: ao subir o servidor pela primeira vez, verificar se existe um `BotConfig` no banco — se não existir, criar um documento padrão.
6. **CORS**: configurar para aceitar origem do `client/` em desenvolvimento (`localhost:5173`).
7. **README**: criar um `README.md` na raiz com instruções de instalação, variáveis de ambiente e como rodar em dev e produção.
8. **BotConfig singleton**: helper para garantir 1 documento. Products dinâmicos — renderizar N botões.
9. **Expiração**: cron a cada 1 minuto, 10 min de vida para cada PIX.
10. **Admin auth**: token por email, 24h de validade.

---

## Ordem de Construção Sugerida

1. Setup do projeto (pastas, package.json, .env.example)
2. Conexão MongoDB, models e seed inicial
3. Bot Telegram com fluxo de `/start` e botões dinâmicos
4. Integração OrionPay (generate + webhook)
5. Rotas admin + middleware de autenticação + login por token
6. Upload Cloudinary
7. Cron job de expiração de transações
8. WebSocket (socket.io + rooms + broadcast admin_events)
9. Frontend React — estrutura base, contexto de auth, layout, login
10. Página de Config do Bot
11. Página de Transações com atualização em tempo real
12. Dashboard com métricas
13. README completo
