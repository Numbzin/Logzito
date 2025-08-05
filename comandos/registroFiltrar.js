const { supabase } = require("../supabaseClient");
const { criarEmbed } = require("../utils/embed");

async function handleFiltrarCommand(interaction) {
  const userId = interaction.user.id;
  const tag = interaction.options.getString("tag");

  const { data, error } = await supabase
    .from("registros")
    .select("*")
    .eq("usuario_id", userId)
    .contains("tags", [tag])
    .order("data", { ascending: false });

  if (error || !data || data.length === 0) {
    return await interaction.editReply({
      embeds: [
        criarEmbed({
          titulo: "📭 Nada encontrado",
          descricao: `Você ainda não tem nenhuma entrada com a tag \`${tag}\`.`,
        }),
      ],
    });
  }

  const resposta = data
    .map(
      (e) =>
        `🗓️ *${new Date(e.data).toLocaleString()}*\n🏷️ ${
          e.tags?.join(", ") || "sem tags"
        }\n\`\`\`${e.mensagem}\`\`\``
    )
    .join("\n");

  const embed = criarEmbed({
    titulo: `🔍 Entradas com a tag: #${tag}`,
    descricao:
      resposta.length > 4000 ? resposta.slice(0, 3990) + "..." : resposta,
    rodape: false,
  });

  await interaction.editReply({ embeds: [embed] });
}

module.exports = {
  handleFiltrarCommand,
};
