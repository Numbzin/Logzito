require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");

const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
const token = process.env.TOKEN;

if (!clientId || !token) {
  console.error("❌ CLIENT_ID ou TOKEN não definidos no .env");
  process.exit(1);
}

// Verifica se "--global" foi passado como argumento
const isGlobal = process.argv.includes("--global"); // node deploy-commands.js --global
const shouldClear = process.argv.includes("--clear"); // node deploy-commands.js --clear

const rest = new REST().setToken(token);

(async () => {
  try {
    // Lógica para limpar os comandos e sair
    if (shouldClear) {
      if (isGlobal) {
        console.log("🧹 Removendo todos os comandos GLOBAIS...");
        await rest.put(Routes.applicationCommands(clientId), { body: [] });
        console.log("✅ Todos os comandos GLOBAIS foram removidos!");
      } else {
        if (!guildId) {
          console.error(
            "❌ GUILD_ID não definido no .env para limpar comandos de guilda."
          );
          process.exit(1);
        }
        console.log(`🧹 Removendo todos os comandos da guilda ${guildId}...`);
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
          body: [],
        });
        console.log("✅ Todos os comandos da guilda foram removidos!");
      }
      return;
    }

    // Lógica para registrar os comandos
    const commands = [];
    const comandosPath = path.join(__dirname, "comandos");
    const arquivosComando = fs
      .readdirSync(comandosPath)
      .filter((file) => file.endsWith(".js"));

    for (const file of arquivosComando) {
      const command = require(`./comandos/${file}`);
      if ("data" in command && "execute" in command) {
        commands.push(command.data.toJSON());
      }
    }

    if (isGlobal) {
      console.log(`🌍 Registrando ${commands.length} comandos GLOBAIS...`);
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      console.log("✅ Comandos GLOBAIS atualizados!");
    } else {
      if (!guildId) {
        console.error(
          "❌ GUILD_ID não definido no .env para deploy em guilda."
        );
        process.exit(1);
      }
      console.log(
        `🎯 Registrando ${commands.length} comandos na GUILD ${guildId}...`
      );
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commands,
      });
      console.log("✅ Comandos da GUILD atualizados!");
    }
  } catch (error) {
    console.error("❌ Erro ao atualizar comandos:", error);
  }
})();
