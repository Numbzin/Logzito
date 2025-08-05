const { supabase } = require("../supabaseClient");
const { criarEmbed } = require("../utils/embed");
const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");

// Helper function to format ID with leading zeros
function formatId(id) {
  return String(id).padStart(3, "0");
}

// Lista de emojis disponíveis para reação
const EMOJIS_REACAO = ["👍", "❤️", "🎉", "🤔", "👀", "🚀", "💡", "🎯"];

function criarPreviewEntrada(dadosEntrada) {
  const { titulo, conteudo, tags, link, anexo_url } = dadosEntrada;

  const embed = criarEmbed({
    titulo: "📝 Prévia da Entrada",
    descricao: `${titulo ? `📑 **${titulo}**\n\n` : ""}${conteudo}${tags && tags.length > 0
        ? `\n\n🏷️ **Tags:** ${tags.map((t) => `\`${t}\``).join(", ")}`
        : ""
      }${link ? `\n\n🔗 **Link:** ${link}` : ""}`,
    imagem: anexo_url || null,
    rodape: true,
  });

  const rows = [];

  const firstRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("registro_adicionar_tags")
      .setLabel("Tags")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("🏷️"),
    new ButtonBuilder()
      .setCustomId("registro_adicionar_link")
      .setLabel("Link")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("🔗"),
    new ButtonBuilder()
      .setCustomId("registro_adicionar_anexo")
      .setLabel("Mídia")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("📎")
  );
  rows.push(firstRow);

  const secondRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("registro_publicar_entrada")
      .setLabel("Publicar Entrada")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("✨")
  );
  rows.push(secondRow);

  return { embeds: [embed], components: rows };
}

// Função para verificar se o bucket existe (currently unused in registro.js, but good to keep it here)
async function verificarBucket() {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      console.error("Erro ao listar buckets:", error);
      return false;
    }

    console.log(
      "Buckets disponíveis:",
      buckets?.map((b) => b.name)
    );

    const bucketExists = buckets?.some(
      (bucket) => bucket.name === "logzito-media"
    );
    console.log("Bucket logzito-media existe?", bucketExists);

    return bucketExists || false;
  } catch (error) {
    console.error("Erro ao verificar bucket:", error);
    return false;
  }
}

// Função auxiliar para gerar o calendário
function gerarCalendario(ano, mes, diasComRegistro) {
  const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);
  const diasNoMes = ultimoDia.getDate();
  const primeiroDiaSemana = primeiroDia.getDay();

  // Cria o cabeçalho do calendário com os dias da semana em roxo
  let calendario = "```ansi\n";
  calendario +=
    diasSemana.map((dia) => `\u001b[35m${dia.padEnd(4)}\u001b[0m`).join("") +
    "\n";

  // Espaços para alinhar com o primeiro dia
  let linha = "    ".repeat(primeiroDiaSemana);

  // Preenche os dias do mês
  for (let dia = 1; dia <= diasNoMes; dia++) {
    const diaFormatado = dia.toString().padStart(2, " ");

    if (diasComRegistro.includes(dia)) {
      linha += `\u001b[35m${diaFormatado}\u001b[0m  `; // Roxo para dias com registro
    } else {
      linha += `\u001b[30m${diaFormatado}\u001b[0m  `; // Preto para dias sem registro
    }

    // Se chegou ao fim da semana ou é o último dia, adiciona uma nova linha
    if ((dia + primeiroDiaSemana) % 7 === 0 || dia === diasNoMes) {
      calendario += linha.trimEnd() + "\n";
      linha = "";
    }
  }

  calendario += "```";
  return calendario;
}

// Função para obter o nome do mês
function getNomeMes(mes) {
  const meses = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  return meses[mes];
}

// Helper function to update message with comments and reactions
async function updateMessageWithComments(
  client, // O objeto client do bot
  interaction, // A interação original
  messageToUpdate, // A mensagem (Message) que precisa ser atualizada
  entradaId, // O id_local da entrada
  originalAuthorId // O ID do usuário que criou a entrada original
) {
  // Busca a entrada usando o ID do autor e o ID local para garantir unicidade
  const { data: entrada } = await supabase
    .from("registros")
    .select("*")
    .eq("usuario_id", originalAuthorId)
    .eq("id_local", entradaId)
    .single();

  if (!entrada) return;

  // Busca o nome de usuário do autor original para exibição
  let authorUsername = "Usuário Desconhecido";
  try {
    const authorUser = await client.users.fetch(originalAuthorId);
    authorUsername = authorUser.username;
  } catch (e) {
    console.error(`Não foi possível buscar o autor ${originalAuthorId}:`, e);
  }

  // Busca comentários
  const { data: comentarios } = await supabase
    .from("comentarios_logzito")
    .select("usuario_id, mensagem, data") // Seleciona apenas as colunas necessárias
    .eq("entrada_id", entradaId)
    .order("data", { ascending: true }); // Using data field for sorting

  // Busca reações
  const { data: reacoes } = await supabase
    .from("reacoes_logzito")
    .select("emoji") // Seleciona apenas as colunas necessárias
    .eq("entrada_id", entradaId);

  // Cria o embed atualizado
  let descricao = "";
  if (entrada.titulo) {
    descricao += `📑 **${entrada.titulo}**\n\n`;
  }
  descricao += `${entrada.mensagem}\n\n`;

  // Adiciona contagem de reações
  if (reacoes?.length > 0) {
    // Make the link clickable
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

  if (entrada.link) {
    descricao += `\n\n🔗 **Link:** ${entrada.link}\n\n`; // Adicionado \n\n para garantir um novo parágrafo
  }

  // Adiciona comentários
  if (comentarios?.length > 0) {
    descricao += "**Comentários:**\n";
    for (const c of comentarios) {
      let userName = "Usuário Desconhecido";
      try {
        const user = await client.users.fetch(c.usuario_id);
        userName = user.username; // Pega o nome de usuário do Discord
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
  });

  // Define o rodapé com o nome de usuário do autor
  embed.setFooter({ text: `Entrada de ${authorUsername}` });

  // Cria botões de reação
  const rows = [];
  const reactionButtons = EMOJIS_REACAO.map(
    (emoji) =>
      new ButtonBuilder()
        .setCustomId(
          `registro_react_${entrada.id_local}_${originalAuthorId}_${emoji}`
        )
        .setEmoji(emoji)
        .setStyle(ButtonStyle.Secondary) // Dark theme for reaction buttons
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
      .setCustomId(`registro_comment_${entrada.id_local}_${originalAuthorId}`)
      .setLabel("Adicionar Comentário")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("💬")
  );
  rows.push(commentRow);

  // Atualiza a mensagem original
  if (messageToUpdate) {
    await messageToUpdate.edit({
      embeds: [embed],
      components: rows,
    });
  } else {
    await interaction.followUp({ 
        embeds: [embed], 
        components: rows, 
        ephemeral: true 
    });
  }
}

module.exports = {
  formatId,
  EMOJIS_REACAO,
  verificarBucket,
  gerarCalendario,
  getNomeMes,
  updateMessageWithComments,
  criarPreviewEntrada,
};