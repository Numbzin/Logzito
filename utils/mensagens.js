// utils/mensagens.js
const mensagensRegistro = [
  "✨ Entrada registrada com sucesso!",
  "🌟 Mais um passo na sua jornada dev!",
  "📚 Conhecimento registrado com sucesso!",
  "🚀 Progresso documentado, continue assim!",
  "💫 Entrada adicionada ao seu diário!",
  "📖 Novo capítulo da sua história dev!",
];

const mensagensStatus = [
  "📊 Dashboard do seu progresso",
  "📈 Sua jornada em números",
  "🎯 Acompanhamento do seu diário",
  "📑 Resumo das suas conquistas",
  "🌱 Sua evolução até aqui",
];

const mensagensExportar = [
  "📦 Suas memórias foram exportadas!",
  "📥 Diário exportado com sucesso!",
  "💾 Backup do seu conhecimento pronto!",
];

const mensagensCompartilhar = [
  "🌟 Sua história foi compartilhada!",
  "🎉 Entrada compartilhada com sucesso!",
  "✨ Agora todos podem se inspirar!",
];

function aleatoria(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

module.exports = {
  mensagensRegistro,
  mensagensStatus,
  mensagensExportar,
  mensagensCompartilhar,
  aleatoria,
};
