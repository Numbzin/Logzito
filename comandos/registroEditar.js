const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");
const { supabase } = require("../supabaseClient");
const { criarEmbed } = require("../utils/embed");
const { formatId } = require("./registroUtils");

/**
 * Mostra um modal para editar uma entrada existente.
 * @param {import('discord.js').Interaction} interaction A interação que iniciou o comando.
 * @param {number} entradaId O ID local da entrada a ser editada.
 */
async function showEditModal(interaction, entradaId) {
  const { data: entrada, error } = await supabase
    .from("registros")
    .select("titulo, mensagem")
    .eq("usuario_id", interaction.user.id)
    .eq("id_local", entradaId)
    .single();

  if (error || !entrada) {
    const reply = {
      content: `❌ Entrada #${formatId(
        entradaId
      )} não encontrada ou você não tem permissão para editá-la.`,
      ephemeral: true,
    };
    // Modals não podem ser respondidos com deferReply, então verificamos o estado da interação.
    if (interaction.isButton()) {
      return interaction.reply(reply);
    }
    return interaction.replied || interaction.deferred
      ? interaction.editReply(reply)
      : interaction.reply(reply);
  }

  const modal = new ModalBuilder()
    .setCustomId(`registro_editar_modal_${entradaId}`)
    .setTitle(`✍️ Editando Entrada #${formatId(entradaId)}`);

  const tituloInput = new TextInputBuilder()
    .setCustomId("titulo")
    .setLabel("Título (opcional)")
    .setStyle(TextInputStyle.Short)
    .setValue(entrada.titulo || "")
    .setRequired(false)
    .setMaxLength(100);

  const conteudoInput = new TextInputBuilder()
    .setCustomId("conteudo")
    .setLabel("Conteúdo")
    .setStyle(TextInputStyle.Paragraph)
    .setValue(entrada.mensagem)
    .setRequired(true)
    .setMaxLength(4000);

  modal.addComponents(
    new ActionRowBuilder().addComponents(tituloInput),
    new ActionRowBuilder().addComponents(conteudoInput)
  );

  await interaction.showModal(modal);
}

/**
 * Lida com o envio do modal de edição.
 * @param {import('discord.js').ModalSubmitInteraction} interaction A interação do modal.
 */
async function handleEditarModalSubmit(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const [_, __, ___, entradaId] = interaction.customId.split("_");
  const titulo = interaction.fields.getTextInputValue("titulo");
  const conteudo = interaction.fields.getTextInputValue("conteudo");

  const { error } = await supabase
    .from("registros")
    .update({ titulo: titulo, mensagem: conteudo })
    .eq("usuario_id", interaction.user.id)
    .eq("id_local", entradaId);

  if (error) {
    console.error("Erro ao editar entrada:", error);
    return await interaction.editReply({
      content: "❌ Ocorreu um erro ao salvar suas alterações.",
      ephemeral: true,
    });
  }

  const embed = criarEmbed({
    titulo: "✅ Entrada Atualizada!",
    descricao: `Sua entrada #${formatId(
      entradaId
    )} foi atualizada com sucesso.`,
    tipo: "success",
  });

  await interaction.editReply({
    embeds: [embed],
    ephemeral: true,
  });
  setTimeout(() => interaction.deleteReply().catch(() => {}), 8000);
}

module.exports = {
  showEditModal,
  handleEditarModalSubmit,
};
