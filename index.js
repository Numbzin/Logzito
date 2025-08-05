// index.js
require("dotenv").config();
const { iniciarLembrete } = require("./handlers/reminderScheduler");
const {
  Client,
  GatewayIntentBits,
  Collection,
  InteractionType,
  Partials,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const { supabase } = require("./supabaseClient");
const { handleAutocomplete } = require("./handlers/autocompleteHandler");

// Criação do bot
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

client.commands = new Collection();

// Carregar comandos da pasta comandos/
const comandosPath = path.join(__dirname, "comandos");
const arquivosComando = fs
  .readdirSync(comandosPath)
  .filter((arquivo) => arquivo.endsWith(".js"));

for (const arquivo of arquivosComando) {
  const comando = require(`./comandos/${arquivo}`);
  if ("data" in comando && "execute" in comando) {
    client.commands.set(comando.data.name, comando);
  }
}

// Evento quando o bot estiver online
client.once("ready", () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
  iniciarLembrete(client);
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isAutocomplete()) {
      return await handleAutocomplete(interaction);
    }

    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        console.error(`Comando não encontrado: ${interaction.commandName}`);
        return;
      }
      return await command.execute(interaction);
    }

    if (interaction.isButton() || interaction.type === InteractionType.ModalSubmit) {
      const [commandName] = interaction.customId.split("_");
      const command = client.commands.get(commandName);

      if (!command) {
        console.error(`Nenhum comando encontrado para o customId: ${interaction.customId}`);
        return;
      }

      if (interaction.isButton() && typeof command.handleButton === "function") {
        return await command.handleButton(interaction);
      }

      if (interaction.type === InteractionType.ModalSubmit && typeof command.handleModal === "function") {
        return await command.handleModal(interaction);
      }
    }
  } catch (error) {
    console.error("Erro geral na interação:", error);

    const errorMessage = {
      content: "❌ Ocorreu um erro ao processar sua solicitação.",
      ephemeral: true,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage).catch(console.error);
    } else {
      await interaction.reply(errorMessage).catch(console.error);
    }
  }
});

client.login(process.env.TOKEN);
