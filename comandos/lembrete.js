const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");
const { supabase } = require("../supabaseClient");
const { criarEmbed } = require("../utils/embed");

const { DateTime } = require("luxon");
/** Valida o formato do horário (HH:mm) */
function validarHorario(horario) {
  return /^\d{2}:\d{2}$/.test(horario);
}

/** Valida o fuso horário usando a API Intl */
function validarFuso(fuso) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: fuso });
    return true;
  } catch (e) {
    return false;
  }
}

async function handleAdicionar(interaction) {
  const horario = interaction.options.getString("horario");
  const mensagem = interaction.options.getString("mensagem");
  const fuso = interaction.options.getString("fuso") || "America/Sao_Paulo";

  if (!validarHorario(horario)) {
    return interaction.editReply({
      content: "❌ Horário inválido. Use o formato `HH:mm` (ex: 20:30).",
    });
  }
  if (!validarFuso(fuso)) {
    return interaction.editReply({
      content: "❌ Fuso horário inválido. Exemplo: `America/Sao_Paulo`.",
    });
  }

  // Calcula o next_send_utc inicial
  const agora = DateTime.utc();
  let proximoEnvioLocal = DateTime.fromFormat(horario, "HH:mm", {
    zone: fuso,
  });

  // Se o horário já passou para hoje, agenda para amanhã
  if (proximoEnvioLocal < agora.setZone(fuso)) {
    proximoEnvioLocal = proximoEnvioLocal.plus({ days: 1 });
  }
  const nextSendUTC = proximoEnvioLocal.toUTC().toISO();

  const { error } = await supabase.from("lembretes_logzito").insert({
    usuario_id: interaction.user.id,
    ativo: true,
    horario,
    mensagem,
    fuso,
    next_send_utc: nextSendUTC,
  });

  if (error) {
    console.error("Erro ao adicionar lembrete:", error);
    return interaction.editReply({
      content: "❌ Ocorreu um erro ao salvar seu lembrete.",
    });
  }

  await interaction.editReply({
    embeds: [
      criarEmbed({
        titulo: "✅ Lembrete Adicionado!",
        descricao: `Você será lembrado de "**${mensagem}**" todos os dias às **${horario} (${fuso})**.`,
        tipo: "success",
      }),
    ],
  });
  setTimeout(() => interaction.deleteReply().catch(() => {}), 8000);
}

async function handleListar(interaction) {
  const { data, error } = await supabase
    .from("lembretes_logzito")
    .select("*")
    .eq("usuario_id", interaction.user.id)
    .order("horario", { ascending: true });

  if (error) {
    return interaction.editReply({ content: "❌ Erro ao buscar lembretes." });
  }
  if (!data || data.length === 0) {
    return interaction.editReply({
      embeds: [
        criarEmbed({
          titulo: "📭 Nenhum Lembrete",
          descricao: "Você ainda não tem lembretes. Use `/lembrete adicionar`.",
        }),
      ],
    });
  }

  const descricao = data
    .map(
      (l) =>
        `**ID \`#${l.id}\`**: ${l.ativo ? "🔔" : "🔕"} \`${l.horario}\` - *${
          l.mensagem
        }*`
    )
    .join("\n");

  await interaction.editReply({
    embeds: [
      criarEmbed({
        titulo: "⏰ Seus Lembretes",
        descricao,
      }),
    ],
  });
}

async function handleRemover(interaction) {
  const lembreteId = interaction.options.getString("lembrete");

  const { error } = await supabase
    .from("lembretes_logzito")
    .delete()
    .eq("id", lembreteId)
    .eq("usuario_id", interaction.user.id);

  if (error) {
    return interaction.editReply({ content: "❌ Erro ao remover o lembrete." });
  }

  await interaction.editReply({
    content: `✅ Lembrete #${lembreteId} removido com sucesso.`,
  });
  setTimeout(() => interaction.deleteReply().catch(() => {}), 8000);
}

async function handleEditar(interaction) {
  const lembreteId = interaction.options.getString("lembrete");

  const { data: lembrete, error } = await supabase
    .from("lembretes_logzito")
    .select("*")
    .eq("id", lembreteId)
    .eq("usuario_id", interaction.user.id)
    .single();

  if (error || !lembrete) {
    return interaction.reply({
      content: "❌ Lembrete não encontrado ou você não tem permissão.",
      ephemeral: true,
    });
  }

  const modal = new ModalBuilder()
    .setCustomId(`lembrete_editar_modal_${lembrete.id}`)
    .setTitle(`✏️ Editando Lembrete #${lembrete.id}`);

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("mensagem")
        .setLabel("Mensagem do Lembrete")
        .setStyle(TextInputStyle.Short)
        .setValue(lembrete.mensagem)
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("horario")
        .setLabel("Horário (HH:mm)")
        .setStyle(TextInputStyle.Short)
        .setValue(lembrete.horario)
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("fuso")
        .setLabel("Fuso Horário")
        .setStyle(TextInputStyle.Short)
        .setValue(lembrete.fuso)
        .setRequired(false)
    )
  );

  await interaction.showModal(modal);
}

async function handleEditarModal(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const [_, __, ___, lembreteId] = interaction.customId.split("_");

  const mensagem = interaction.fields.getTextInputValue("mensagem");
  const horario = interaction.fields.getTextInputValue("horario");
  const fuso =
    interaction.fields.getTextInputValue("fuso") || "America/Sao_Paulo";

  if (!validarHorario(horario) || !validarFuso(fuso)) {
    return interaction.editReply({
      content: "❌ Dados inválidos. Verifique o horário e o fuso.",
    });
  }

  // Recalcula o next_send_utc após a edição
  const agora = DateTime.utc();
  let proximoEnvioLocal = DateTime.fromFormat(horario, "HH:mm", {
    zone: fuso,
  });

  // Se o horário já passou para hoje, agenda para amanhã
  if (proximoEnvioLocal < agora.setZone(fuso)) {
    proximoEnvioLocal = proximoEnvioLocal.plus({ days: 1 });
  }
  const nextSendUTC = proximoEnvioLocal.toUTC().toISO();

  const { error } = await supabase
    .from("lembretes_logzito")
    .update({ mensagem, horario, fuso, next_send_utc: nextSendUTC })
    .eq("id", lembreteId)
    .eq("usuario_id", interaction.user.id);

  if (error) {
    return interaction.editReply({ content: "❌ Erro ao salvar alterações." });
  }

  await interaction.editReply({ content: "✅ Lembrete atualizado!" });
  setTimeout(() => interaction.deleteReply().catch(() => {}), 8000);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lembrete")
    .setDescription("Gerencia seus lembretes personalizados.")
    .addSubcommand((sub) =>
      sub
        .setName("adicionar")
        .setDescription("Adiciona um novo lembrete diário.")
        .addStringOption((opt) =>
          opt
            .setName("mensagem")
            .setDescription("A mensagem que o bot enviará.")
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName("horario")
            .setDescription("Horário do lembrete (formato HH:mm, ex: 20:30).")
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName("fuso")
            .setDescription("Seu fuso horário (ex: America/Sao_Paulo).")
        )
    )
    .addSubcommand((sub) =>
      sub.setName("listar").setDescription("Lista todos os seus lembretes.")
    )
    .addSubcommand((sub) =>
      sub
        .setName("remover")
        .setDescription("Remove um lembrete específico.")
        .addStringOption((opt) =>
          opt
            .setName("lembrete")
            .setDescription("O ID do lembrete a ser removido.")
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("editar")
        .setDescription("Edita um lembrete existente.")
        .addStringOption((opt) =>
          opt
            .setName("lembrete")
            .setDescription("O ID do lembrete a ser editado.")
            .setRequired(true)
            .setAutocomplete(true)
        )
    ),

  async execute(interaction) {
    const comando = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    switch (comando) {
      case "adicionar":
        return handleAdicionar(interaction);
      case "listar":
        return handleListar(interaction);
      case "remover":
        return handleRemover(interaction);
      case "editar":
        // Modal não pode ser adiado, então a resposta é tratada dentro da função
        await interaction.deleteReply(); // Remove o "Thinking..."
        return handleEditar(interaction);
    }
  },

  async modalSubmit(interaction) {
    if (interaction.customId.startsWith("lembrete_editar_modal")) {
      await handleEditarModal(interaction);
    }
  },
};
