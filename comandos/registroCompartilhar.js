const { supabase } = require("../supabaseClient");
const { criarEmbed } = require("../utils/embed");
const { aleatoria, mensagensCompartilhar } = require("../utils/mensagens");
const { formatId, EMOJIS_REACAO } = require("./registroUtils");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

async function handleCompartilharCommand(interaction) {
  if (!interaction.guild) {
    return await interaction.editReply({
      content: "❌ Este comando só pode ser usado em um servidor.",
      ephemeral: true,
    });
  }

  const userId = interaction.user.id;
  const entradaId = parseInt(interaction.options.getString("id"));

  // Verifica se existe um canal de compartilhamento configurado
  const { data: config } = await supabase
    .from("configuracoes_logzito")
    .select("canal_id")
    .eq("servidor_id", interaction.guild.id)
    .single();

  if (!config) {
    return await interaction.editReply({
      content:
        "❌ Este servidor ainda não configurou um canal de compartilhamento. Um administrador deve usar `/logzito config` primeiro.",
      ephemeral: true,
    });
  }

  const { data, error } = await supabase
    .from("registros")
    .select("*")
    .eq("usuario_id", userId)
    .eq("id_local", entradaId)
    .maybeSingle();

  if (error || !data) {
    return await interaction.editReply({
      content: `❌ Entrada #${formatId(entradaId)} não encontrada.`,
    });
  }

  const entrada = data;

  if (entrada.compartilhado) {
    return await interaction.editReply({
      content: `⚠️ Entrada #${formatId(entradaId)} já foi compartilhada.`,
    });
  }

  const canalPublico = interaction.guild.channels.cache.get(config.canal_id);

  if (!canalPublico) {
    return await interaction.editReply({
      content:
        "❌ O canal de compartilhamento configurado não foi encontrado. Um administrador deve reconfigurar usando `/logzito config`.",
      ephemeral: true,
    });
  }

  // Cria uma mensagem mais completa para compartilhamento
  const embedCompartilhada = criarEmbed({
    titulo: `✨ Entrada compartilhada por ${interaction.user.username}`,
    descricao: `${entrada.titulo ? `📑 **${entrada.titulo}**\n\n` : ""}${
      entrada.mensagem
    }${
      entrada.tags?.length > 0
        ? `\n\n🏷️ **Tags:** ${entrada.tags.map((t) => `\`${t}\``).join(", ")}`
        : ""
    }${entrada.link ? `\n\n🔗 **Link:** ${entrada.link}` : ""}`,
    imagem: entrada.anexo_url,
    rodape: true,
  });
  // Adiciona um rodapé amigável com o nome do autor
  embedCompartilhada.setFooter({
    text: `Entrada de ${interaction.user.username}`,
  });

  // Cria os botões de interação (reação e comentário) para serem consistentes com o resto do bot
  const rows = [];
  const reactionButtons = EMOJIS_REACAO.map((emoji) =>
    new ButtonBuilder()
      .setCustomId(`registro_react_${entrada.id_local}_${userId}_${emoji}`)
      .setEmoji(emoji)
      .setStyle(ButtonStyle.Secondary)
  );

  // Divide os botões de reação em linhas de 4 para não exceder o limite
  for (let i = 0; i < reactionButtons.length; i += 4) {
    rows.push(
      new ActionRowBuilder().addComponents(reactionButtons.slice(i, i + 4))
    );
  }

  // Adiciona o botão de comentar em uma nova linha
  const commentRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`registro_comment_${entrada.id_local}_${userId}`)
      .setLabel("Adicionar Comentário")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("💬")
  );
  rows.push(commentRow);

  const sentMessage = await canalPublico.send({
    embeds: [embedCompartilhada],
    components: rows,
  });

  // Marca a entrada como compartilhada e armazena o ID da mensagem
  const { error: updateError } = await supabase
    .from("registros")
    .update({ compartilhado: true, shared_message_id: sentMessage.id })
    .eq("usuario_id", userId)
    .eq("id_local", entrada.id_local);

  if (updateError) {
    console.error(
      "Erro ao salvar o ID da mensagem compartilhada:",
      updateError
    );
    return await interaction.editReply({
      content:
        "❌ Erro ao finalizar o compartilhamento. A mensagem foi enviada, mas pode não ser rastreável.",
    });
  }

  // Confirma o compartilhamento
  await interaction.editReply({
    embeds: [
      criarEmbed({
        titulo: aleatoria(mensagensCompartilhar),
        descricao: `Sua entrada foi compartilhada com sucesso em <#${config.canal_id}>!`,
        tipo: "success",
      }),
    ],
  });
  setTimeout(() => interaction.deleteReply().catch(() => {}), 8000);
}

module.exports = {
  handleCompartilharCommand,
};
