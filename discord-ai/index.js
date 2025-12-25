
require('dotenv').config();
const { Client, GatewayIntentBits } = require("discord.js");
const OpenAI = require("openai");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // your OpenAI key
});

// Helper: chance for rare random messages (e.g. 2%)
function randomChance(percent) {
  return Math.random() < percent / 100;
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const mentionedBot = message.mentions.has(client.user);
  const repliedToBot = message.reference
    ? (await message.fetchReference()).author.id === client.user.id
    : false;

  // 1. If bot is mentioned OR someone replies to bot
  if (mentionedBot || repliedToBot) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: message.content }],
      });

      const reply = response.choices[0].message.content;
      await message.reply(reply);
    } catch (err) {
      console.error(err);
      await message.reply("🤖 Oops, I couldn't think of a reply.");
    }
  }

  // 2. Rare chance to send random message
  if (randomChance(2)) { // 2% chance
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Say something random and fun." }],
      });

      const randomMsg = response.choices[0].message.content;
      await message.channel.send(randomMsg);
    } catch (err) {
      console.error(err);
    }
  }
});


client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);