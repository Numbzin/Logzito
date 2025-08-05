const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { supabase } = require("../supabaseClient");
const { criarEmbed } = require("../utils/embed");
const { formatId } = require("./registroUtils");

/**
 * Mostra uma mensagem de confirmação para excluir uma entrada.
 * @param {import('discord.js').Interaction} interaction A interação que iniciou o comando.
 * @param {number} entradaId O ID local da entrada a ser excluída.
 */
async function showDeleteConfirmation(interaction, entradaId) {
  await interaction.deferUpdate();

  const { data: entrada, error } = await supabase
    .from("registros")
    .select("id_local")
    .eq("usuario_id", interaction.user.id)
    .eq("id_local", entradaId)
    .single();

  if (error || !entrada) {
    const reply = {
      content: `❌ Entrada #${formatId(
        entradaId
      )} não encontrada ou você não tem permissão para excluí-la.`,
      ephemeral: true,
    };
    return interaction.editReply(reply);
  }

  const embed = criarEmbed({
    titulo: "⚠️ Confirmação de Exclusão",
    descricao: `Você tem certeza que deseja excluir permanentemente a entrada #${formatId(
      entradaId
    )}? **Esta ação não pode ser desfeita.**`,
    cor: 0xffcc00, // Amarelo
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`registro_excluir_confirmar_${entradaId}`)
      .setLabel("Confirmar Exclusão")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("cancelar_acao") // Botão genérico de cancelamento
      .setLabel("Cancelar")
      .setStyle(ButtonStyle.Secondary)
  );

  const reply = { embeds: [embed], components: [row] };
  return interaction.editReply(reply);
}

/**
 * Lida com o clique no botão de confirmação de exclusão.
 * @param {import('discord.js').ButtonInteraction} interaction A interação do botão.
 */
async function handleExcluirConfirmButton(interaction) {
  await interaction.deferUpdate();

  const [_, __, ___, entradaId] = interaction.customId.split("_");

  // Busca a entrada para verificar se foi compartilhada
  const { data: entrada } = await supabase
    .from("registros")
    .select("compartilhado, shared_message_id")
    .eq("usuario_id", interaction.user.id)
    .eq("id_local", entradaId)
    .single();

  // Se a entrada foi compartilhada, tenta apagar a mensagem pública
  if (entrada && entrada.compartilhado && entrada.shared_message_id) {
    try {
      const { data: config } = await supabase
        .from("configuracoes_logzito")
        .select("canal_id")
        .eq("servidor_id", interaction.guild.id)
        .single();

      if (config && config.canal_id) {
        const canalPublico = await interaction.client.channels.fetch(
          config.canal_id
        );
        if (canalPublico.isTextBased()) {
          const mensagemPublica = await canalPublico.messages.fetch(
            entrada.shared_message_id
          );
          await mensagemPublica.delete();
        }
      }
    } catch (err) {
      // Ignora erros (ex: mensagem já deletada, canal não existe mais)
      console.warn(
        `Não foi possível apagar a mensagem pública para a entrada ${entradaId}: ${err.message}`
      );
    }
  }

  // 1. Excluir reações associadas
  await supabase.from("reacoes_logzito").delete().eq("entrada_id", entradaId);

  // 2. Excluir comentários associados
  await supabase
    .from("comentarios_logzito")
    .delete()
    .eq("entrada_id", entradaId);

  // 3. Excluir a entrada principal
  const { error } = await supabase
    .from("registros")
    .delete()
    .eq("usuario_id", interaction.user.id)
    .eq("id_local", entradaId);

  if (error) {
    console.error("Erro ao excluir entrada:", error);
    return await interaction.editReply({
      content: "❌ Ocorreu um erro ao excluir a entrada.",
      components: [],
    });
  }

  const embed = criarEmbed({
    titulo: "🗑️ Entrada Excluída",
    descricao: `A entrada #${formatId(entradaId)} foi excluída com sucesso.`,
    tipo: "success",
  });

  await interaction.editReply({
    embeds: [embed],
    components: [],
  });
  setTimeout(() => {
    interaction.deleteReply().catch((err) => {
      // Ignora erros se a interação ou a resposta já não existirem.
      if (err.code !== 10062 && err.code !== 10008) {
        console.error("Falha ao deletar a resposta da exclusão:", err);
      }
    });
  }, 8000);
}

module.exports = {
  showDeleteConfirmation,
  handleExcluirConfirmButton,
};
