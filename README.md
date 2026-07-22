# Niro Character Manager

Sistema web local para organizar os personagens do projeto **Niro**: cadastro de personagens com cards (completo e promo), parâmetros do mundo (regiões, afiliações, elementos, armas), montagem de banners por versão e histórico de ausência de personagens em banners.

## Como rodar (Windows)

1. Instale o [Python 3.10+](https://www.python.org/downloads/) (marque "Add Python to PATH").
2. Dê dois cliques em **`run.bat`**.
3. Na primeira execução, um arquivo `.env` será criado — abra-o e cole sua chave do Google AI Studio em `GOOGLE_AI_API_KEY=` para habilitar o preenchimento por IA.
4. O sistema abre automaticamente no navegador em `http://localhost:3004` (ou na próxima porta livre).

## Como rodar (Linux/Mac)

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # e edite a chave
python app.py
```

## Hospedagem on-line (Railway)

O sistema roda tanto localmente quanto hospedado na nuvem. No [Railway](https://railway.app):

1. **Crie o projeto** a partir deste repositório do GitHub (New Project → Deploy from GitHub repo). O Railway detecta o Python e usa o `Procfile`/`railway.json` para subir com **gunicorn** automaticamente.
2. **Adicione um volume persistente** ao serviço (aba *Variables/Settings → Volumes*) com mount path, por exemplo, `/data`. Isso é **essencial**: o disco do container é efêmero e, sem o volume, o banco e as imagens seriam perdidos a cada deploy.
3. **Configure as variáveis de ambiente** do serviço:
   - `DATA_DIR=/data` — mesmo mount path do volume (guarda o `niro.db` e a pasta `uploads/`).
   - `GOOGLE_AI_API_KEY=<sua chave>` — para o preenchimento por IA (opcional).
   - `GOOGLE_AI_MODEL=gemini-flash-latest` — opcional.
   - `PORT` é fornecida automaticamente pelo Railway; não precisa definir.
4. **Gere o domínio público** (Settings → Networking → Generate Domain) e acesse. Não há login — o sistema fica aberto, conforme o uso pessoal pretendido.

### Migrando os dados locais para a nuvem

Depois de subir a versão on-line (que começa com o banco vazio), leve seus dados locais:

1. Na sua máquina, abra o sistema local, vá em **Parâmetros → Dados** e clique em **Baixar backup (.zip)**. O arquivo contém o `niro.db` e todas as imagens.
2. Na versão on-line, abra **Parâmetros → Dados**, selecione esse `.zip` em **Importar backup** e confirme. Isso **substitui** o banco e mescla as imagens.

O mesmo botão de exportação também serve como backup periódico do sistema (local ou on-line).

### Instalar no iPhone (ícone na tela de início)

Com a versão on-line no ar, dá para usar como se fosse um app:

1. Abra o link público (Railway) no **Safari** do iPhone.
2. Toque em **Compartilhar** → **Adicionar à Tela de Início**.
3. O atalho aparece com o ícone da runa de Niro e abre em **tela cheia** (sem a barra do Safari).

A interface é responsiva: no celular o menu vira uma barra inferior de navegação.

## Módulos

| Módulo | Descrição |
|---|---|
| **Chars** | Galeria de personagens (card promo), com agrupamento em containers por Região, Afiliação, Elemento, Arma e Raridade (combináveis) e ordenação alfabética. |
| **Times** | Times de 4 personagens com nome. Slots podem usar "?" (bloco preto com interrogação) para posições desconhecidas. O bloco do nome tem um gradiente que mistura as cores dos elementos dos membros (o "?" é ignorado), com botão para alternar o formato do gradiente. Um personagem só pode estar em um time por vez. |
| **Banners** | Grade de banners por versão (colunas 1.x–8.x com nome) e subversão (linhas x.0–x.8). Tipos: Unitário (1×5⭐ + 3×4⭐), Duplo (2×5⭐ + 3×4⭐) e Especial (até 10×5⭐ + 5×4⭐). Personagens são adicionados via modal com filtros. |
| **Histórico** | Escolha o banner atual e veja, em gráfico de barras horizontais, há quantos banners cada personagem não aparece (5⭐ e depois 4⭐). |
| **Parâmetros** | Cadastro de Regiões, Afiliações, Elementos (nome + imagem) e Armas (nome + imagem). Edição propaga aos personagens; exclusão de item em uso exige escolher um substituto. |
| **Arquivo** | Personagens excluídos ficam aqui por 30 dias antes da remoção definitiva, podendo ser restaurados. |

## Preenchimento por IA

Nos campos *Ataque Normal, Skill 1, Skill 2, Ultimate, Personalidade* e *Lore* do cadastro de personagem há um botão ✦ que envia tudo o que já foi preenchido ao Google AI Studio (Gemini, modelo configurável no `.env`) e preenche o campo em tempo real.

## Dados

- Banco: `niro.db` (SQLite, criado automaticamente).
- Imagens: `static/uploads/` (mantidas na resolução original).
- Todos os campos de imagem aceitam **upload, Ctrl+V e arrastar-e-soltar**.
