# Prompts de trilha sonora — Niro

Prompts prontos para gerar a trilha do slideshow do módulo Chars no MusicGen
(Colab) ou em geradores como Suno/Udio.

- **3 faixas para cada um dos 12 elementos** (36 faixas) e **3 para cada uma das 6
  regiões** (18 faixas), sendo a terceira de cada região com coro em latim.
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
4. `max_new_tokens=1500` ≈ 30 segundos, que é o máximo seguro do modelo (veja
   "Duração das faixas" no fim deste guia). Faixas mais longas se fazem
   repetindo o arquivo, não pedindo mais tokens.
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

# REGIÕES

## Aurion — Brasil · elemento Mineral

*A solidez do Mineral com a percussão brasileira: berimbau, surdo, atabaque e agogô sobre metais graves.*

**1. Terra firme**
```
earthy brazilian orchestral instrumental, berimbau and deep surdo drums, low strings and tuba, unshakable and grounded, ancient stone land, 90 BPM, no vocals
```

**2. Forja**
```
heavy percussive instrumental, atabaque and agogo bells, metallic hammer hits, driving low brass, industrious and relentless, 110 BPM, no vocals
```

**3. 🕯️ Hino da pedra — COM LATIM**

*MusicGen (textura coral):*
```
sacred earth instrumental, latin style choir on sustained vowels, deep surdo pulse, low brass chorale, cavernous stone reverb, monumental and solemn, 75 BPM
```

*Suno/Udio — Style:*
```
epic sacred choral, brazilian percussion, deep surdo drums, low brass, cavernous reverb, monumental, slow
```

*Suno/Udio — Lyrics:*
```
Petra vivit, terra canit
Radices in profundo tenent
Non movebimur, non cademus
Aurum sub monte dormit
```
> *A pedra vive, a terra canta / As raízes seguram nas profundezas / Não seremos movidos, não cairemos / O ouro dorme sob a montanha*

## Calthera — Uruguai · elemento Aqua

*A fluidez e o mistério do Aqua sobre o candombe uruguaio: tamboril e bandoneón à beira d'água.*

**1. Correnteza**
```
coastal candombe instrumental, tamboril drums, bandoneon melody, legato strings, flowing and warm, river meeting the sea, 100 BPM, no vocals
```

**2. Pressão**
```
dark maritime instrumental, low bandoneon, submerged string pads, distant tamboril pulse, deep reverb, mysterious and heavy, 70 BPM, no vocals
```

**3. 🕯️ Canto da maré — COM LATIM**

*MusicGen (textura coral):*
```
melancholic sacred maritime instrumental, latin style choir on long vowels, bandoneon and solo cello, deep water reverb, mournful and vast, 68 BPM
```

*Suno/Udio — Style:*
```
mournful choral, bandoneon, candombe percussion, cello, deep water reverb, melancholic, slow
```

*Suno/Udio — Lyrics:*
```
Flumen magnum ad mare currit
Aqua meminit, aqua tacet
Sub unda dormit veritas
Veni, audi, descende
```
> *O grande rio corre para o mar / A água lembra, a água cala / Sob a onda dorme a verdade / Vem, ouve, desce*

## Andina — Argentina · elemento Psy

*O tango como música de meditação: bandoneón lento, texturas suspensas e o mistério do Psy.*

**1. Introspecção**
```
meditative tango ambient instrumental, slow bandoneon over sustained pads, sparse piano, hypnotic and introspective, 65 BPM, no percussion, no vocals
```

**2. Premonição**
```
mystic instrumental, detuned bandoneon, reversed textures, whispering wordless voices, dissonant string swells, uncanny and dreamlike, 80 BPM
```

**3. 🕯️ Transe — COM LATIM**

*MusicGen (textura coral):*
```
trance like sacred instrumental, latin style choir humming on open vowels, deep drone and singing bowls, distant bandoneon, vast inner space, 60 BPM
```

*Suno/Udio — Style:*
```
meditative choral, ambient tango, bandoneon, singing bowls, drone, trance like, very slow
```

*Suno/Udio — Lyrics:*
```
Mens aperta, mundus latet
Quod videmus non est totum
Somnus docet, silentium clamat
Intra, intra, interius
```
> *Mente aberta, o mundo se esconde / O que vemos não é tudo / O sono ensina, o silêncio grita / Entra, entra, mais para dentro*

## Velcrya — Chile · elemento Glacial

*Os extremos do Glacial com o sopro andino: quena e zampoña agudíssimas sobre graves subsônicos.*

**1. Extremos**
```
glacial andean instrumental, very high pan flute over very low contrabass drone, glassy bells, cold and vast, frozen southern peaks, 60 BPM, no vocals
```

**2. Peso**
```
heavy glacial instrumental, deep booming drums, low brass, piercing high string swells, charango tremolo, dangerous and slow, 72 BPM, no vocals
```

**3. 🕯️ Beleza no perigo — COM LATIM**

*MusicGen (textura coral):*
```
frozen sacred instrumental, distant latin style choir on sustained vowels, solo quena flute, subsonic drone, ice cathedral reverb, beautiful and lethal, 62 BPM
```

*Suno/Udio — Style:*
```
frozen choral, andean flute, subsonic drone, vast icy reverb, beautiful and dangerous, very slow
```

*Suno/Udio — Lyrics:*
```
Glacies canit, ventus tacet
Pulchritudo in periculo
Alta et profunda, una vox
Gelu tenet, gelu servat
```
> *O gelo canta, o vento cala / A beleza dentro do perigo / Agudo e grave, uma só voz / O gelo prende, o gelo guarda*

## Manoa — Venezuela · elemento Electro

*O joropo venezuelano é rápido e virtuoso por natureza: arpa llanera e cuatro eletrificados pelo Electro.*

**1. Joropo elétrico**
```
fast joropo hybrid instrumental, virtuosic llanera harp arpeggios, cuatro strumming, maracas, synth bass pulse, electric and exhilarating, 140 BPM, no vocals
```

**2. Tempestade**
```
high energy hybrid instrumental, harp and cuatro over distorted synth, punchy drums, brass stabs, lightning storm over the plains, 150 BPM, no vocals
```

**3. 🕯️ Cidade dourada — COM LATIM**

*MusicGen (textura coral):*
```
charged sacred instrumental, latin style choir chanting on short syllables, llanera harp ostinato, electrical drone, deep drums, golden city ritual, 95 BPM
```

*Suno/Udio — Style:*
```
ritual choral, latin american harp, electric drone, deep drums, charged and ceremonial, driving
```

*Suno/Udio — Lyrics:*
```
Fulgur in manibus
Civitas aurea non dormit
Vide, audi, curre
Tempestas venit, tempestas sumus
```
> *Relâmpago nas mãos / A cidade dourada não dorme / Vê, ouve, corre / A tempestade vem, a tempestade somos nós*

## Valessia — Peru · elemento Fae

*A alegria e o descobrimento do Fae na festa andina: quena, charango e cajón.*

**1. Festa**
```
joyful andean instrumental, quena flute and charango, cajon and light percussion, bright and celebratory, mountain festival, 120 BPM, no vocals
```

**2. Descobrimento**
```
wonder and discovery instrumental, pan flutes over shimmering bells, harp arpeggios, warm strings swelling, magic revealed in the highlands, 90 BPM, no vocals
```

**3. 🕯️ Cantoria — COM LATIM**

*MusicGen (textura coral):*
```
festive sacred instrumental, latin style choir on bright open vowels, quena and charango, hand drums and bells, joyful and communal, 115 BPM
```

*Suno/Udio — Style:*
```
festive choral, andean folk, quena flute, charango, hand drums, joyful and communal, bright
```

*Suno/Udio — Lyrics:*
```
Ride, canta, veni nobiscum
Lumen inter folia
Nihil timemus hodie
Festum sine fine
```
> *Ri, canta, vem conosco / Luz entre as folhas / Nada tememos hoje / Festa sem fim*

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

Cole a célula inteira (dicionário + laço) e rode. São 36 faixas, **~25 a 35
minutos** no total. O progresso aparece embaixo da
célula, um nome por vez.

> A sessão grátis do Colab derruba o notebook depois de um tempo ocioso — deixe
> a aba aberta e dê uma olhada de vez em quando. Se cair, rode de novo a célula
> 2 e depois esta: as faixas já prontas são puladas.

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
    "aurion_1":   "earthy brazilian orchestral instrumental, berimbau and deep surdo drums, low strings and tuba, unshakable and grounded, ancient stone land, 90 BPM, no vocals",
    "aurion_2":   "heavy percussive instrumental, atabaque and agogo bells, metallic hammer hits, driving low brass, industrious and relentless, 110 BPM, no vocals",
    "aurion_3":   "sacred earth instrumental, latin style choir on sustained vowels, deep surdo pulse, low brass chorale, cavernous stone reverb, monumental and solemn, 75 BPM",
    "calthera_1": "coastal candombe instrumental, tamboril drums, bandoneon melody, legato strings, flowing and warm, river meeting the sea, 100 BPM, no vocals",
    "calthera_2": "dark maritime instrumental, low bandoneon, submerged string pads, distant tamboril pulse, deep reverb, mysterious and heavy, 70 BPM, no vocals",
    "calthera_3": "melancholic sacred maritime instrumental, latin style choir on long vowels, bandoneon and solo cello, deep water reverb, mournful and vast, 68 BPM",
    "andina_1":   "meditative tango ambient instrumental, slow bandoneon over sustained pads, sparse piano, hypnotic and introspective, 65 BPM, no percussion, no vocals",
    "andina_2":   "mystic instrumental, detuned bandoneon, reversed textures, whispering wordless voices, dissonant string swells, uncanny and dreamlike, 80 BPM",
    "andina_3":   "trance like sacred instrumental, latin style choir humming on open vowels, deep drone and singing bowls, distant bandoneon, vast inner space, 60 BPM",
    "velcrya_1":  "glacial andean instrumental, very high pan flute over very low contrabass drone, glassy bells, cold and vast, frozen southern peaks, 60 BPM, no vocals",
    "velcrya_2":  "heavy glacial instrumental, deep booming drums, low brass, piercing high string swells, charango tremolo, dangerous and slow, 72 BPM, no vocals",
    "velcrya_3":  "frozen sacred instrumental, distant latin style choir on sustained vowels, solo quena flute, subsonic drone, ice cathedral reverb, beautiful and lethal, 62 BPM",
    "manoa_1":    "fast joropo hybrid instrumental, virtuosic llanera harp arpeggios, cuatro strumming, maracas, synth bass pulse, electric and exhilarating, 140 BPM, no vocals",
    "manoa_2":    "high energy hybrid instrumental, harp and cuatro over distorted synth, punchy drums, brass stabs, lightning storm over the plains, 150 BPM, no vocals",
    "manoa_3":    "charged sacred instrumental, latin style choir chanting on short syllables, llanera harp ostinato, electrical drone, deep drums, golden city ritual, 95 BPM",
    "valessia_1": "joyful andean instrumental, quena flute and charango, cajon and light percussion, bright and celebratory, mountain festival, 120 BPM, no vocals",
    "valessia_2": "wonder and discovery instrumental, pan flutes over shimmering bells, harp arpeggios, warm strings swelling, magic revealed in the highlands, 90 BPM, no vocals",
    "valessia_3": "festive sacred instrumental, latin style choir on bright open vowels, quena and charango, hand drums and bells, joyful and communal, 115 BPM",
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

---

# Duração das faixas

`max_new_tokens` controla a duração — o MusicGen gera 50 tokens por segundo de
áudio:

| `max_new_tokens` | Duração | |
|---|---|---|
| 1500 | ~30s | padrão destas células |
| 2000 | ~40s | limite prático |
| 2048+ | — | **quebra** |

**Existe um teto rígido de 2048.** É o número de posições do decoder do modelo;
pedir mais que isso estoura o índice e derruba a célula com
`AcceleratorError: CUDA error: device-side assert triggered`. Quando isso
acontece, a sessão CUDA fica corrompida: **reinicie a sessão** (*Ambiente de
execução → Reiniciar sessão*) e recarregue o modelo antes de tentar de novo.

Além do teto, o modelo foi treinado com trechos de 30 segundos — acima disso ele
continua gerando, mas começa a repetir e a perder o rumo da melodia.

## Como chegar a 1 minuto (ou mais)

Gere 30s e estique por repetição. É instantâneo, não degrada o áudio e a trilha
toca em loop no slideshow de qualquer forma:

```python
import os, glob

# 30s repetidos 2 vezes = 1 minuto. Para 3 minutos, use stream_loop 5.
for caminho in sorted(glob.glob("trilhas/*.mp3")):
    if caminho.endswith("_longo.mp3"):
        continue
    destino = caminho.replace(".mp3", "_longo.mp3")
    os.system(f"ffmpeg -y -loglevel error -stream_loop 1 -i {caminho} -b:a 160k {destino}")

print("Pronto.")
```

> Como há **3 faixas por elemento**, o player do slideshow pode alternar entre
> elas em vez de repetir a mesma: 30s × 3 já dão 1min30 de variação real por
> elemento, sem nenhuma repetição.

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
