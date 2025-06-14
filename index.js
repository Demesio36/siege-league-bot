const { Client, GatewayIntentBits, Partials, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, Events } = require('discord.js');
const nodemailer = require('nodemailer');
const express = require('express');
const app = express();
app.use(express.json());

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.once('ready', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

function sendEmail(fromUser, toUser, offered, requested) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: 'demesioserrano89@gmail.com',
    subject: 'Trade Accepted Notification',
    text: `${toUser} accepted a trade from ${fromUser}.

Operator Given: ${requested}
Operator Received: ${offered}`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) return console.error('❌ Email Error:', error);
    console.log('📧 Email sent:', info.response);
  });
}

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  const embed = interaction.message.embeds[0];
  const fields = embed.fields;
  const fromUser = fields.find(f => f.name === "From").value;
  const toUser = fields.find(f => f.name === "To").value;
  const offered = fields.find(f => f.name === "Offered").value;
  const requested = fields.find(f => f.name === "Requested").value;

  if (interaction.user.username !== toUser) {
    return await interaction.reply({ content: '❌ Only the requested user can respond to this trade.', ephemeral: true });
  }

  if (interaction.customId === 'accept') {
    await interaction.reply({ content: `✅ Trade accepted!`, ephemeral: true });
    sendEmail(fromUser, toUser, offered, requested);
  } else if (interaction.customId === 'decline') {
    await interaction.reply({ content: `❌ Trade declined.`, ephemeral: true });
  }
});

app.post('/send-trade', async (req, res) => {
  const { fromUser, toUser, offeredOperator, requestedOperator } = req.body;

  try {
    const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);

    const tradeEmbed = new EmbedBuilder()
      .setTitle("💱 Trade Request")
      .addFields(
        { name: "From", value: fromUser },
        { name: "To", value: toUser },
        { name: "Offered", value: offeredOperator },
        { name: "Requested", value: requestedOperator }
      )
      .setColor(0x58a6ff);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("accept")
        .setLabel("Accept")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("decline")
        .setLabel("Decline")
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({ embeds: [tradeEmbed], components: [row] });
    res.send("✅ Trade message sent to Discord");
  } catch (err) {
    console.error('❌ Failed to send trade:', err);
    res.status(500).send("❌ Failed to send trade to Discord");
  }
});

app.listen(3000, () => {
  console.log("🌐 Express server running on port 3000");
});

client.login(process.env.DISCORD_BOT_TOKEN);
