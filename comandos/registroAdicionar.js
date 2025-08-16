const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");
const { supabase } = require("../supabaseClient");
const { criarEmbed } = require("../utils/embed");
const { aleatoria, mensagensRegistro } = require("../utils/mensagens");
const { formatId, criarPreviewEntrada } = require("./registroUtils");
const fetch = require("node-fetch");

async function handleAdicionarCommand(interaction) {
  const rawTags = interaction.options.getString("tags");
  const link = interaction.options.getString("link");

  const tags = rawTags
    ? rawTags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t)
    : [];

  const tempEntry = {
    titulo: null,
    conteudo: null,
    tags,
    link: link || null,
    anexo_url: null,
  };

  if (!interaction.client.tempEntries) {
    interaction.client.tempEntries = new Map();
  }
  interaction.client.tempEntries.set(interaction.user.id, tempEntry);

  const modal = new ModalBuilder()
    .setCustomId(`registro_adicionar`)
    .setTitle("✍️ Diário");

  const tituloInput = new TextInputBuilder()
    .setCustomId("titulo")
    .setLabel("Título (opcional)")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Um título breve para sua entrada")
    .setRequired(false)
    .setMaxLength(100);

  const conteudoInput = new TextInputBuilder()
    .setCustomId("conteudo")
    .setLabel("Conteúdo")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("Escreva aqui sua reflexão, aprendizado ou experiência...")
    .setRequired(true)
    .setMaxLength(4000);

  const primeiraRow = new ActionRowBuilder().addComponents(tituloInput);
  const segundaRow = new ActionRowBuilder().addComponents(conteudoInput);
  modal.addComponents(primeiraRow, segundaRow);

  return await interaction.showModal(modal);
}

async function handleAdicionarModalSubmit(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const titulo = interaction.fields.getTextInputValue("titulo");
  const conteudo = interaction.fields.getTextInputValue("conteudo");

  const tempEntry = interaction.client.tempEntries?.get(
    interaction.user.id
  ) || {
    titulo: null,
    conteudo: null,
    tags: [],
    link: null,
    anexo_url: null,
  };

  tempEntry.titulo = titulo;
  tempEntry.conteudo = conteudo;

  interaction.client.tempEntries.set(interaction.user.id, tempEntry);

  const preview = criarPreviewEntrada({
    titulo: tempEntry.titulo,
    conteudo: tempEntry.conteudo,
    tags: tempEntry.tags,
    link: tempEntry.link,
    anexo_url: tempEntry.anexo_url,
  });

  await interaction.editReply({ ...preview, ephemeral: true });
}

async function handleTagsModalSubmit(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const tempEntry = interaction.client.tempEntries?.get(interaction.user.id);
  if (!tempEntry) {
    return await interaction.editReply({
      content:
        "❌ Erro: Entrada temporária não encontrada. Por favor, tente novamente.",
      ephemeral: true,
    });
  }

  const tags = interaction.fields
    .getTextInputValue("tags")
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  tempEntry.tags = tags;
  interaction.client.tempEntries.set(interaction.user.id, tempEntry);

  const preview = criarPreviewEntrada(tempEntry);

  await interaction.editReply({ ...preview, ephemeral: true });
  await interaction.followUp({
    content: "✅ Tags adicionadas com sucesso!",
    ephemeral: true,
  });
}

async function handleLinkModalSubmit(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const tempEntry = interaction.client.tempEntries?.get(interaction.user.id);
  if (!tempEntry) {
    return await interaction.editReply({
      content:
        "❌ Erro: Entrada temporária não encontrada. Por favor, tente novamente.",
      ephemeral: true,
    });
  }

  const link = interaction.fields.getTextInputValue("link");

  tempEntry.link = link;
  interaction.client.tempEntries.set(interaction.user.id, tempEntry);

  const preview = criarPreviewEntrada(tempEntry);

  await interaction.editReply({ ...preview, ephemeral: true });
  await interaction.followUp({
    content: "✅ Link adicionado com sucesso!",
    ephemeral: true,
  });
}

async function handleAdicionarTagsButton(interaction) {
  const modal = new ModalBuilder()
    .setCustomId("registro_modal_tags")
    .setTitle("🏷️ Adicionar Tags");
  const tagsInput = new TextInputBuilder()
    .setCustomId("tags")
    .setLabel("Tags (separadas por vírgula)")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("projeto, frontend, typescript...")
    .setRequired(true);
  const row = new ActionRowBuilder().addComponents(tagsInput);
  modal.addComponents(row);
  await interaction.showModal(modal);
}

async function handleAdicionarLinkButton(interaction) {
  const modal = new ModalBuilder()
    .setCustomId("registro_modal_link")
    .setTitle("🔗 Adicionar Link");
  const linkInput = new TextInputBuilder()
    .setCustomId("link")
    .setLabel("Link")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("https://...")
    .setRequired(true);
  const row = new ActionRowBuilder().addComponents(linkInput);
  modal.addComponents(row);
  await interaction.showModal(modal);
}

async function handleAdicionarAnexoButton(interaction) {
  const tempEntry = interaction.client.tempEntries?.get(interaction.user.id);
  if (!tempEntry) {
    return interaction.reply({
      content:
        "❌ Erro ao encontrar sua entrada temporária. Por favor, comece de novo.",
      ephemeral: true,
    });
  }

  await interaction.deferUpdate();

  const prompt = await interaction.followUp({
    content:
      "📤 Envie a imagem ou vídeo que deseja adicionar. Você tem 60 segundos.",
    ephemeral: true,
  });

  const filter = (m) => m.author.id === interaction.user.id;
  const collector = interaction.channel?.createMessageCollector({
    filter,
    time: 60000,
    max: 1,
  });

  if (!collector) {
    return prompt.edit({
      content:
        "❌ Não foi possível iniciar o coletor de mensagens neste canal.",
    });
  }

  collector.on("collect", async (msg) => {
    try {
      const attachment = msg.attachments.first();
      if (!attachment) {
        await prompt.edit({
          content: "❌ Nenhuma mídia enviada. Tente novamente.",
        });
        return;
      }

      const isValidType =
        attachment.contentType?.startsWith("image/") ||
        attachment.url.match(/\.(gif)$/i);

      if (!isValidType) {
        await prompt.edit({
          content:
            "❌ Tipo de arquivo não suportado. Envie apenas imagens ou GIFs.",
        });
        return;
      }

      const response = await fetch(attachment.url);
      const buffer = await response.buffer();
      const fileExtension = attachment.name.split(".").pop().toLowerCase();
      const fileName = `${msg.author.id}_${Date.now()}.${fileExtension}`;

      const { error: uploadError } = await supabase.storage
        .from("logzito-media")
        .upload(fileName, buffer, {
          contentType: attachment.contentType,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Erro no upload:", uploadError);
        await prompt.edit({
          content: "❌ Erro ao processar o arquivo. Tente novamente.",
        });
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("logzito-media").getPublicUrl(fileName);

      tempEntry.anexo_url = publicUrl;
      interaction.client.tempEntries.set(interaction.user.id, tempEntry);

      const preview = criarPreviewEntrada(tempEntry);

      await prompt.delete().catch(() => {});
      await interaction.followUp({ ...preview, ephemeral: true });
    } catch (err) {
      console.error("Erro no coletor de anexo:", err);
      await interaction.followUp({
        content: "❌ Ocorreu um erro ao processar seu arquivo.",
        ephemeral: true,
      });
    } finally {
      await msg.delete().catch(() => {});
    }
  });

  collector.on("end", async (collected, reason) => {
    if (collected.size === 0 && reason === "time") {
      await prompt.edit({
        content: "⏰ O tempo para enviar o arquivo esgotou.",
      });
    }
  });
}

async function handlePublicarEntradaButton(interaction) {
  const tempEntry = interaction.client.tempEntries?.get(interaction.user.id);
  if (!tempEntry) {
    return await interaction.reply({
      content: "❌ Erro ao encontrar sua entrada temporária.",
      ephemeral: true,
    });
  }

  const { data: entries } = await supabase
    .from("registros")
    .select("id_local")
    .eq("usuario_id", interaction.user.id)
    .order("id_local", { ascending: false });

  const maxId =
    entries?.length > 0 ? Math.max(...entries.map((e) => e.id_local || 0)) : 0;
  const nextId = maxId + 1;

  const { data: novaEntrada, error: registroError } = await supabase
    .from("registros")
    .insert({
      usuario_id: interaction.user.id,
      titulo: tempEntry.titulo,
      mensagem: tempEntry.conteudo,
      tags: tempEntry.tags || [],
      link: tempEntry.link,
      anexo_url: tempEntry.anexo_url,
      data: new Date().toISOString(),
      id_local: nextId,
      compartilhado: false,
    })
    .select()
    .single();

  if (registroError) {
    console.error("Erro ao salvar registro:", registroError);
    return await interaction.reply({
      content: "❌ Erro ao salvar sua entrada.",
      ephemeral: true,
    });
  }

  interaction.client.tempEntries.delete(interaction.user.id);

  await interaction.update({
    embeds: [
      criarEmbed({
        titulo: aleatoria(mensagensRegistro),
        descricao: "Sua entrada foi publicada com sucesso!",
        tipo: "sucesso",
      }),
    ],
    components: [],
  });

  const entryEmbed = criarEmbed({
    titulo: `✨ Nova Entrada #${formatId(novaEntrada.id_local)}`,
    descricao: `${
      novaEntrada.titulo ? `📑 **${novaEntrada.titulo}**\n\n` : ""
    }${novaEntrada.mensagem}${
      novaEntrada.tags?.length > 0
        ? `\n\n🏷️ **Tags:** ${novaEntrada.tags
            .map((t) => `\`${t}\``)
            .join(", ")}`
        : ""
    }${novaEntrada.link ? `\n\n🔗 **Link:** ${novaEntrada.link}` : ""}`,
    imagem: novaEntrada.anexo_url,
    rodape: {
      texto: `Entrada criada em ${new Date(novaEntrada.data).toLocaleString(
        "pt-BR"
      )}`,
    },
  });

  await interaction.followUp({
    embeds: [entryEmbed],
    ephemeral: true,
  });
}

module.exports = {
  handleAdicionarCommand,
  handleAdicionarModalSubmit,
  handleTagsModalSubmit,
  handleLinkModalSubmit,
  handleAdicionarTagsButton,
  handleAdicionarLinkButton,
  handleAdicionarAnexoButton,
  handlePublicarEntradaButton,
};
