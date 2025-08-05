const { SlashCommandBuilder } = require("discord.js");
const { supabase } = require("../supabaseClient");

// Import handlers for subcommands
const {
  handleAdicionarCommand,
  handleAdicionarModalSubmit,
  handleTagsModalSubmit,
  handleAdicionarTagsButton,
  handleAdicionarLinkButton,
  handleAdicionarAnexoButton,
  handleLinkModalSubmit,
  handlePublicarEntradaButton,
} = require("./registroAdicionar");
const {
  handleVerCommand,
  handleVerButtonInteraction,
} = require("./registroVer");
const {
  handleComentarCommand,
  handleCommentModalSubmit,
  handleReactButtonInteraction,
  handleCommentButtonInteraction,
} = require("./registroComentar");
const { handleFiltrarCommand } = require("./registroFiltrar");
const { handleExportarCommand } = require("./registroExportar");
const { handleCompartilharCommand } = require("./registroCompartilhar");
const { showEditModal, handleEditarModalSubmit } = require("./registroEditar");
const {
  showDeleteConfirmation,
  handleExcluirConfirmButton,
} = require("./registroExcluir");
const {
  handleCalendarioCommand,
  handleCalendarioButtonInteraction,
} = require("./registroCalendario");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("registro")
    .setDescription("Comandos para gerenciar seu diário de bordo")
    .addSubcommand((sub) =>
      sub
        .setName("adicionar")
        .setDescription("Adiciona uma nova entrada ao seu diário")
        .addStringOption((opt) =>
          opt
            .setName("tags")
            .setDescription("Tags separadas por vírgula (ex: js, node, react)")
            .setAutocomplete(true)
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName("link")
            .setDescription("Um link para adicionar à entrada")
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("ver")
        .setDescription("Visualiza suas entradas do diário")
        .addIntegerOption((opt) =>
          opt.setName("id").setDescription("ID da entrada para ver")
        )
        .addIntegerOption((opt) =>
          opt
            .setName("pagina")
            .setDescription("Número da página para visualizar")
            .setRequired(false)
        )
        .addIntegerOption((opt) =>
          opt
            .setName("por_pagina")
            .setDescription("Entradas por página (padrão: 5)")
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("comentar")
        .setDescription("Adiciona um comentário a uma entrada")
        .addIntegerOption((opt) =>
          opt.setName("id").setDescription("ID da entrada").setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName("mensagem")
            .setDescription("O comentário a ser adicionado")
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("filtrar")
        .setDescription("Filtra suas entradas por uma tag")
        .addStringOption((opt) =>
          opt
            .setName("tag")
            .setDescription("A tag para filtrar")
            .setAutocomplete(true)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("exportar")
        .setDescription("Exporta todas as suas entradas para um arquivo .txt")
    )
    .addSubcommand((sub) =>
      sub
        .setName("compartilhar")
        .setDescription("Compartilha uma entrada no canal público")
        .addStringOption((opt) =>
          opt
            .setName("id")
            .setDescription("ID da entrada a ser compartilhada")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("editar")
        .setDescription("Edita uma de suas entradas.")
        .addIntegerOption((opt) =>
          opt
            .setName("id")
            .setDescription("ID da entrada a ser editada.")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("excluir")
        .setDescription("Exclui uma de suas entradas.")
        .addIntegerOption((opt) =>
          opt
            .setName("id")
            .setDescription("ID da entrada a ser excluída.")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("calendario")
        .setDescription("Mostra um calendário com seus dias de registro")
        .addIntegerOption((opt) =>
          opt.setName("mes").setDescription("Mês para visualizar (1-12)")
        )
        .addIntegerOption((opt) =>
          opt.setName("ano").setDescription("Ano para visualizar (ex: 2024)")
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (interaction.guild) {
      const { data: config } = await supabase
        .from("configuracoes_logzito")
        .select("canal_comando")
        .eq("servidor_id", interaction.guild.id)
        .single();

      if (!config && subcommand !== 'adicionar' && subcommand !== 'ver' && subcommand !== 'lembrar' && subcommand !== 'status' && subcommand !== 'exportar' && subcommand !== 'calendario' && subcommand !== 'filtrar' && subcommand !== 'editar' && subcommand !== 'excluir' && subcommand !== 'comentar') {
        return await interaction.reply({
          content:
            "❌ Este servidor ainda não foi configurado. Um administrador deve usar `/logzito config` primeiro.",
          ephemeral: true,
        });
      }

      if (config && interaction.channelId !== config.canal_comando && subcommand !== 'adicionar' && subcommand !== 'ver' && subcommand !== 'lembrar' && subcommand !== 'status' && subcommand !== 'exportar' && subcommand !== 'calendario' && subcommand !== 'filtrar' && subcommand !== 'editar' && subcommand !== 'excluir' && subcommand !== 'comentar') {
        return await interaction.reply({
          content: `❌ Este comando só pode ser usado no canal <#${config.canal_comando}>.`,
          ephemeral: true,
        });
      }
    }

    switch (subcommand) {
      case "adicionar":
        return handleAdicionarCommand(interaction);
      case "editar":
        return showEditModal(interaction, interaction.options.getInteger("id"));
      case "ver":
        await interaction.deferReply({ ephemeral: true });
        return handleVerCommand(interaction);
      case "comentar":
        await interaction.deferReply({ ephemeral: true });
        return handleComentarCommand(interaction);
      case "filtrar":
        await interaction.deferReply({ ephemeral: true });
        return handleFiltrarCommand(interaction);
      case "exportar":
        await interaction.deferReply({ ephemeral: true });
        return handleExportarCommand(interaction);
      case "compartilhar":
        await interaction.deferReply({ ephemeral: true });
        return handleCompartilharCommand(interaction);
      case "excluir":
        await interaction.deferReply({ ephemeral: true });
        return showDeleteConfirmation(interaction, interaction.options.getInteger("id"));
      case "calendario":
        await interaction.deferReply({ ephemeral: true });
        return handleCalendarioCommand(interaction);
    }
  },

  async handleModal(interaction) {
    const [_, modalType] = interaction.customId.split("_");

    switch (modalType) {
      case "adicionar":
        return handleAdicionarModalSubmit(interaction);
      case "tags":
        return handleTagsModalSubmit(interaction);
      case "link":
        return handleLinkModalSubmit(interaction);
      case "editar":
        return handleEditarModalSubmit(interaction);
      case "comment":
        return handleCommentModalSubmit(interaction);
    }
  },

  async handleButton(interaction) {
    const [_, buttonType, ...args] = interaction.customId.split("_");

    switch (buttonType) {
      case "adicionar": {
        const action = args[0];
        if (action === "tags") return handleAdicionarTagsButton(interaction);
        if (action === "link") return handleAdicionarLinkButton(interaction);
        if (action === "anexo") return handleAdicionarAnexoButton(interaction);
        break;
      }
      case "publicar":
        return handlePublicarEntradaButton(interaction);
      case "ver": {
        const [_, __, action, entryId] = interaction.customId.split("_");
        if (action === "editar") return showEditModal(interaction, entryId);
        if (action === "excluir") return showDeleteConfirmation(interaction, entryId);
        return handleVerButtonInteraction(interaction);
      }
      case "excluir":
        return handleExcluirConfirmButton(interaction);
      case "react":
        return handleReactButtonInteraction(interaction);
      case "comment":
        return handleCommentButtonInteraction(interaction);
      case "cal":
        return handleCalendarioButtonInteraction(interaction);
    }
  },
};
