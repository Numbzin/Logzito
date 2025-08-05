const { supabase } = require("../supabaseClient");

/**
 * Lida com as interações de autocomplete do bot.
 * @param {import('discord.js').AutocompleteInteraction} interaction A interação de autocomplete.
 */
async function handleAutocomplete(interaction) {
  try {
    const focusedValue = interaction.options.getFocused();
    const commandName = interaction.commandName;
    const subCommand = interaction.options.getSubcommand(false);

    if (
      commandName === "registro" &&
      ["filtrar", "adicionar"].includes(subCommand)
    ) {
      const { data, error } = await supabase
        .from("registros")
        .select("tags")
        .eq("usuario_id", interaction.user.id);

      if (error || !data) return;

      const todasTags = data
        .flatMap((r) => r.tags || [])
        .filter((tag, i, arr) => arr.indexOf(tag) === i) // Pega tags únicas
        .filter((tag) => tag.toLowerCase().includes(focusedValue.toLowerCase()))
        .slice(0, 25);

      await interaction.respond(todasTags.map((t) => ({ name: t, value: t })));
    } else if (
      commandName === "lembrete" &&
      ["editar", "remover"].includes(subCommand)
    ) {
      const { data: lembretes, error } = await supabase
        .from("lembretes_logzito")
        .select("id, horario, mensagem")
        .eq("usuario_id", interaction.user.id)
        .order("horario", { ascending: true });

      if (error || !lembretes) return;

      const choices = lembretes.map((l) => {
        const nome = `#${l.id} | ${l.horario} - ${l.mensagem.substring(
          0,
          70
        )}...`;
        return { name: nome, value: l.id.toString() };
      });

      const filtered = choices.filter((choice) =>
        choice.name.toLowerCase().includes(focusedValue.toLowerCase())
      );
      await interaction.respond(filtered.slice(0, 25));
    }
  } catch (error) {
    console.error("Erro no autocomplete:", error);
  }
}

module.exports = { handleAutocomplete };
