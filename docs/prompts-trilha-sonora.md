# Prompts de trilha sonora — Niro

Prompts prontos para gerar a trilha do slideshow do módulo Chars no MusicGen
(Colab) ou em geradores como Suno/Udio.

- **3 faixas para cada um dos 12 elementos** (36 faixas) e **3 faixas por região**,
  sendo pelo menos uma de cada região com coro em latim.
- Cada elemento tem as três faixas cobrindo facetas diferentes do que ele
  representa — nunca três variações da mesma ideia.
- Os prompts estão **em inglês de propósito**: todos esses modelos foram treinados
  com descrições em inglês e respondem muito melhor assim. O que você lê em
  português aqui é só a explicação.

---

## Como usar

1. Abra o Colab com o modelo carregado (ver o passo a passo que combinamos).
2. Copie o prompt, cole no lugar do `prompt = "..."` e rode.
3. **Gere de 2 a 3 vezes o mesmo prompt** — cada execução sai diferente, e a
   terceira costuma ser a boa.
4. `max_new_tokens=1500` ≈ 30 segundos. Como a trilha toca em loop por baixo do
   slideshow, 30s bastam. Para 1 minuto, use `3000`.
5. No fim, normalize o volume de todas as faixas no mesmo nível (o comando de
   `ffmpeg` com `loudnorm` já está na célula em lote) — senão o slideshow dá um
   solavanco de volume a cada troca de bloco.

### Nomes de arquivo sugeridos

Use o nome do elemento ou da região, em minúsculo e sem acento, com sufixo da
variação: `fae_1.mp3`, `fae_2.mp3`, `fae_3.mp3`, `cidadela_1.mp3`…
Isso facilita na hora de subir as faixas no app.

---

## ⚠️ Sobre a voz em latim

O MusicGen **não canta palavras**. Quando você pede coro, ele entrega a *textura*
de um coro — vozes sem letra inteligível, aquele "aaah" épico de trilha de filme.
Para trilha de fundo isso funciona muito bem e é o que os prompts abaixo pedem.

Se você quiser **latim de verdade, com palavras audíveis**, precisa de um gerador
com campo de letra (Suno ou Udio). Por isso, cada faixa com latim traz duas
versões:

- **MusicGen** — o prompt de textura coral, para colar no Colab.
- **Suno/Udio** — o estilo + a letra em latim, para colar nos campos "Style" e
  "Lyrics".

As letras em latim vêm com tradução, para você saber o que está sendo cantado
antes de colocar no vídeo.

---

# ELEMENTOS

## Aero — vento

*Calmo ou turbulento. Assovios e flautas são a assinatura do elemento.*

**1. Calmo**
```
gentle wind instrumental, solo wooden flute and soft human whistling, airy sustained pads, distant wind chimes, calm and open, breeze over empty plains, 90 BPM, minimal percussion, no vocals
```

**2. Voo**
```
soaring adventure instrumental, pan flute lead over sweeping strings, bright horns, weightless and free, flight above the clouds, 110 BPM, light cymbal swells, no vocals
```

**3. Turbulento**
```
turbulent orchestral instrumental, rapid piccolo and flute runs, whistling wind textures, urgent string ostinato, swirling and violent gale, 145 BPM, driving percussion, no vocals
```

## Aqua — água

*Fluidez e leveza, mas também mistério e pressão. Trompas, trompetes e cordas.*

**1. Fluidez**
```
flowing orchestral instrumental, legato strings and harp arpeggios, soft muted trumpet melody, gentle marimba, fluid and weightless, clear running river, 100 BPM, no vocals
```

**2. Mistério**
```
mysterious underwater instrumental, distant french horns, submerged string pads, sparse piano drops, deep reverb, unknown depths, 75 BPM, no drums, no vocals
```

**3. Pressão**
```
crushing deep sea instrumental, heavy low brass swells, dense cello section, slow taiko pulse, immense pressure, dark and vast, 65 BPM, no vocals
```

## Bio — natureza e vida

*Mistério bom, runas antigas, magia de conexão com a natureza. Cello com instrumentos indígenas.*

**1. Runas antigas**
```
ancient nature instrumental, solo cello over native wooden flute, frame drum and seed rattles, warm and living, old runes in a deep forest, 80 BPM, no vocals
```

**2. Crescimento**
```
mystical growth instrumental, layered cellos, ocarina and pan pipes, earthy hand percussion, soft wordless humming, benevolent mystery, 95 BPM
```

**3. Ritual**
```
ritual of life instrumental, tribal drums and shakers, cello ostinato, bone flute, layered chanting texture, primal and sacred, 110 BPM
```

## Electro — eletricidade

*Velocidade e picos de energia. Guitarra e bateria entram, mas não dominam as três faixas.*

**1. Carga orquestral**
```
electric hybrid orchestral instrumental, staccato strings with synth arpeggio, crackling energy textures, brass stabs, fast and charged, 130 BPM, no vocals
```

**2. Descarga**
```
high energy rock hybrid instrumental, distorted electric guitar riff, driving live drums, synth bass pulse, adrenaline surge, 150 BPM, no vocals
```

**3. Estática**
```
static charge ambient instrumental, humming electrical drone, glitchy percussive clicks, slow detuned synth pad, restrained tension before the strike, 70 BPM, no vocals
```

## Fae — fadas e magia

*Alegria, descobrimento, confraternização.*

**1. Alegria**
```
joyful fairy instrumental, celesta and glockenspiel, pizzicato strings, light flute, bright and playful, storybook magic, 115 BPM, tambourine, no vocals
```

**2. Descobrimento**
```
wonder and discovery instrumental, harp arpeggios, shimmering bells, warm strings swelling in awe, magic revealed, 90 BPM, no vocals
```

**3. Confraternização**
```
festive fairy dance instrumental, fiddle and tin whistle, hand claps and bodhran, accordion, communal celebration, 130 BPM, no vocals
```

## Flama — fogo

*Energia, alegria e protagonismo: o senso do herói e, ao mesmo tempo, o perigo do vilão.*

**1. Herói**
```
heroic orchestral instrumental, triumphant french horns and trumpets, soaring strings, timpani and cymbals, brave and blazing, 120 BPM, no vocals
```

**2. Perigo**
```
dangerous fire instrumental, low brass growls, aggressive string ostinato, crackling ember percussion, menacing and unpredictable, 135 BPM, no vocals
```

**3. Calor**
```
warm fireside instrumental, acoustic guitar and fiddle, hand percussion, bright horns, joyful and energetic, 110 BPM, no vocals
```

## Glacial — gelo

*Frieza e peso, com agudos extremos contra graves extremos. Perigo e a beleza dentro dele.*

**1. Extremos**
```
extreme range instrumental, very high sustained violin harmonics over very low contrabass drone, glassy bells, cold and vast, frozen beauty, 60 BPM, no vocals
```

**2. Peso**
```
heavy glacial instrumental, deep booming drums, low brass, piercing high string swells, crushing ice, dangerous and slow, 70 BPM, no vocals
```

**3. Cristalino**
```
crystalline ambient instrumental, high celesta and glass harmonica, subsonic drone, sparse piano, beautiful and lethal stillness, 55 BPM, no percussion, no vocals
```

## Kinetic — energia física

*Energia humana: vontade de conseguir, resiliência, determinação.*

**1. Determinação**
```
determined orchestral instrumental, driving string ostinato, steady taiko and snare, rising brass, relentless forward motion, 125 BPM, no vocals
```

**2. Esforço**
```
athletic percussive instrumental, body percussion and stomping drums, punchy brass hits, building raw energy, human effort, 140 BPM, no vocals
```

**3. Resiliência**
```
resilient emotional instrumental, solo piano over swelling strings, slow building drums, struggle turning into resolve, 100 BPM, no vocals
```

## Lumen — o sagrado

*Conexão com o divino. Harpa como instrumento central.*

**1. Serenidade**
```
sacred instrumental, solo harp and warm string pad, wordless female choir, cathedral reverb, serene and divine, 70 BPM, no drums
```

**2. Glória**
```
radiant sacred instrumental, full choir on open vowels, pipe organ and brass chorale, ringing bells, glorious and uplifting, 85 BPM
```

**3. Devoção**
```
quiet devotion instrumental, harp arpeggios, soft strings, distant boy soprano texture, intimate and reverent, 65 BPM, minimal, no drums
```

## Mineral — rocha, terra e metal

*Solidez. Convicção, firmeza, inabalável.*

**1. Firmeza**
```
grounded orchestral instrumental, low strings and heavy anvil percussion, steady tuba and trombone, unshakable and firm, 90 BPM, no vocals
```

**2. Forja**
```
forge instrumental, metallic hammer percussion, industrial textures, deep brass, relentless and solid, 105 BPM, no vocals
```

**3. Montanha**
```
mountain ambient instrumental, deep earth drone, sparse low piano, distant stone percussion, ancient and immovable, 60 BPM, no vocals
```

## Psy — dons psíquicos

*Místico e misterioso, na linha das músicas de meditação.*

**1. Meditação**
```
meditative ambient instrumental, singing bowls and soft drone, slow breathing pads, tranquil and trance like, 60 BPM, no percussion, no vocals
```

**2. Premonição**
```
psychic mystery instrumental, detuned celesta, reversed textures, whispering wordless voices, dissonant swells, uncanny and disorienting, 80 BPM
```

**3. Expansão**
```
cosmic mind instrumental, warm analog pads, slow evolving drone, distant wordless choir, vast inner space, 65 BPM, no percussion
```

## Umbra — o profano e oculto

*Tema de vilão: causa medo e dá a sensação de olhar para o proibido.*

**1. Rito**
```
sinister ritual instrumental, dark low male chanting texture, pipe organ, deep drums, church ruins reverb, forbidden and ominous, 75 BPM
```

**2. Vilão**
```
villain theme instrumental, menacing low brass, dissonant string clusters, slow ticking percussion, cold and calculating, 85 BPM, no vocals
```

**3. Pavor**
```
creeping dread ambient instrumental, sub bass drone, scraping metallic textures, distant whispers, fear of the unseen, 55 BPM, no clear beat
```

---

# REGIÕES (arquétipos — renomeie para as suas)

> Estes seis são moldes. Troque o nome e ajuste uma ou duas palavras do prompt
> (o bioma, o instrumento característico) para que ele descreva a sua região.

## Arquétipo 1 — Cidadela / Capital do império

**1. Tema oficial**
```
noble orchestral instrumental, heroic french horns, full string section, timpani and cymbal swells, proud and ceremonial, royal capital, 100 BPM, no vocals
```

**2. Vida na cidade**
```
warm medieval city instrumental, lute and hurdy gurdy, tambourine, fiddle melody, bustling and welcoming, market square, 115 BPM, no vocals
```

**3. 🕯️ Hino da cidadela — COM LATIM**

*MusicGen (textura coral):*
```
epic sacred orchestral instrumental, full latin style choir singing wordless vowels, cathedral reverb, brass chorale and pipe organ, solemn and monumental, 80 BPM
```

*Suno/Udio — Style:*
```
epic sacred choral, orchestral, cathedral reverb, male and female choir, brass chorale, solemn, cinematic
```

*Suno/Udio — Lyrics:*
```
Regnum stat, nomen manet
Sub sole aeterno canimus
Fortes sumus, fortes erimus
Gloria, gloria civitati
```
> *O reino permanece, o nome perdura / Sob o sol eterno cantamos / Somos fortes,
> seremos fortes / Glória, glória à cidade*

## Arquétipo 2 — Terras Geladas / Norte

**1. Desolação**
```
cold ambient orchestral instrumental, sustained high strings, low drone, sparse piano notes, icy and desolate, frozen wasteland, 60 BPM, no percussion, no vocals
```

**2. Marcha no gelo**
```
somber marching instrumental, low male wordless chant, heavy drums, bowed cellos, cold and relentless, warriors crossing the ice, 95 BPM
```

**3. 🕯️ Lamento do norte — COM LATIM**

*MusicGen (textura coral):*
```
mournful sacred instrumental, distant latin style choir on sustained vowels, solo cello, deep drone, frozen cathedral atmosphere, grieving and vast, 65 BPM
```

*Suno/Udio — Style:*
```
mournful choral, dark orchestral, solo cello, deep male choir, vast reverb, funeral procession, slow
```

*Suno/Udio — Lyrics:*
```
Nix cadit, silentium regnat
Dormiunt sub glacie
Memento nominum
Requiescant in pace alba
```
> *A neve cai, o silêncio reina / Eles dormem sob o gelo / Lembra-te dos nomes /
> Descansem na paz branca*

## Arquétipo 3 — Floresta Antiga

**1. Sob as copas**
```
mystical forest ambient instrumental, wooden flute, soft nylon guitar, nature textures, gentle strings, ancient and alive, 75 BPM, no vocals
```

**2. Ritual**
```
tribal ritual instrumental, frame drums and shakers, low wooden flute, layered wordless chanting, primal and hypnotic, 105 BPM
```

**3. 🕯️ Oração das raízes — COM LATIM**

*MusicGen (textura coral):*
```
sacred nature instrumental, soft latin style female choir on open vowels, harp and low strings, forest reverb, reverent and ancient, 70 BPM
```

*Suno/Udio — Style:*
```
sacred female choir, ethereal folk orchestral, harp, forest ambience, reverent, slow and warm
```

*Suno/Udio — Lyrics:*
```
Radices tenent terram
Arbores vident omnia
Silva meminit, silva tacet
Dormi, dormi in viridi
```
> *As raízes seguram a terra / As árvores veem tudo / A floresta lembra, a
> floresta cala / Dorme, dorme no verde*

## Arquétipo 4 — Deserto / Terras Áridas

**1. Horizonte**
```
arid desert instrumental, duduk and oud, sparse frame drum, shimmering heat pads, lonely and endless, sun scorched dunes, 80 BPM, no vocals
```

**2. Caravana**
```
exotic rhythmic instrumental, darbuka and riq percussion, oud melody, low strings drone, traveling and determined, 120 BPM, no vocals
```

**3. 🕯️ Cidade enterrada — COM LATIM**

*MusicGen (textura coral):*
```
ancient ruins instrumental, distant latin style choir on long vowels, low drone, sparse metallic percussion, haunting and forgotten, buried civilization, 70 BPM
```

*Suno/Udio — Style:*
```
haunting ancient choral, desert orchestral, drone, distant echoing choir, mysterious ruins, slow
```

*Suno/Udio — Lyrics:*
```
Harena omnia tegit
Ubi sunt qui ante nos fuerunt
Vox in deserto clamat
Nihil manet, nihil manet
```
> *A areia cobre tudo / Onde estão os que vieram antes de nós / Uma voz clama no
> deserto / Nada permanece, nada permanece*

## Arquétipo 5 — Costa / Cidade Portuária

**1. Maré**
```
coastal folk instrumental, acoustic guitar and accordion, soft fiddle, gentle wave textures, salty and welcoming, harbor at sunset, 95 BPM, no vocals
```

**2. Partida**
```
adventurous sea instrumental, sweeping strings, bold brass, rolling snare, hopeful and expansive, ship leaving port, 125 BPM, no vocals
```

**3. 🕯️ Canto dos afogados — COM LATIM**

*MusicGen (textura coral):*
```
melancholic maritime instrumental, low male latin style choir on sustained vowels, creaking ship textures, solo violin, deep water reverb, mournful, 70 BPM
```

*Suno/Udio — Style:*
```
sea shanty choral, low male choir, melancholic orchestral, violin, deep reverb, slow and heavy
```

*Suno/Udio — Lyrics:*
```
Omnia flumina ad mare currunt
Mare non reddit quod accepit
Audi nos, mater undarum
Salve, salve, ultima ripa
```
> *Todos os rios correm para o mar / O mar não devolve o que recebeu / Ouve-nos,
> mãe das ondas / Salve, salve, última margem*

## Arquétipo 6 — Terras Sombrias / Ruínas

**1. Ameaça**
```
dark ominous instrumental, low brass drones, dissonant string clusters, sparse deep drums, oppressive and dreadful, cursed land, 60 BPM, no vocals
```

**2. Perseguição**
```
dark orchestral action instrumental, aggressive low strings ostinato, pounding taiko, brass hits, urgent and threatening, 140 BPM, no vocals
```

**3. 🕯️ Rito proibido — COM LATIM**

*MusicGen (textura coral):*
```
sinister sacred instrumental, dark latin style male choir chanting on low vowels, pipe organ, deep drums, church ruins reverb, ominous and ritualistic, 75 BPM
```

*Suno/Udio — Style:*
```
dark sacred choral, gregorian style male chant, pipe organ, deep drums, sinister cinematic, ritual
```

*Suno/Udio — Lyrics:*
```
In tenebris vocamus
Quod dormit non est mortuum
Sanguis et ferrum, sanguis et umbra
Venit hora, venit finis
```
> *Nas trevas nós chamamos / O que dorme não está morto / Sangue e ferro, sangue
> e sombra / Vem a hora, vem o fim*

---

# Tema de abertura do slideshow (bônus)

Uma faixa curta para os primeiros segundos, antes do primeiro personagem:

```
short epic orchestral fanfare, rising strings and brass swell, timpani roll, cymbal crash, grand and expectant, 15 seconds, no vocals
```

---

# Notebook pronto (atalho)

Em vez de montar as células na mão, use o arquivo **`docs/niro-trilha-sonora.ipynb`**
deste repositório: no Colab, menu **Arquivo → Fazer upload de notebook**, escolha
esse arquivo e tudo já está lá, na ordem certa.

Depois de subir: **Ambiente de execução → Alterar o tipo de ambiente de execução →
T4 GPU**, e vá rodando as células de cima para baixo.

As células abaixo são as mesmas do notebook, caso você prefira colar uma a uma.

# Células do Colab

Rode na ordem. A primeira só precisa ser rodada uma vez por sessão (se o Colab
desconectar, rode de novo antes das outras).

### 1. Conferir a GPU

```python
!nvidia-smi
```

Tem que aparecer "Tesla T4". Se não aparecer, vá em **Ambiente de execução →
Alterar o tipo de ambiente de execução → T4 GPU**.

### 2. Carregar o modelo (2-3 min na primeira vez)

```python
from transformers import pipeline
import torch

gerador = pipeline(
    "text-to-audio",
    model="facebook/musicgen-small",
    device=0 if torch.cuda.is_available() else -1,
)
print("Modelo carregado.")
```

### 3. Gerar uma faixa de teste

```python
import numpy as np
import scipy.io.wavfile
from IPython.display import Audio

prompt = "ethereal fantasy instrumental, celesta and harp, breathy choir, whimsical, 85 BPM, no vocals"

saida = gerador(prompt, forward_params={"do_sample": True, "max_new_tokens": 1500})

audio = np.squeeze(saida["audio"])
if audio.ndim > 1:
    audio = audio.T

scipy.io.wavfile.write("teste.wav", rate=saida["sampling_rate"], data=audio)
Audio("teste.wav")
```

### 4. Geração em lote — ELEMENTOS

Cole a célula inteira (dicionário + laço) e rode. São 36 faixas, ~25 a 35
minutos no total. O progresso aparece embaixo da célula, um nome por vez.

```python
TEMAS = {
    "aero_1":     "gentle wind instrumental, solo wooden flute and soft human whistling, airy sustained pads, distant wind chimes, calm and open, breeze over empty plains, 90 BPM, minimal percussion, no vocals",
    "aero_2":     "soaring adventure instrumental, pan flute lead over sweeping strings, bright horns, weightless and free, flight above the clouds, 110 BPM, light cymbal swells, no vocals",
    "aero_3":     "turbulent orchestral instrumental, rapid piccolo and flute runs, whistling wind textures, urgent string ostinato, swirling and violent gale, 145 BPM, driving percussion, no vocals",
    "aqua_1":     "flowing orchestral instrumental, legato strings and harp arpeggios, soft muted trumpet melody, gentle marimba, fluid and weightless, clear running river, 100 BPM, no vocals",
    "aqua_2":     "mysterious underwater instrumental, distant french horns, submerged string pads, sparse piano drops, deep reverb, unknown depths, 75 BPM, no drums, no vocals",
    "aqua_3":     "crushing deep sea instrumental, heavy low brass swells, dense cello section, slow taiko pulse, immense pressure, dark and vast, 65 BPM, no vocals",
    "bio_1":      "ancient nature instrumental, solo cello over native wooden flute, frame drum and seed rattles, warm and living, old runes in a deep forest, 80 BPM, no vocals",
    "bio_2":      "mystical growth instrumental, layered cellos, ocarina and pan pipes, earthy hand percussion, soft wordless humming, benevolent mystery, 95 BPM",
    "bio_3":      "ritual of life instrumental, tribal drums and shakers, cello ostinato, bone flute, layered chanting texture, primal and sacred, 110 BPM",
    "electro_1":  "electric hybrid orchestral instrumental, staccato strings with synth arpeggio, crackling energy textures, brass stabs, fast and charged, 130 BPM, no vocals",
    "electro_2":  "high energy rock hybrid instrumental, distorted electric guitar riff, driving live drums, synth bass pulse, adrenaline surge, 150 BPM, no vocals",
    "electro_3":  "static charge ambient instrumental, humming electrical drone, glitchy percussive clicks, slow detuned synth pad, restrained tension before the strike, 70 BPM, no vocals",
    "fae_1":      "joyful fairy instrumental, celesta and glockenspiel, pizzicato strings, light flute, bright and playful, storybook magic, 115 BPM, tambourine, no vocals",
    "fae_2":      "wonder and discovery instrumental, harp arpeggios, shimmering bells, warm strings swelling in awe, magic revealed, 90 BPM, no vocals",
    "fae_3":      "festive fairy dance instrumental, fiddle and tin whistle, hand claps and bodhran, accordion, communal celebration, 130 BPM, no vocals",
    "flama_1":    "heroic orchestral instrumental, triumphant french horns and trumpets, soaring strings, timpani and cymbals, brave and blazing, 120 BPM, no vocals",
    "flama_2":    "dangerous fire instrumental, low brass growls, aggressive string ostinato, crackling ember percussion, menacing and unpredictable, 135 BPM, no vocals",
    "flama_3":    "warm fireside instrumental, acoustic guitar and fiddle, hand percussion, bright horns, joyful and energetic, 110 BPM, no vocals",
    "glacial_1":  "extreme range instrumental, very high sustained violin harmonics over very low contrabass drone, glassy bells, cold and vast, frozen beauty, 60 BPM, no vocals",
    "glacial_2":  "heavy glacial instrumental, deep booming drums, low brass, piercing high string swells, crushing ice, dangerous and slow, 70 BPM, no vocals",
    "glacial_3":  "crystalline ambient instrumental, high celesta and glass harmonica, subsonic drone, sparse piano, beautiful and lethal stillness, 55 BPM, no percussion, no vocals",
    "kinetic_1":  "determined orchestral instrumental, driving string ostinato, steady taiko and snare, rising brass, relentless forward motion, 125 BPM, no vocals",
    "kinetic_2":  "athletic percussive instrumental, body percussion and stomping drums, punchy brass hits, building raw energy, human effort, 140 BPM, no vocals",
    "kinetic_3":  "resilient emotional instrumental, solo piano over swelling strings, slow building drums, struggle turning into resolve, 100 BPM, no vocals",
    "lumen_1":    "sacred instrumental, solo harp and warm string pad, wordless female choir, cathedral reverb, serene and divine, 70 BPM, no drums",
    "lumen_2":    "radiant sacred instrumental, full choir on open vowels, pipe organ and brass chorale, ringing bells, glorious and uplifting, 85 BPM",
    "lumen_3":    "quiet devotion instrumental, harp arpeggios, soft strings, distant boy soprano texture, intimate and reverent, 65 BPM, minimal, no drums",
    "mineral_1":  "grounded orchestral instrumental, low strings and heavy anvil percussion, steady tuba and trombone, unshakable and firm, 90 BPM, no vocals",
    "mineral_2":  "forge instrumental, metallic hammer percussion, industrial textures, deep brass, relentless and solid, 105 BPM, no vocals",
    "mineral_3":  "mountain ambient instrumental, deep earth drone, sparse low piano, distant stone percussion, ancient and immovable, 60 BPM, no vocals",
    "psy_1":      "meditative ambient instrumental, singing bowls and soft drone, slow breathing pads, tranquil and trance like, 60 BPM, no percussion, no vocals",
    "psy_2":      "psychic mystery instrumental, detuned celesta, reversed textures, whispering wordless voices, dissonant swells, uncanny and disorienting, 80 BPM",
    "psy_3":      "cosmic mind instrumental, warm analog pads, slow evolving drone, distant wordless choir, vast inner space, 65 BPM, no percussion",
    "umbra_1":    "sinister ritual instrumental, dark low male chanting texture, pipe organ, deep drums, church ruins reverb, forbidden and ominous, 75 BPM",
    "umbra_2":    "villain theme instrumental, menacing low brass, dissonant string clusters, slow ticking percussion, cold and calculating, 85 BPM, no vocals",
    "umbra_3":    "creeping dread ambient instrumental, sub bass drone, scraping metallic textures, distant whispers, fear of the unseen, 55 BPM, no clear beat",
}

import os, numpy as np, scipy.io.wavfile

os.makedirs("trilhas", exist_ok=True)

for nome, p in TEMAS.items():
    print("Gerando:", nome)
    saida = gerador(p, forward_params={"do_sample": True, "max_new_tokens": 1500})
    audio = np.squeeze(saida["audio"])
    if audio.ndim > 1:
        audio = audio.T
    scipy.io.wavfile.write(f"trilhas/{nome}.wav", rate=saida["sampling_rate"], data=audio)
    os.system(
        f"ffmpeg -y -loglevel error -i trilhas/{nome}.wav "
        f"-af loudnorm=I=-16:TP=-1.5:LRA=11 -b:a 160k trilhas/{nome}.mp3"
    )
    os.remove(f"trilhas/{nome}.wav")

print("Pronto. Arquivos em trilhas/")
```

### 5. Geração em lote — REGIÕES

Mesma coisa para as regiões: 18 faixas, ~12 a 18 minutos. **Renomeie as chaves**
(`cidadela_1`, `gelo_1`…) para os nomes das suas regiões antes de rodar, e ajuste
o bioma/instrumento no texto quando fizer sentido.

```python
TEMAS = {
    "cidadela_1": "noble orchestral instrumental, heroic french horns, full string section, timpani and cymbal swells, proud and ceremonial, royal capital, 100 BPM, no vocals",
    "cidadela_2": "warm medieval city instrumental, lute and hurdy gurdy, tambourine, fiddle melody, bustling and welcoming, market square, 115 BPM, no vocals",
    "cidadela_3": "epic sacred orchestral instrumental, full latin style choir singing wordless vowels, cathedral reverb, brass chorale and pipe organ, solemn and monumental, 80 BPM",
    "gelo_1":     "cold ambient orchestral instrumental, sustained high strings, low drone, sparse piano notes, icy and desolate, frozen wasteland, 60 BPM, no percussion, no vocals",
    "gelo_2":     "somber marching instrumental, low male wordless chant, heavy drums, bowed cellos, cold and relentless, warriors crossing the ice, 95 BPM",
    "gelo_3":     "mournful sacred instrumental, distant latin style choir on sustained vowels, solo cello, deep drone, frozen cathedral atmosphere, grieving and vast, 65 BPM",
    "floresta_1": "mystical forest ambient instrumental, wooden flute, soft nylon guitar, nature textures, gentle strings, ancient and alive, 75 BPM, no vocals",
    "floresta_2": "tribal ritual instrumental, frame drums and shakers, low wooden flute, layered wordless chanting, primal and hypnotic, 105 BPM",
    "floresta_3": "sacred nature instrumental, soft latin style female choir on open vowels, harp and low strings, forest reverb, reverent and ancient, 70 BPM",
    "deserto_1":  "arid desert instrumental, duduk and oud, sparse frame drum, shimmering heat pads, lonely and endless, sun scorched dunes, 80 BPM, no vocals",
    "deserto_2":  "exotic rhythmic instrumental, darbuka and riq percussion, oud melody, low strings drone, traveling and determined, 120 BPM, no vocals",
    "deserto_3":  "ancient ruins instrumental, distant latin style choir on long vowels, low drone, sparse metallic percussion, haunting and forgotten, buried civilization, 70 BPM",
    "costa_1":    "coastal folk instrumental, acoustic guitar and accordion, soft fiddle, gentle wave textures, salty and welcoming, harbor at sunset, 95 BPM, no vocals",
    "costa_2":    "adventurous sea instrumental, sweeping strings, bold brass, rolling snare, hopeful and expansive, ship leaving port, 125 BPM, no vocals",
    "costa_3":    "melancholic maritime instrumental, low male latin style choir on sustained vowels, creaking ship textures, solo violin, deep water reverb, mournful, 70 BPM",
    "sombrias_1": "dark ominous instrumental, low brass drones, dissonant string clusters, sparse deep drums, oppressive and dreadful, cursed land, 60 BPM, no vocals",
    "sombrias_2": "dark orchestral action instrumental, aggressive low strings ostinato, pounding taiko, brass hits, urgent and threatening, 140 BPM, no vocals",
    "sombrias_3": "sinister sacred instrumental, dark latin style male choir chanting on low vowels, pipe organ, deep drums, church ruins reverb, ominous and ritualistic, 75 BPM",
}

import os, numpy as np, scipy.io.wavfile

os.makedirs("trilhas", exist_ok=True)

for nome, p in TEMAS.items():
    print("Gerando:", nome)
    saida = gerador(p, forward_params={"do_sample": True, "max_new_tokens": 1500})
    audio = np.squeeze(saida["audio"])
    if audio.ndim > 1:
        audio = audio.T
    scipy.io.wavfile.write(f"trilhas/{nome}.wav", rate=saida["sampling_rate"], data=audio)
    os.system(
        f"ffmpeg -y -loglevel error -i trilhas/{nome}.wav "
        f"-af loudnorm=I=-16:TP=-1.5:LRA=11 -b:a 160k trilhas/{nome}.mp3"
    )
    os.remove(f"trilhas/{nome}.wav")

print("Pronto. Arquivos em trilhas/")
```

### 6. Baixar tudo

```python
!zip -qr trilhas.zip trilhas
from google.colab import files
files.download("trilhas.zip")
```

Se o navegador bloquear o download, clique no ícone de **pasta** na barra
lateral esquerda do Colab, abra `trilhas` e baixe pelos três pontinhos de cada
arquivo.

> **Erros comuns.** `IndexError: too many indices` significa que o áudio veio em
> 1 dimensão — é o que o `np.squeeze` das células acima já resolve. O aviso
> amarelo sobre `generation_config` é inofensivo, pode ignorar. Se a sessão cair
> no meio do lote, rode de novo a célula 2 (carregar o modelo) antes de repetir
> a do lote — os arquivos já gerados continuam em `trilhas/` e serão
> sobrescritos sem problema.

---

# Vocabulário para você criar os seus

Trocando uma ou duas palavras dessas listas, o prompt vira outra coisa. Tudo em
inglês, que é o que os modelos entendem melhor.

**Clima:** `epic`, `melancholic`, `ominous`, `serene`, `whimsical`, `tense`,
`triumphant`, `haunting`, `sacred`, `playful`, `desolate`, `mysterious`

**Instrumentos:** `harp`, `celesta`, `glockenspiel`, `french horns`, `low brass`,
`cellos`, `pizzicato strings`, `taiko drums`, `frame drum`, `pipe organ`,
`wooden flute`, `duduk`, `oud`, `lute`, `analog synth pads`

**Vozes:** `wordless female choir`, `low male chant`, `latin style choir`,
`breathy soprano`, `whispering voices` — lembrando que no MusicGen tudo isso sai
como textura, não como palavras.

**Ritmo:** `60 BPM` (lento e pesado) · `90 BPM` (caminhada) · `120 BPM` (ação) ·
`140+ BPM` (perseguição)

**Palavras que ajudam no slideshow:** `loopable`, `no vocals`, `minimal`,
`sparse`, `no percussion`, `building`, `cinematic`

---

# Checklist depois de gerar

- [ ] Ouvi 2-3 variações de cada prompt e fiquei com a melhor
- [ ] Normalizei o volume de todas no mesmo nível (`loudnorm` do ffmpeg)
- [ ] Converti para mp3 160 kbps
- [ ] Nomeei pelo elemento/região, minúsculo e sem acento
- [ ] Anotei o crédito: "trilha gerada com MusicGen (Meta)" para o card de créditos
