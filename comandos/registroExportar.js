const { supabase } = require("../supabaseClient");
const { criarEmbed } = require("../utils/embed");
const { aleatoria, mensagensExportar } = require("../utils/mensagens");
const { formatId } = require("./registroUtils");
const fs = require("fs");
const { AttachmentBuilder } = require("discord.js");

async function handleExportarCommand(interaction) {
  const userId = interaction.user.id;

  const { data, error } = await supabase
    .from("registros")
    .select("*")
    .eq("usuario_id", userId)
    .order("data", { ascending: true });

  if (error || !data || data.length === 0) {
    return await interaction.editReply({
      embeds: [
        criarEmbed({
          titulo: "Erro ao exportar",
          descricao: "Você não tem entradas para exportar.",
          cor: 0xff0000,
        }),
      ],
    });
  }

  const conteudo = data
    .map(
      (e) =>
        `🆔 #${formatId(e.id_local)} | ${new Date(e.data).toLocaleString()}\n${
          e.mensagem
        }`
    )
    .join("\n\n");

  const nomeArquivo = `diario-${userId}.txt`;
  fs.writeFileSync(nomeArquivo, conteudo);

  await interaction.editReply({
    content: aleatoria(mensagensExportar),
    files: [new AttachmentBuilder(nomeArquivo)],
  });

  fs.unlinkSync(nomeArquivo);
}

module.exports = {
  handleExportarCommand,
};
