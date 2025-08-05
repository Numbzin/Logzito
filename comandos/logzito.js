const { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder } = require("discord.js");
const { supabase } = require("../supabaseClient");
const { criarEmbed } = require("../utils/embed");
const { ChartJSNodeCanvas } = require("chartjs-node-canvas");
const { DateTime } = require("luxon");

async function gerarGraficoAtividade(entradas) {
  const width = 800;
  const height = 400;
  const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, backgroundColour: "#2B2D31" });

  const hoje = DateTime.now().startOf("day");
  const labels = [];
  const data = [];

  for (let i = 6; i >= 0; i--) {
    const dia = hoje.minus({ days: i });
    labels.push(dia.toFormat("dd/MM"));
    const count = entradas.filter(
      (e) => DateTime.fromISO(e.data).startOf("day").equals(dia)
    ).length;
    data.push(count);
  }

  const configuration = {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Entradas nos Últimos 7 Dias",
          data: data,
          backgroundColor: "#5865F2",
          borderColor: "#FFFFFF",
          borderWidth: 2,
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: "#FFFFFF",
            stepSize: 1,
          },
          grid: {
            color: "#4E5058",
          },
        },
        x: {
          ticks: {
            color: "#FFFFFF",
          },
          grid: {
            color: "#4E5058",
          },
        },
      },
      plugins: {
        legend: {
          labels: {
            color: "#FFFFFF",
          },
        },
      },
    },
  };

  const image = await chartJSNodeCanvas.renderToBuffer(configuration);
  return new AttachmentBuilder(image, { name: "logzito-status.png" });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("logzito")
    .setDescription("Comandos principais do Logzito")
    .addSubcommand((sub) =>
      sub.setName("iniciar").setDescription("Inicia seu diário pessoal em um servidor")
    )
    .addSubcommand((sub) =>
      sub.setName("status").setDescription("Exibe suas estatísticas do diário")
    )
    .addSubcommand((sub) =>
      sub
        .setName("config")
        .setDescription("Configura os canais do bot no servidor (Admin)")
        .addChannelOption((opt) =>
          opt
            .setName("canal_comandos")
            .setDescription("Canal onde os comandos podem ser usados")
            .setRequired(true)
        )
        .addChannelOption((opt) =>
          opt
            .setName("canal_compartilhar")
            .setDescription(
              "Canal onde serão compartilhadas as entradas públicas"
            )
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("lembrar")
        .setDescription("Ativa ou desativa o lembrete diário para registrar.")
        .addBooleanOption((opt) =>
          opt
            .setName("ativar")
            .setDescription("Deseja ativar ou desativar o lembrete?")
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName("horario")
            .setDescription("Horário do lembrete (padrão 20:00, formato HH:mm)")
        )
        .addStringOption((opt) =>
          opt
            .setName("fuso")
            .setDescription("Seu fuso horário (padrão America/Sao_Paulo)")
        )
    ),
  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      const comando = interaction.options.getSubcommand();

      // --- Comandos Globais (DM e Servidor) ---

      if (comando === "status") {
        await interaction.deferReply({ ephemeral: true });

        const { data, error } = await supabase
          .from("registros")
          .select("id_local, data, compartilhado")
          .eq("usuario_id", userId)
          .order("data", { ascending: true });

        if (error || !data || data.length === 0) {
          return await interaction.editReply({
            embeds: [
              criarEmbed({
                titulo: "📭 Nenhum registro encontrado",
                descricao: "Você ainda não adicionou entradas ao seu diário.",
              }),
            ],
          });
        }

        const attachment = await gerarGraficoAtividade(data);

        const total = data.length;
        const compartilhadas = data.filter((e) => e.compartilhado).length;
        const primeira = `#${String(data[0].id_local).padStart(
          3,
          "0"
        )} (${new Date(data[0].data).toLocaleDateString()})`;
        const ultima = `#${String(data[total - 1].id_local).padStart(
          3,
          "0"
        )} (${new Date(data[total - 1].data).toLocaleDateString()})`;

        const embed = criarEmbed({
          titulo: "📊 Seu progresso com o Logzito",
          descricao: "Aqui estão as estatísticas do seu diário até agora:",
          rodape: true,
        });

        embed.addFields(
          { name: "📝 Total de entradas", value: `\`${total}\``, inline: true },
          {
            name: "📢 Compartilhadas",
            value: `\`${compartilhadas}\``,
            inline: true,
          },
          {
            name: "📅 Primeira entrada",
            value: `\`${primeira}\``,
            inline: true,
          },
          { name: "🕓 Última entrada", value: `\`${ultima}\``, inline: true }
        );
        
        embed.setImage("attachment://logzito-status.png");

        return await interaction.editReply({ embeds: [embed], files: [attachment] });
      }

      if (comando === "lembrar") {
        await interaction.deferReply({ ephemeral: true });

        const ativar = interaction.options.getBoolean("ativar");
        const horario = interaction.options.getString("horario") || "20:00";
        const fuso =
          interaction.options.getString("fuso") || "America/Sao_Paulo";

        if (!/^\d{2}:\d{2}$/.test(horario)) {
          return await interaction.editReply({
            content: "❌ Horário inválido. Use o formato `HH:mm` (ex: 20:30).",
          });
        }

        try {
          new Intl.DateTimeFormat("en-US", { timeZone: fuso });
        } catch (e) {
          return await interaction.editReply({
            content: "❌ Fuso horário inválido. Exemplo: `America/Sao_Paulo`.",
          });
        }

        const { error } = await supabase
          .from("usuarios_logzito")
          .update({
            lembrete_ativo: ativar,
            lembrete_horario: horario,
            lembrete_fuso: fuso,
          })
          .eq("usuario_id", userId);

        if (error) {
          console.error("Erro ao atualizar lembrete:", error);
          return interaction.editReply({
            content: "❌ Ocorreu um erro ao salvar sua preferência.",
          });
        }

        const embed = criarEmbed({
          titulo: ativar
            ? "🔔 Lembrete Diário Ativado!"
            : "🔕 Lembrete Diário Desativado",
          descricao: ativar
            ? `Você receberá um lembrete para registrar sua atividade todos os dias às **${horario} (${fuso})**.`
            : "Você não receberá mais o lembrete diário.",
        });

        return await interaction.editReply({ embeds: [embed] });
      }

      // --- Comandos Exclusivos de Servidor ---

      if (!interaction.guild) {
        return await interaction.reply({
          content: `❌ O comando \`/logzito ${comando}\` só pode ser usado em um servidor.`,
          ephemeral: true,
        });
      }

      if (comando === "config") {
        if (
          !interaction.member.permissions.has(PermissionFlagsBits.Administrator)
        ) {
          return await interaction.reply({
            content: "❌ Apenas administradores podem usar este comando.",
            ephemeral: true,
          });
        }

        await interaction.deferReply({ ephemeral: true });

        const canalComandos = interaction.options.getChannel("canal_comandos");
        const canalCompartilhar =
          interaction.options.getChannel("canal_compartilhar");

        if (
          !canalComandos ||
          !canalCompartilhar ||
          canalComandos.type !== 0 || // 0 = GuildText
          canalCompartilhar.type !== 0
        ) {
          return await interaction.editReply({
            embeds: [
              criarEmbed({
                titulo: "⛔ Canal inválido",
                descricao: "Selecione canais de texto válidos.",
                tipo: "erro",
              }),
            ],
          });
        }

        const { error } = await supabase.from("configuracoes_logzito").upsert({
          servidor_id: interaction.guild.id,
          canal_id: canalCompartilhar.id,
          canal_comando: canalComandos.id,
        });

        if (error) {
          console.error("Erro ao salvar configuração:", error);
          return await interaction.editReply({
            content: "❌ Ocorreu um erro ao salvar a configuração.",
          });
        }

        return await interaction.editReply({
          embeds: [
            criarEmbed({
              titulo: "✅ Canais configurados!",
              descricao:
                `Os comandos podem ser usados em: <#${canalComandos.id}>\n` +
                `As entradas públicas serão compartilhadas em: <#${canalCompartilhar.id}>`,
              tipo: "success",
            }),
          ],
        });
      }

      if (comando === "iniciar") {
        await interaction.deferReply({ ephemeral: true });

        const { data: config } = await supabase
          .from("configuracoes_logzito")
          .select("canal_comando")
          .eq("servidor_id", interaction.guild.id)
          .single();

        if (!config) {
          return await interaction.editReply({
            content:
              "❌ Este servidor ainda não foi configurado. Um administrador deve usar `/logzito config` primeiro.",
          });
        }

        const { error } = await supabase
          .from("usuarios_logzito")
          .insert({ usuario_id: userId, servidor_id: interaction.guild.id });

        if (error && error.code !== "23505") { // Ignora erro de usuário já existente
          console.error("Erro ao iniciar:", error);
          return await interaction.editReply({
            content: "❌ Erro ao registrar seu usuário. Tente novamente.",
          });
        }

        return await interaction.editReply({
          embeds: [
            criarEmbed({
              titulo: `👋 Olá, ${interaction.user.username}!`, 
              descricao:
                `Bem-vindo ao Logzito! Seu diário pessoal de dev está pronto para uso neste servidor.\n\n` +
                `Use os comandos no canal <#${config.canal_comando}>.`,
              tipo: "success",
            }),
          ],
        });
      }
    } catch (error) {
      console.error(`Erro no comando /logzito:`, error);
      const errorMessage = {
        content: "❌ Ocorreu um erro ao executar este comando.",
        ephemeral: true,
      };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage).catch(console.error);
      } else {
        await interaction.reply(errorMessage).catch(console.error);
      }
    }
  },
};