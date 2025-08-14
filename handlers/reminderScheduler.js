const cron = require("node-cron");
const { supabase } = require("../supabaseClient");
const { DateTime } = require("luxon");

async function enviarLembrete(client, userId, message) {
  try {
    const user = await client.users.fetch(userId);
    await user.send(`🔔 ${message}`);
    return true;
  } catch (err) {
    console.error(
      `Erro ao enviar lembrete para ${userId}:`,
      err.message
    );
    // Se o usuário não for encontrado ou bloqueou o bot, desativa o lembrete
    if (err.code === 10007 || err.code === 50007) {
      console.log(
        `Desativando lembrete para ${userId} por falha no envio.`
      );
      await supabase
        .from("usuarios_logzito")
        .update({ lembrete_ativo: false })
        .eq("usuario_id", userId);
    }
    return false;
  }
}

async function verificarEEnviarLembretes(client) {
  const agoraUTC = DateTime.utc();

  // Busca todos os usuários com lembretes ativos
  const { data: usuarios, error } = await supabase
    .from("usuarios_logzito")
    .select("usuario_id, lembrete_horario, lembrete_fuso")
    .eq("lembrete_ativo", true);

  if (error) {
    console.error("Erro ao buscar usuários com lembretes:", error);
    return;
  }

  if (!usuarios || usuarios.length === 0) {
    return;
  }

  for (const usuario of usuarios) {
    try {
      const proximoEnvioLocal = DateTime.fromFormat(usuario.lembrete_horario, "HH:mm", {
        zone: usuario.lembrete_fuso,
      });

      const agoraNoFuso = agoraUTC.setZone(usuario.lembrete_fuso);

      // Compara apenas a hora e o minuto
      if (proximoEnvioLocal.hour === agoraNoFuso.hour && proximoEnvioLocal.minute === agoraNoFuso.minute) {
        await enviarLembrete(client, usuario.usuario_id, "É hora de registrar sua atividade!");
      }
    } catch (err) {
      console.error(
        `Erro ao processar lembrete para usuário ${usuario.usuario_id}:`,
        err
      );
    }
  }
}

function iniciarLembrete(client) {
  console.log("⏰ Agendador de lembretes iniciado. Verificando a cada minuto.");
  // Roda o verificador a cada minuto.
  cron.schedule("* * * * *", () => verificarEEnviarLembretes(client));
}

module.exports = { iniciarLembrete };
