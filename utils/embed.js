const { EmbedBuilder } = require("discord.js");

// Purple and Black Color Palette
const COLORS = {
  DEFAULT: 0x9146ff, // Twitch Purple
  SUCCESS: 0x8a2be2, // Blue Violet
  ERROR: 0x36013f, // Deep Purple
  WARNING: 0x800080, // Purple
  INFO: 0x483d8b, // Dark Slate Blue
  BLACK: 0x000000, // Black
};

function criarEmbed({
  titulo,
  descricao,
  cor = COLORS.DEFAULT,
  imagem = null,
  rodape = true,
  tipo = "default",
}) {
  // Choose color based on type
  const corFinal = tipo === "default" ? cor : COLORS[tipo.toUpperCase()] || cor;

  const embed = new EmbedBuilder()
    .setTitle(titulo)
    .setDescription(descricao)
    .setColor(corFinal);

  if (imagem) embed.setImage(imagem);

  if (rodape) {
    embed.setFooter({
      text: "Feito com 💜 por NMB | Logzito - Seu Diário Pessoal de Dev",
      iconURL: "https://i.ibb.co/VYSFGxSy/nmb.jpg",
    });
    embed.setTimestamp(); // Adds timestamp to the embed
  }

  return embed;
}

module.exports = { criarEmbed };
