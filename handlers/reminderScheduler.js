const cron = require("node-cron");
const { supabase } = require("../supabaseClient");
const { DateTime } = require("luxon");

const MENSAGENS_LEMBRETE_GENERICO = [
  "📚 Já anotou o que aprendeu hoje? O progresso vem com a prática!",
  "🧠 Que tal refletir sobre sua evolução hoje? Use `/registro adicionar`",
  "🚀 Cada linha de código conta. Registra aí no Logzito!",
  "📓 Diário de bordo aberto! Compartilhe sua jornada dev 📝",
  "💡 Teve alguma ideia ou sacada hoje? Não deixa escapar!",
  "🤖 O Logzito tá de olho! Que tal registrar seu avanço?",
  "🌱 Até uma linha por dia faz diferença. Vai lá!",
  "🔎 Aprender é repetir, registrar e revisar. Hora do log!",
  "✍️ Bora colocar no papel digital o que você mandou bem hoje?",
  "📢 O futuro você vai te agradecer por manter um diário hoje.",
];

async function enviarLembrete(client, usuarioId, mensagem) {
  try {
    const user = await client.users.fetch(usuarioId);
    await user.send(`🔔 ${mensagem}`);
    return true;
  } catch (err) {
    console.error(`Erro ao enviar lembrete para ${usuarioId}:`, err.message);
    if (err.code === 10007 || err.code === 50007) {
      // Unknown User or Cannot send messages to this user
      console.log(
        `Desativando lembretes para o usuário ${usuarioId} por falha no envio.`
      );
      await supabase
        .from("usuarios_logzito")
        .update({ lembrete_ativo: false })
        .eq("usuario_id", usuarioId);
    }
    return false;
  }
}

async function verificarEEnviarLembretes(client) {
  const agoraUTC = DateTime.utc();

  const { data: usuarios, error } = await supabase
    .from("usuarios_logzito")
    .select("usuario_id, lembrete_horario, lembrete_fuso, lembrete_last_sent")
    .eq("lembrete_ativo", true);

  if (error) {
    console.error("Erro ao buscar usuários para lembretes:", error);
    return;
  }

  if (!usuarios || usuarios.length === 0) return;

  for (const usuario of usuarios) {
    const { usuario_id, lembrete_horario, lembrete_fuso, lembrete_last_sent } =
      usuario;
    if (!lembrete_horario) continue;

    try {
      const fuso = lembrete_fuso || "America/Sao_Paulo";
      const horaAgendada = DateTime.fromFormat(lembrete_horario, "HH:mm", {
        zone: fuso,
      });
      const agoraNoFuso = agoraUTC.setZone(fuso);

      const ultimaVezEnviado = lembrete_last_sent
        ? DateTime.fromISO(lembrete_last_sent).setZone(fuso)
        : null;

      // Verifica se a hora atual é a hora agendada e se já não foi enviado hoje
      if (
        agoraNoFuso.hour === horaAgendada.hour &&
        agoraNoFuso.minute === horaAgendada.minute &&
        (!ultimaVezEnviado ||
          ultimaVezEnviado.startOf("day") < agoraNoFuso.startOf("day"))
      ) {
        const frase =
          MENSAGENS_LEMBRETE_GENERICO[
            Math.floor(Math.random() * MENSAGENS_LEMBRETE_GENERICO.length)
          ];
        const sucesso = await enviarLembrete(client, usuario_id, frase);

        if (sucesso) {
          await supabase
            .from("usuarios_logzito")
            .update({ lembrete_last_sent: agoraUTC.toISO() })
            .eq("usuario_id", usuario_id);
        }
      }
    } catch (err) {
      console.error(`Erro ao processar lembrete para ${usuario_id}:`, err);
    }
  }
}

function iniciarLembrete(client) {
  console.log("⏰ Agendador de lembretes iniciado. Verificando a cada minuto.");
  // Roda o verificador a cada minuto.
  cron.schedule("* * * * *", () => verificarEEnviarLembretes(client));
}

module.exports = { iniciarLembrete };
