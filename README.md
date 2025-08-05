# Logzito - Seu Diário de Bordo no Discord

<div align="center">
  <img src="https://i.imgur.com/0iHxhnr.gif" alt="Logzito Banner" width="800"/>
  <p><strong>Transforme seu servidor do Discord em um espaço de crescimento pessoal e colaborativo.</strong></p>
  <p>Um bot de diário privado para documentar sua jornada de aprendizado, reflexões e metas.</p>
  
  <p>
    <img src="https://img.shields.io/badge/Discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord.js v14"/>
    <img src="https://img.shields.io/badge/Supabase-GREEN?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase"/>
    <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js"/>
  </p>
</div>

---

## 🚀 O que é o Logzito?

**Logzito** é um bot de diário pessoal para Discord, projetado para ajudar membros de comunidades a documentar sua jornada de aprendizado, reflexões e metas de forma privada, organizada e motivadora.

Ideal para comunidades de **estudo, desenvolvimento, produtividade ou bem-estar**, ele permite que cada membro mantenha um diário pessoal através de mensagens efêmeras (visíveis apenas para o autor), com a opção de compartilhar entradas específicas em um canal público para celebrar conquistas e receber feedback.

## ✨ Funcionalidades Principais

- ✍️ **Diário Pessoal e Privado:** Registre suas ideias com total privacidade.
- 🤝 **Compartilhamento Seletivo:** Escolha quais entradas compartilhar com a comunidade.
- 💬 **Interação Social:** Comente e reaja às entradas compartilhadas.
- 🏷️ **Organização com Tags:** Categorize suas entradas e filtre-as facilmente.
- 🔗 **Suporte a Mídia:** Anexe links, imagens e gifs.
- ⏰ **Lembretes Personalizados:** Crie lembretes diários via DM com fusos horários customizados.
- 📅 **Calendário Visual:** Acompanhe sua frequência de escrita.
- 📊 **Gráfico de Atividade:** Visualize seu progresso com um gráfico de atividade.
- 📥 **Exportação Completa:** Exporte seu diário para um arquivo `.txt`.

---

## 💌 Como Usar o Logzito

Você pode usar o Logzito de duas maneiras: adicionando-o a um servidor ou instalando-o para uso pessoal em suas mensagens diretas.

### Opção 1: Adicionar a um Servidor (Recomendado para Comunidades)

Use este link para que um administrador adicione o Logzito a um servidor. Isso permite que todos os membros o utilizem nos canais configurados.

[**>> Adicionar ao Servidor <<**](https://discord.com/oauth2/authorize?client_id=1385074445244305418&permissions=379904&integration_type=0&scope=bot+applications.commands)

### Opção 2: Instalar para Uso Pessoal (DM)

Use este link para instalar o Logzito diretamente na sua conta. Você poderá interagir com ele em suas mensagens diretas (DM).

[**>> Instalar para Uso Pessoal <<**](https://discord.com/oauth2/authorize?client_id=1385074445244305418&integration_type=1&scope=applications.commands)

**Como encontrar o bot após a instalação pessoal:**

1. Vá para suas Mensagens Diretas no Discord.
2. Na barra de busca "Encontrar ou começar uma conversa", digite `Logzito`.
3. Clique no bot para iniciar a conversa e usar os comandos.

---

## 🛠️ Configuração no Servidor

Após adicionar o bot a um servidor, um administrador precisa configurá-lo:

1.  **Configure os Canais (Admin):** Use o comando `/logzito config` para definir onde os comandos serão usados e onde as entradas públicas serão postadas.
    ```
    /logzito config canal_comandos:#seu-canal-de-comandos canal_compartilhar:#seu-canal-publico
    ```
2.  **Inicie seu Diário:** No canal de comandos configurado, use `/logzito iniciar`.
3.  **Comece a Registrar:** Use `/registro adicionar` para criar sua primeira entrada!

### Hospedagem Própria

Se você deseja hospedar o Logzito por conta própria, siga estes passos:

1.  **Clone o Repositório:**
    ```bash
    git clone https://github.com/Numbzin/logzito.git
    cd logzito
    ```
2.  **Instale as Dependências:**
    ```bash
    npm install
    ```
3.  **Configure as Variáveis de Ambiente:**
    Crie um arquivo `.env` na raiz do projeto e adicione as seguintes variáveis:
    ```
    TOKEN=seu-token-do-bot
    CLIENT_ID=seu-client-id-do-bot
    GUILD_ID=seu-id-do-servidor-de-desenvolvimento
    SUPABASE_URL=sua-url-do-supabase
    SUPABASE_KEY=sua-chave-do-supabase
    ```
4.  **Inicie o Bot:**
    ```bash
    node index.js
    ```

---

## 📦 Guia de Comandos

### Comandos Principais (`/logzito`)

- **/logzito `iniciar`**: Inicia seu diário pessoal no servidor.
- **/logzito `status`**: Mostra suas estatísticas e um gráfico de atividade.
- **/logzito `config`** `(Admin)`: Define os canais de comandos e de compartilhamento.
- **/logzito `lembrar`**: Ativa/desativa um lembrete diário.

### Gerenciamento de Registros (`/registro`)

- **/registro `adicionar`**: Adiciona uma nova entrada ao diário.
- **/registro `ver`**: Visualiza suas entradas com paginação.
- **/registro `editar`**: Edita uma entrada existente.
- **/registro `excluir`**: Exclui uma de suas entradas.
- **/registro `compartilhar`**: Compartilha uma entrada no canal público.
- **/registro `comentar`**: Adiciona um comentário a uma de suas entradas.
- **/registro `filtrar`**: Filtra suas entradas por uma tag.
- **/registro `exportar`**: Exporta seu diário para um arquivo `.txt`.
- **/registro `calendario`**: Mostra um calendário com seus dias de registro.

---

## 🙌 Como Contribuir

Se quiser contribuir com melhorias, ideias ou ajustes no código, sinta-se à vontade!

1.  Faça um **fork** do projeto.
2.  Crie uma nova branch: `git checkout -b feat/nova-funcionalidade`.
3.  Faça commit das suas mudanças: `git commit -m 'feat: Adiciona nova funcionalidade incrível'`.
4.  Envie o push para a branch: `git push origin feat/nova-funcionalidade`.
5.  Abra um **Pull Request**.

---

## 📬 Contato

Dúvidas, ideias ou sugestões? Fale com o criador do Logzito no Discord: **<@Numbzin>**
