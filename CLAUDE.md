# Niro Character Manager — Guia para Claude Code

## Como trabalhar comigo

- **Idioma: português (BR)** em tudo — respostas, comentários de código, mensagens de
  commit, textos de UI.
- **Sou leigo em programação.** Não assuma que eu lembro comandos ou caminhos de
  arquivo. Quando pedir algo de mim, dê o caminho completo e o comando pronto para
  copiar e colar.
- **Respostas breves e objetivas.** Sem preâmbulo, sem repetir o que eu acabei de
  escrever. O que mudou, onde, e se você testou.
- **Autonomia total dentro do pedido.** Implemente, valide e commite de ponta a ponta e
  só então me relate. Não pergunte "quer que eu faça X?" a cada passo. Só pergunte se
  houver ambiguidade real ou ação destrutiva/irreversível.
- **Não invente escopo nem reduza escopo.** Se algo ficou bloqueado, faça todo o resto
  e me diga explicitamente o que ficou de fora e por quê.
- Se o teste falhou, diga que falhou com a saída real. Nunca declare "pronto e
  funcionando" sem ter verificado.

## Fluxo de trabalho — sempre abrir PR após alteração

Depois de commitar em uma branch, verifique se já existe PR aberta para ela. Se não
houver, abra imediatamente, sem perguntar. Branch commitada sem PR fica invisível no
meu fluxo de revisão.

⚠️ **Atenção neste repo:** a branch padrão do remoto **não é `main`** — hoje é
`claude/niro-character-system-nqtxoo`. Confirme a branch padrão antes de abrir a PR em
vez de assumir `main`.

## Stack

- **Backend:** Flask (`app.py`, monolito de rotas) + `db.py` para acesso ao banco
- **Banco:** SQLite em `niro.db`, criado automaticamente no primeiro boot
- **Frontend:** Jinja2 (`templates/`) + CSS puro (`static/css/style.css`) + JS vanilla
  em `static/js/`, **sem build step**. Não introduza bundler, React ou npm.
- **Config:** `.env` (a partir de `.env.example`), lido com `python-dotenv`
- **IA:** Google AI Studio (Gemini), chave em `GOOGLE_AI_API_KEY`, modelo configurável
  no `.env`
- **Uploads:** `static/uploads/`, imagens mantidas na resolução original
- Roda local em `http://localhost:3004` (ou a próxima porta livre) — `run.bat` no
  Windows, `python app.py` no Linux/Mac

## Padrões do projeto

- **Um arquivo JS por página**, com o nome do módulo (`chars.js`, `teams.js`,
  `banners.js`, `history.js`, `params.js`, `character_form.js`). Compartilhado vai para
  `main.js`.
- **Todo campo de imagem aceita três entradas: upload, Ctrl+V e arrastar-e-soltar.**
  Campo novo de imagem tem que suportar os três.
- **Exclusão nunca apaga na hora.** Personagem excluído vai para o Arquivo por 30 dias
  e pode ser restaurado. Mantenha esse comportamento em qualquer entidade nova que
  ganhe exclusão.
- **Parâmetro em uso não pode ser excluído sem substituto.** Editar um parâmetro
  (região, afiliação, elemento, arma) propaga aos personagens; excluir um que está em
  uso exige escolher um substituto.
- **Chave de API só no `.env`.** Nunca no código, nunca no commit. Campo novo de config
  vai também para o `.env.example`, com o valor vazio.

### Diálogos de confirmação — nunca `confirm()`/`prompt()` nativos

Abrem janela do sistema operacional, fora do tema visual. Use um modal temático do
próprio projeto (crie o helper em `main.js` na primeira vez e reutilize depois).

### Operações longas precisam de barra de progresso

Qualquer coisa que possa passar de ~2 segundos — **em especial as chamadas de IA do
botão ✦** (Ataque Normal, Skill 1, Skill 2, Ultimate, Personalidade, Lore) e uploads de
imagem grandes — **não deve bloquear o request HTTP**. Padrão: a rota `POST` dispara
uma thread, guarda o estado num task store em memória e devolve `202` com um `task_id`;
o frontend faz polling de `GET /api/.../tasks/<task_id>` a cada ~800ms e atualiza a
barra até `status == 'done'`.

## Automação de navegador (se algum dia surgir)

- Nunca contornar o site por API/scraping — abrir um Chromium real **visível** via
  Playwright, com perfil persistente (`launch_persistent_context`) para reaproveitar o
  login, e **nunca clicar em "Enviar" sozinho**: preenche tudo e devolve o controle
  para mim revisar.
- Localizar campo pelo texto da pergunta **normalizado** (sem acento, minúsculo), com
  fallback por posição numérica — e reportar o fallback separadamente.
- Rádio/checkbox: usar `get_by_role('radio', name=...)` do Playwright (motor de
  acessibilidade do navegador). Nunca extrair o texto da opção do DOM na mão — quebra
  de verdade quando as opções são elementos-irmãos.
- Todo campo escrito precisa ser **lido de volta e verificado**, com nova tentativa se
  não bateu.
- Testar contra uma réplica local em HTML antes de me pedir para validar em produção.
