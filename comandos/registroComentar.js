const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { supabase } = require("../supabaseClient");
const { criarEmbed } = require("../utils/embed");
const {
  formatId,
  EMOJIS_REACAO,
  updateMessageWithComments,
} = require("./registroUtils");

async function handleComentarCommand(interaction) {
  const userId = interaction.user.id;
  const entradaId = interaction.options.getInteger("id");
  const mensagem = interaction.options.getString("mensagem");

  // Busca a entrada
  const { data: entrada } = await supabase
    .from("registros")
    .select("*")
    .eq("usuario_id", userId)
    .eq("id_local", entradaId)
    .single();

  if (!entrada) {
    return await interaction.editReply({
      content: `❌ Entrada #${formatId(entradaId)} não encontrada.`,
      ephemeral: true,
    });
  }

  // Busca comentários existentes
  const { data: comentarios } = await supabase
    .from("comentarios_logzito")
    .select("usuario_id, mensagem, data")
    .eq("entrada_id", entradaId)
    .order("created_at", { ascending: true });

  // Busca reações existentes
  const { data: reacoes } = await supabase
    .from("reacoes_logzito")
    .select("emoji")
    .eq("entrada_id", entradaId);

  // Cria o embed com a entrada e comentários
  let descricao = "";
  if (entrada.titulo) {
    descricao += `📑 **${entrada.titulo}**\n\n`;
  }
  descricao += `${entrada.mensagem}\n\n`;

  if (entrada.link) {
    descricao += `\n\n🔗 **Link:** ${entrada.link}\n\n`;
  }

  // Adiciona contagem de reações
  if (reacoes?.length > 0) {
    const contagemReacoes = reacoes.reduce((acc, r) => {
      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
      return acc;
    }, {});

    descricao += "**Reações:**\n";
    for (const [emoji, count] of Object.entries(contagemReacoes)) {
      descricao += `${emoji} ${count}  `;
    }
    descricao += "\n\n";
  }

  // Adiciona comentários
  if (comentarios?.length > 0) {
    descricao += "**Comentários:**\n";
    for (const c of comentarios) {
      let userName = "Usuário Desconhecido";
      try {
        const user = await interaction.client.users.fetch(c.usuario_id);
        userName = user.username;
      } catch (e) {
        console.error(`Não foi possível buscar o usuário ${c.usuario_id}:`, e);
      }
      descricao += `> 💬 **${userName}:** ${c.mensagem}\n`;
    }
  }

  const embed = criarEmbed({
    titulo: `💬 Entrada #${formatId(entrada.id_local)}`,
    descricao,
    imagem: entrada.anexo_url,
    rodape: true,
  });

  let authorUsername = "Usuário Desconhecido";
  try {
    const authorUser = await interaction.client.users.fetch(userId);
    authorUsername = authorUser.username;
  } catch (e) {
    console.error(`Não foi possível buscar o autor ${userId}:`, e);
  }
  embed.setFooter({ text: `Entrada de ${authorUsername}` });

  // Cria botões de reação
  const rows = [];
  const reactionButtons = EMOJIS_REACAO.map((emoji) =>
    new ButtonBuilder()
      .setCustomId(`registro_react_${entradaId}_${userId}_${emoji}`)
      .setEmoji(emoji)
      .setStyle(ButtonStyle.Secondary)
  );

  // Divide os botões em linhas de 4
  for (let i = 0; i < reactionButtons.length; i += 4) {
    rows.push(
      new ActionRowBuilder().addComponents(reactionButtons.slice(i, i + 4))
    );
  }

  // Adiciona botão de comentar
  const commentRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`registro_comment_${entradaId}_${userId}`)
      .setLabel("Adicionar Comentário")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("💬")
  );
  rows.push(commentRow);

  // Se foi fornecida uma mensagem, já adiciona o comentário
  if (mensagem) {
    await supabase.from("comentarios_logzito").insert({
      usuario_id: interaction.user.id,
      entrada_id: entradaId,
      mensagem,
      data: new Date().toISOString(),
    });

    await interaction.editReply({
      content: "✅ Comentário adicionado! Aqui está a entrada completa:",
      embeds: [embed],
      components: rows,
    });
  } else {
    await interaction.editReply({
      embeds: [embed],
      components: rows,
    });
  }
}

async function handleCommentModalSubmit(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const [_, __, ___, entradaId, originalAuthorId] =
    interaction.customId.split("_");
  const comentario = interaction.fields.getTextInputValue("comentario");

  // Add comment
  await supabase.from("comentarios_logzito").insert({
    usuario_id: interaction.user.id,
    entrada_id: entradaId,
    mensagem: comentario,
    data: new Date().toISOString(),
  });

  // Busca a entrada para obter o ID do autor original e o ID da mensagem compartilhada
  const { data: entryData, error: entryError } = await supabase
    .from("registros")
    .select("usuario_id, compartilhado, shared_message_id")
    .eq("usuario_id", originalAuthorId)
    .eq("id_local", entradaId)
    .single();

  if (entryError || !entryData) {
    console.error(
      "Erro ao buscar entrada para atualização de comentário:",
      entryError
    );
    await interaction.editReply({
      content: "❌ Erro ao atualizar a entrada após o comentário.",
      ephemeral: true,
    });
    setTimeout(() => interaction.deleteReply().catch(() => {}), 8000);
    return;
  }

  let messageToUpdate = null;

  // Se a entrada foi compartilhada, tenta buscar a mensagem no canal público
  if (interaction.guild && entryData.compartilhado && entryData.shared_message_id) {
    try {
      const { data: config } = await supabase
        .from("configuracoes_logzito")
        .select("canal_id")
        .eq("servidor_id", interaction.guild.id)
        .single();
      if (config && config.canal_id) {
        const publicChannel = await interaction.client.channels.fetch(
          config.canal_id
        );
        if (publicChannel && publicChannel.isTextBased()) {
          messageToUpdate = await publicChannel.messages.fetch(
            entryData.shared_message_id
          );
        }
      }
    } catch (fetchError) {
      console.warn(
        `Não foi possível buscar a mensagem compartilhada ${entryData.shared_message_id}:`,
        fetchError
      );
    }
  }

  // Atualiza a mensagem correta (compartilhada ou efêmera)
  if (messageToUpdate) {
    await updateMessageWithComments(
      interaction.client,
      messageToUpdate,
      entradaId,
      originalAuthorId
    );
  } else {
    // Fallback para interações privadas ou se a mensagem compartilhada não for encontrada
    await updateMessageWithComments(
      interaction.client,
      interaction.message,
      entradaId,
      interaction.user.id
    );
  }

  await interaction.editReply({
    content: "✅ Comentário adicionado com sucesso!",
    ephemeral: true,
  });
  setTimeout(() => interaction.deleteReply().catch(() => {}), 8000);
}

async function handleReactButtonInteraction(interaction) {
  const [_, __, entradaId, originalAuthorId, emoji] =
    interaction.customId.split("_");

  // Verifica se o usuário já reagiu com este emoji
  const { data: existingReaction } = await supabase
    .from("reacoes_logzito")
    .select("*")
    .eq("usuario_id", interaction.user.id)
    .eq("entrada_id", entradaId)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existingReaction) {
    // Remove a reação
    await supabase
      .from("reacoes_logzito")
      .delete()
      .eq("id", existingReaction.id);

    await interaction.reply({
      content: `${emoji} Reação removida!`,
      ephemeral: true,
    });
    setTimeout(() => interaction.deleteReply().catch(() => {}), 8000);
  } else {
    // Adiciona a reação
    await supabase.from("reacoes_logzito").insert({
      usuario_id: interaction.user.id,
      entrada_id: entradaId,
      emoji,
    });

    await interaction.reply({
      content: `${emoji} Reação adicionada!`,
      ephemeral: true,
    });
    setTimeout(() => interaction.deleteReply().catch(() => {}), 8000);
  }

  // Atualiza a mensagem original
  await updateMessageWithComments(
    interaction.client,
    interaction.message,
    entradaId,
    originalAuthorId
  );
}

async function handleCommentButtonInteraction(interaction) {
  const [_, __, entradaId, originalAuthorId] = interaction.customId.split("_");

  const modal = new ModalBuilder()
    .setCustomId(`registro_modal_comment_${entradaId}_${originalAuthorId}`)
    .setTitle("💬 Adicionar Comentário");

  const comentarioInput = new TextInputBuilder()
    .setCustomId("comentario")
    .setLabel("Seu comentário")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("Escreva seu comentário aqui...")
    .setRequired(true)
    .setMaxLength(1000);

  const row = new ActionRowBuilder().addComponents(comentarioInput);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

module.exports = {
  handleComentarCommand,
  handleCommentModalSubmit,
  handleReactButtonInteraction,
  handleCommentButtonInteraction,
};
