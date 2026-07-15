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

## Módulos

| Módulo | Descrição |
|---|---|
| **Chars** | Galeria de personagens (card promo), com agrupamento em containers por Região, Afiliação, Elemento, Arma e Raridade (combináveis) e ordenação alfabética. |
| **Times** | Times de 4 personagens com nome. Slots podem usar "?" (bloco preto com interrogação) para posições desconhecidas. O bloco do nome tem um gradiente que mistura as cores dos elementos dos membros (o "?" é ignorado), com botão para alternar o formato do gradiente. Um personagem só pode estar em um time por vez. |
| **Banners** | Grade de banners por versão (colunas 1.x–8.x com nome) e subversão (linhas x.0–x.8). Tipos: Unitário (1×5⭐ + 3×4⭐), Duplo (2×5⭐ + 3×4⭐) e Especial (até 12×5⭐ + 4⭐ ilimitado), que fica recolhido e expande ao clicar no cabeçalho. Personagens são adicionados via modal com filtros. Quem aparece em um banner Especial fica bloqueado nas demais seleções do mesmo ciclo (versão x.*). Além disso, nenhum personagem pode aparecer em versões consecutivas, independentemente do tipo do banner. |
| **Histórico** | Escolha o banner atual e veja, em gráfico de barras horizontais, há quantos banners cada personagem não aparece (5⭐ e depois 4⭐). |
| **Parâmetros** | Cadastro de Regiões, Afiliações, Elementos (nome + imagem) e Armas (nome + imagem). Edição propaga aos personagens; exclusão de item em uso exige escolher um substituto. |
| **Arquivo** | Personagens excluídos ficam aqui por 30 dias antes da remoção definitiva, podendo ser restaurados. |

## Preenchimento por IA

Nos campos *Ataque Normal, Skill 1, Skill 2, Ultimate, Personalidade* e *Lore* do cadastro de personagem há um botão ✦ que envia tudo o que já foi preenchido ao Google AI Studio (Gemini, modelo configurável no `.env`) e preenche o campo em tempo real.

## Dados

- Banco: `niro.db` (SQLite, criado automaticamente).
- Imagens: `static/uploads/` (mantidas na resolução original).
- Todos os campos de imagem aceitam **upload, Ctrl+V e arrastar-e-soltar**.
