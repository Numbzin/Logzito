const { supabase } = require("../supabaseClient");
const { criarEmbed } = require("../utils/embed");
const { gerarCalendario, getNomeMes, formatId } = require("./registroUtils");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

async function handleCalendarioCommand(interaction) {
  const userId = interaction.user.id;
  // Pega o mês e ano dos parâmetros ou usa o atual
  const dataAtual = new Date();
  const mes = interaction.options.getInteger("mes")
    ? interaction.options.getInteger("mes") - 1 // Ajusta para 0-11
    : dataAtual.getMonth();
  const ano = interaction.options.getInteger("ano") || dataAtual.getFullYear();

  // Busca registros do mês
  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);

  const { data: registros, error } = await supabase
    .from("registros")
    .select("data, id_local") // Also fetch id_local
    .eq("usuario_id", userId)
    .gte("data", primeiroDia.toISOString())
    .lte("data", ultimoDia.toISOString());

  if (error) {
    console.error("Erro ao buscar registros:", error);
    return await interaction.editReply({
      content: "❌ Erro ao buscar seus registros.",
      ephemeral: true,
    });
  }

  // Extrai os dias dos registros
  const diasComRegistro = [
    ...new Set(registros.map((r) => new Date(r.data).getDate())),
  ].sort((a, b) => a - b);

  // Gera o calendário
  const calendario = gerarCalendario(ano, mes, diasComRegistro);

  // Cria os botões de navegação
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`registro_cal_${ano}_${mes - 1}`)
      .setLabel("◀️")
      .setStyle(ButtonStyle.Secondary), // Dark theme
    new ButtonBuilder()
      .setCustomId(`registro_cal_${ano}_${mes + 1}`)
      .setLabel("▶️")
      .setStyle(ButtonStyle.Secondary) // Dark theme
  );

  // Adiciona informação sobre as entradas do mês
  const entradasFormatadas = registros
    .map((r) => `\`#${formatId(r.id_local)}\``)
    .join(", ");

  // Cria o embed
  const embed = criarEmbed({
    titulo: `📅 Calendário de Registros - ${getNomeMes(mes)} ${ano}`,
    descricao: `Aqui está seu calendário de registros:\n${calendario}\n🟣 Dias com registro\n⚫ Dias sem registro\n\nEntradas deste mês: ${entradasFormatadas}\n\nTotal de dias com registro: ${diasComRegistro.length}`,
    rodape: true,
  });

  await interaction.editReply({
    embeds: [embed],
    components: [row],
  });
}

async function handleCalendarioButtonInteraction(interaction) {
  await interaction.deferUpdate();
  const [_, __, ano, mes] = interaction.customId.split("_").map(Number);
  const userId = interaction.user.id;

  // Ajusta o mês/ano se necessário
  let novoMes = mes;
  let novoAno = ano;

  if (mes < 0) {
    novoMes = 11;
    novoAno = ano - 1;
  } else if (mes > 11) {
    novoMes = 0;
    novoAno = ano + 1;
  }

  // Busca registros do novo mês
  const primeiroDia = new Date(novoAno, novoMes, 1);
  const ultimoDia = new Date(novoAno, novoMes + 1, 0);

  const { data: registros } = await supabase
    .from("registros")
    .select("data, id_local")
    .eq("usuario_id", userId)
    .gte("data", primeiroDia.toISOString())
    .lte("data", ultimoDia.toISOString());

  const diasComRegistro = [
    ...new Set(registros.map((r) => new Date(r.data).getDate())),
  ].sort((a, b) => a - b);

  // Gera o novo calendário
  const calendario = gerarCalendario(novoAno, novoMes, diasComRegistro);

  // Atualiza os botões
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`registro_cal_${novoAno}_${novoMes - 1}`)
      .setLabel("◀️")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`registro_cal_${novoAno}_${novoMes + 1}`)
      .setLabel("▶️")
      .setStyle(ButtonStyle.Secondary)
  );

  // Atualiza o embed
  const embed = criarEmbed({
    titulo: `📅 Calendário de Registros - ${getNomeMes(novoMes)} ${novoAno}`,
    descricao: `Aqui está seu calendário de registros:\n${calendario}\n🟣 Dias com registro\n⚫ Dias sem registro\n\nTotal de dias com registro: ${diasComRegistro.length}`,
    rodape: true,
  });

  await interaction.editReply({
    embeds: [embed],
    components: [row],
  });
}

module.exports = {
  handleCalendarioCommand,
  handleCalendarioButtonInteraction,
};
