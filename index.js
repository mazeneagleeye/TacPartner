require('dotenv').config();
const { Client, GatewayIntentBits } = require("discord.js");
const Groq = require("groq-sdk");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Rate limiting: track user cooldowns (5 second cooldown per user)
const userCooldowns = new Map();
const COOLDOWN_MS = 5000; // 5 seconds between replies to same user

function checkCooldown(userId) {
  const now = Date.now();
  const lastUsed = userCooldowns.get(userId);

  if (lastUsed && now - lastUsed < COOLDOWN_MS) {
    return false; // Still in cooldown
  }

  userCooldowns.set(userId, now);
  return true; // Allowed
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const mentionedBot = message.mentions.has(client.user);
  const repliedToBot = message.reference
    ? (await message.fetchReference()).author.id === client.user.id
    : false;

  // Only respond when bot is mentioned or someone replies to a bot message.
  if (mentionedBot || repliedToBot) {
    if (!checkCooldown(message.author.id)) {
      await message.reply("⏱️ Please wait a moment before asking again!");
      return;
    }

    try {
      const response = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: message.content }],
        max_tokens: 500,
      });

      const reply = response.choices[0].message.content;
      await message.reply(reply);
    } catch (err) {
      console.error("❌ Groq Error:", err.message);
      await message.reply("🤖 Oops, I couldn't think of a reply.");
    }
  }
});

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

const DISCORD_TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN;
if (!DISCORD_TOKEN) {
  console.error(
    "❌ No DISCORD_TOKEN found. Set DISCORD_TOKEN env var in Railway or a local .env for testing."
  );
  process.exit(1);
}
if (!process.env.GROQ_API_KEY) {
  console.error("❌ Missing GROQ_API_KEY (set in Railway environment variables).");
  process.exit(1);
}

client.login(DISCORD_TOKEN);

// health server for Railway
const http = require('http');
const PORT = process.env.PORT || 3000;
const server = http
  .createServer((req, res) => {
    if ((req.url || '') === '/health') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running');
  })
  .listen(PORT, () => console.log(`🔌 Health server listening on port ${PORT}`));

const shutdown = async (signal) => {
  console.log(`Received ${signal}, shutting down...`);
  try {
    await client.destroy();
  } catch (err) {
    console.error('Error while destroying client:', err);
  }
  try {
    server.close();
  } catch (err) {
    console.error('Error while closing server:', err);
  }
  process.exit(0);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (r) => console.error('Unhandled Rejection:', r));
process.on('uncaughtException', (e) => {
  console.error('Uncaught Exception:', e);
  process.exit(1);
});

console.log(
  `💓 initial heartbeat: ${new Date().toISOString()} PID:${process.pid} BOT_DIR:${process.env.BOT_DIR || 'N/A'} PORT:${process.env.PORT || 'N/A'} TOKEN:${process.env.DISCORD_TOKEN || process.env.TOKEN ? 'present' : 'missing'} OPENAI:${process.env.OPENAI_API_KEY ? 'present' : 'missing'}`
);
setInterval(
  () => console.log(`💓 heartbeat: ${new Date().toISOString()} PID:${process.pid}`),
  30 * 1000
);
process.on('beforeExit', (code) =>
  console.log(`🧾 beforeExit with code ${code} PID:${process.pid}`)
);
process.on('exit', (code) => console.log(`🔚 Process exiting with code ${code} PID:${process.pid}`));

