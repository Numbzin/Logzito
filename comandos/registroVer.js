const { supabase } = require("../supabaseClient");
const { criarEmbed } = require("../utils/embed");
const { aleatoria, mensagensStatus } = require("../utils/mensagens");
const { formatId } = require("./registroUtils");

const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const MAX_DESC_LENGTH = 4096;

async function handleVerCommand(interaction) {
  const userId = interaction.user.id;
  const entradaId = interaction.options.getInteger("id");
  let page = interaction.options.getInteger("pagina") || 1;
  const perPage = interaction.options.getInteger("por_pagina") || 5;

  if (entradaId) {
    const { data: entrada, error } = await supabase
      .from("registros")
      .select("*")
      .eq("usuario_id", userId)
      .eq("id_local", entradaId)
      .single();

    if (error || !entrada) {
      return await interaction.editReply({
        content: `❌ Entrada #${formatId(entradaId)} não encontrada.`,
        ephemeral: true,
      });
    }

    const { data: comentarios } = await supabase
      .from("comentarios_logzito")
      .select("usuario_id, mensagem, data")
      .eq("entrada_id", entrada.id_local)
      .order("data", { ascending: true });

    let comentariosFormatados = "";
    if (comentarios && comentarios.length > 0) {
      for (const c of comentarios) {
        let userName = "Usuário Desconhecido";
        try {
          const user = await interaction.client.users.fetch(c.usuario_id);
          userName = user.username;
        } catch (e) {
          console.warn(`Não foi possível buscar o usuário ${c.usuario_id}:`, e.message);
        }
        comentariosFormatados += `> 💬 **${userName}:** ${c.mensagem}\n`;
      }
    }

    const fullContent = `🆔 \`#${formatId(entrada.id_local)}\`\n🗓️ *${new Date(
      entrada.data
    ).toLocaleString()}*${entrada.titulo ? `\n📑 **${entrada.titulo}**` : ""}${entrada.tags?.length > 0 ? `\n🏷️ ${entrada.tags.map((t) => `\`${t}\``).join(", ")}` : ""}\n\n${entrada.mensagem}${entrada.link ? `\n\n🔗 **Link:** ${entrada.link}` : ""}${comentariosFormatados ? `\n\n${comentariosFormatados}` : ""}`;

    const pages = [];
    for (let i = 0; i < fullContent.length; i += MAX_DESC_LENGTH) {
      pages.push(fullContent.substring(i, i + MAX_DESC_LENGTH));
    }

    const totalPages = pages.length;
    const currentPage = Math.min(Math.max(page, 1), totalPages);

    const embed = criarEmbed({
      titulo: aleatoria(mensagensStatus),
      descricao: pages[currentPage - 1],
      imagem: entrada.anexo_url,
      rodape: totalPages > 1 ? { text: `Página ${currentPage} de ${totalPages}` } : false,
    });

    const components = [];
    if (totalPages > 1) {
      const paginationRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`registro_ver_prev_${entradaId}_${currentPage - 1}`)
          .setLabel("◀️ Anterior")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPage === 1),
        new ButtonBuilder()
          .setCustomId(`registro_ver_next_${entradaId}_${currentPage + 1}`)
          .setLabel("Próximo ▶️")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPage === totalPages)
      );
      components.push(paginationRow);
    }

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`registro_ver_editar_${entradaId}`)
        .setLabel("Editar")
        .setStyle(ButtonStyle.Success)
        .setEmoji("✏️"),
      new ButtonBuilder()
        .setCustomId(`registro_ver_excluir_${entradaId}`)
        .setLabel("Excluir")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🗑️")
    );
    components.push(actionRow);

    return await interaction.editReply({ embeds: [embed], components });
  }

  const { count, error: countError } = await supabase
    .from("registros")
    .select("*", { count: "exact" })
    .eq("usuario_id", userId);

  if (countError) {
    console.error("Erro ao contar entradas:", countError);
    return await interaction.editReply({
      content: "❌ Erro ao buscar suas entradas.",
      ephemeral: true,
    });
  }
  const totalEntries = count;

  const totalPages = Math.ceil(totalEntries / perPage);
  if (page > totalPages && totalPages > 0) {
    page = totalPages;
  } else if (page < 1) {
    page = 1;
  }

  const offset = (page - 1) * perPage;

  const { data: resultado, error: fetchError } = await supabase
    .from("registros")
    .select("*")
    .eq("usuario_id", userId)
    .order("data", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (fetchError) {
    console.error("Erro ao buscar entradas:", fetchError);
    return await interaction.editReply({
      content: "❌ Erro ao buscar suas entradas.",
      ephemeral: true,
    });
  }
  const data = resultado;

  if (!data || data.length === 0) {
    return await interaction.editReply({
      embeds: [
        criarEmbed({
          titulo: "📭 Nenhuma entrada encontrada",
          descricao: "Você ainda não registrou nada no seu diário.",
        }),
      ],
    });
  }

  const files = [];

  const respostaArray = await Promise.all(
    data.map(async (e) => {
      const { data: comentarios } = await supabase
        .from("comentarios_logzito")
        .select("usuario_id, mensagem, data")
        .eq("entrada_id", e.id_local)
        .order("data", { ascending: true });

      let comentariosFormatados = "";
      if (comentarios && comentarios.length > 0) {
        for (const c of comentarios) {
          let userName = "Usuário Desconhecido";
          try {
            const user = await interaction.client.users.fetch(c.usuario_id);
            userName = user.username;
          } catch (e) {
            console.warn(
              `Não foi possível buscar o usuário ${c.usuario_id} (pode ter saído do servidor):`,
              e.message
            );
          }
          comentariosFormatados += `> 💬 **${userName}:** ${c.mensagem}\n`;
        }
      }

      let mensagem = `🆔 \`#${formatId(e.id_local)}\`\n🗓️ *${new Date(
        e.data
      ).toLocaleString()}*`;

      if (e.titulo) {
        mensagem += `\n📑 **${e.titulo}**`;
      }

      if (e.tags?.length > 0) {
        mensagem += `\n🏷️ ${e.tags.map((t) => `\`${t}\``).join(", ")}`;
      }

      mensagem += `\n\n${e.mensagem}`;

      if (e.link) {
        mensagem += `\n\n🔗 **Link:** ${e.link}`;
      }

      if (e.anexo_url) {
        const isImage = e.anexo_url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
        const isVideo = e.anexo_url.match(/\.(mp4|webm|mov)$/i);

        if (isImage) {
          mensagem += `\n\n🖼️ **Imagem:**`;
        } else if (isVideo) {
          mensagem += `\n\n🎥 **Vídeo:**`;
          files.push(e.anexo_url);
        } else {
          mensagem += `\n\n📎 **Anexo:** Abrir`;
        }
      }

      if (comentariosFormatados) {
        mensagem += `\n\n${comentariosFormatados}`;
      }

      return {
        content: mensagem,
        image: e.anexo_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
          ? e.anexo_url
          : null,
      };
    })
  );

  const embeds = respostaArray.map(({ content, image }) =>
    criarEmbed({
      titulo: aleatoria(mensagensStatus),
      descricao: content,
      imagem: image,
      rodape: false,
    })
  );

  const components = [];
  if (totalEntries > perPage) {
    const paginationRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`registro_ver_prev_${page - 1}_${perPage}`)
        .setLabel("◀️ Anterior")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === 1),
      new ButtonBuilder()
        .setCustomId(`registro_ver_next_${page + 1}_${perPage}`)
        .setLabel("Próximo ▶️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === totalPages)
    );
    components.push(paginationRow);

    if (embeds.length > 0) {
      embeds[embeds.length - 1].setFooter({
        text: `Página ${page} de ${totalPages} | Total de entradas: ${totalEntries}`,
      });
    }
  }

  await interaction.editReply({ embeds, files, components });
}

async function handleVerButtonInteraction(interaction) {
  await interaction.deferUpdate();

  const [_, __, action, entryId, page] = interaction.customId.split("_");
  const userId = interaction.user.id;

  if (action === "prev" || action === "next") {
    const { data: entrada, error } = await supabase
      .from("registros")
      .select("*")
      .eq("usuario_id", userId)
      .eq("id_local", entryId)
      .single();

    if (error || !entrada) {
      return await interaction.editReply({
        content: `❌ Entrada #${formatId(entryId)} não encontrada.`,
        ephemeral: true,
      });
    }

    const { data: comentarios } = await supabase
      .from("comentarios_logzito")
      .select("usuario_id, mensagem, data")
      .eq("entrada_id", entrada.id_local)
      .order("data", { ascending: true });

    let comentariosFormatados = "";
    if (comentarios && comentarios.length > 0) {
      for (const c of comentarios) {
        let userName = "Usuário Desconhecido";
        try {
          const user = await interaction.client.users.fetch(c.usuario_id);
          userName = user.username;
        } catch (e) {
          console.warn(`Não foi possível buscar o usuário ${c.usuario_id}:`, e.message);
        }
        comentariosFormatados += `> 💬 **${userName}:** ${c.mensagem}\n`;
      }
    }

    const fullContent = `🆔 \`#${formatId(entrada.id_local)}\`\n🗓️ *${new Date(
      entrada.data
    ).toLocaleString()}*${entrada.titulo ? `\n📑 **${entrada.titulo}**` : ""}${entrada.tags?.length > 0 ? `\n🏷️ ${entrada.tags.map((t) => `\`${t}\``).join(", ")}` : ""}\n\n${entrada.mensagem}${entrada.link ? `\n\n🔗 **Link:** ${entrada.link}` : ""}${comentariosFormatados ? `\n\n${comentariosFormatados}` : ""}`;

    const pages = [];
    for (let i = 0; i < fullContent.length; i += MAX_DESC_LENGTH) {
      pages.push(fullContent.substring(i, i + MAX_DESC_LENGTH));
    }

    const totalPages = pages.length;
    const currentPage = Math.min(Math.max(parseInt(page), 1), totalPages);

    const embed = criarEmbed({
      titulo: aleatoria(mensagensStatus),
      descricao: pages[currentPage - 1],
      imagem: entrada.anexo_url,
      rodape: totalPages > 1 ? { text: `Página ${currentPage} de ${totalPages}` } : false,
    });

    const components = [];
    if (totalPages > 1) {
      const paginationRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`registro_ver_prev_${entryId}_${currentPage - 1}`)
          .setLabel("◀️ Anterior")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPage === 1),
        new ButtonBuilder()
          .setCustomId(`registro_ver_next_${entryId}_${currentPage + 1}`)
          .setLabel("Próximo ▶️")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPage === totalPages)
      );
      components.push(paginationRow);
    }

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`registro_ver_editar_${entryId}`)
        .setLabel("Editar")
        .setStyle(ButtonStyle.Success)
        .setEmoji("✏️"),
      new ButtonBuilder()
        .setCustomId(`registro_ver_excluir_${entryId}`)
        .setLabel("Excluir")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🗑️")
    );
    components.push(actionRow);

    await interaction.editReply({ embeds: [embed], components });
  }
}

module.exports = {
  handleVerCommand,
  handleVerButtonInteraction,
};