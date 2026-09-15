# Prompts de trilha sonora — Niro

Prompts prontos para gerar a trilha do slideshow do módulo Chars no MusicGen
(Colab) ou em geradores como Suno/Udio.

- **3 faixas por elemento** e **3 faixas por região**, sendo pelo menos uma de cada
  região com coro em latim.
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

## Fae — rosa bebê, encantado, feérico

**1. Contemplativo**
```
ethereal fantasy instrumental, celesta and harp arpeggios, soft breathy female choir pads, light sustained strings, whimsical and gentle, magical forest at dawn, 85 BPM, no drums, loopable
```

**2. Lúdico**
```
playful fairy tale instrumental, pizzicato strings, glockenspiel and music box, light woodwinds, curious and mischievous, storybook magic, 110 BPM, soft percussion, no vocals
```

**3. Melancólico**
```
bittersweet fantasy instrumental, solo harp over warm string pad, distant wordless soprano, nostalgic and fragile, faded enchantment, 70 BPM, sparse, no drums
```

## Electro — roxo escuro, tenso, elétrico

**1. Tensão crescente**
```
epic hybrid orchestral instrumental, staccato low strings, synth pulses and arpeggiated bass, rising tension, storm gathering, 120 BPM, building percussion, no vocals
```

**2. Impacto**
```
aggressive hybrid trailer instrumental, distorted synth bass, brass stabs, industrial percussion hits, electric and violent, 140 BPM, no vocals
```

**3. Latente**
```
dark ambient electronic instrumental, humming electrical drone, slow detuned synth pad, occasional crackle, restrained menace, 60 BPM, minimal, no vocals
```

## Psy — roxo claro, onírico, mental

**1. Onírico**
```
dreamlike ambient instrumental, shimmering bells, reversed pads, soft granular texture, floating and hypnotic, altered consciousness, 95 BPM, no drums, no vocals
```

**2. Inquietante**
```
unsettling psychological instrumental, detuned celesta, whispering wordless voices, dissonant string swells, uncanny and disorienting, 80 BPM, no clear beat
```

**3. Transcendente**
```
cosmic meditative instrumental, warm analog pads, slow evolving drone, distant wordless choir, vast and serene, mind expanding, 65 BPM, no percussion
```

## Aqua — azul marinho, profundo, oceânico

**1. Abissal**
```
dark cinematic instrumental, deep cellos and double bass, submerged pads, distant taiko drums, melancholic and vast, sunken depths, 70 BPM, no vocals
```

**2. Correnteza**
```
flowing orchestral instrumental, rolling harp and strings, soft marimba, gentle woodwinds, fluid and continuous motion, river current, 100 BPM, light percussion, no vocals
```

**3. Tempestade no mar**
```
stormy epic orchestral instrumental, surging strings, low brass swells, crashing percussion, powerful and turbulent, ocean tempest, 130 BPM, no vocals
```

## Aero — ciano claro, leve, aéreo

**1. Voo**
```
light adventurous orchestral instrumental, flutes and pizzicato strings, bright horns, airy and soaring, wind over open plains, 110 BPM, no vocals
```

**2. Brisa**
```
gentle pastoral instrumental, solo flute over warm strings, soft acoustic guitar, calm and open, morning breeze, 90 BPM, minimal percussion, no vocals
```

**3. Vendaval**
```
fast orchestral chase instrumental, rapid string ostinato, urgent woodwinds, driving light percussion, swirling and unpredictable, gale winds, 145 BPM, no vocals
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

### 4. Gerar tudo em lote (cole o dicionário `TEMAS` de baixo)

```python
import os, numpy as np, scipy.io.wavfile

TEMAS = {
    # cole aqui um dos dicionários da seção seguinte
}

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

print("Pronto.")
```

### 5. Baixar tudo

```python
!zip -qr trilhas.zip trilhas
from google.colab import files
files.download("trilhas.zip")
```

> **Erros comuns.** `IndexError: too many indices` significa que o áudio veio em
> 1 dimensão — é o que o `np.squeeze` das células acima já resolve. O aviso
> amarelo sobre `generation_config` é inofensivo, pode ignorar.

# Dicionários de prompts para a célula 4

Cole no lugar do dicionário `TEMAS` da célula em lote. Rode primeiro só os
elementos; depois troque pelo bloco das regiões.

```python
TEMAS = {
    "fae_1":     "ethereal fantasy instrumental, celesta and harp arpeggios, soft breathy female choir pads, light sustained strings, whimsical and gentle, magical forest at dawn, 85 BPM, no drums, loopable",
    "fae_2":     "playful fairy tale instrumental, pizzicato strings, glockenspiel and music box, light woodwinds, curious and mischievous, storybook magic, 110 BPM, soft percussion, no vocals",
    "fae_3":     "bittersweet fantasy instrumental, solo harp over warm string pad, distant wordless soprano, nostalgic and fragile, faded enchantment, 70 BPM, sparse, no drums",
    "electro_1": "epic hybrid orchestral instrumental, staccato low strings, synth pulses and arpeggiated bass, rising tension, storm gathering, 120 BPM, building percussion, no vocals",
    "electro_2": "aggressive hybrid trailer instrumental, distorted synth bass, brass stabs, industrial percussion hits, electric and violent, 140 BPM, no vocals",
    "electro_3": "dark ambient electronic instrumental, humming electrical drone, slow detuned synth pad, occasional crackle, restrained menace, 60 BPM, minimal, no vocals",
    "psy_1":     "dreamlike ambient instrumental, shimmering bells, reversed pads, soft granular texture, floating and hypnotic, altered consciousness, 95 BPM, no drums, no vocals",
    "psy_2":     "unsettling psychological instrumental, detuned celesta, whispering wordless voices, dissonant string swells, uncanny and disorienting, 80 BPM, no clear beat",
    "psy_3":     "cosmic meditative instrumental, warm analog pads, slow evolving drone, distant wordless choir, vast and serene, mind expanding, 65 BPM, no percussion",
    "aqua_1":    "dark cinematic instrumental, deep cellos and double bass, submerged pads, distant taiko drums, melancholic and vast, sunken depths, 70 BPM, no vocals",
    "aqua_2":    "flowing orchestral instrumental, rolling harp and strings, soft marimba, gentle woodwinds, fluid and continuous motion, river current, 100 BPM, light percussion, no vocals",
    "aqua_3":    "stormy epic orchestral instrumental, surging strings, low brass swells, crashing percussion, powerful and turbulent, ocean tempest, 130 BPM, no vocals",
    "aero_1":    "light adventurous orchestral instrumental, flutes and pizzicato strings, bright horns, airy and soaring, wind over open plains, 110 BPM, no vocals",
    "aero_2":    "gentle pastoral instrumental, solo flute over warm strings, soft acoustic guitar, calm and open, morning breeze, 90 BPM, minimal percussion, no vocals",
    "aero_3":    "fast orchestral chase instrumental, rapid string ostinato, urgent woodwinds, driving light percussion, swirling and unpredictable, gale winds, 145 BPM, no vocals",
}
```

```python
TEMAS = {
    "cidadela_1":  "noble orchestral instrumental, heroic french horns, full string section, timpani and cymbal swells, proud and ceremonial, royal capital, 100 BPM, no vocals",
    "cidadela_2":  "warm medieval city instrumental, lute and hurdy gurdy, tambourine, fiddle melody, bustling and welcoming, market square, 115 BPM, no vocals",
    "cidadela_3":  "epic sacred orchestral instrumental, full latin style choir singing wordless vowels, cathedral reverb, brass chorale and pipe organ, solemn and monumental, 80 BPM",
    "gelo_1":      "cold ambient orchestral instrumental, sustained high strings, low drone, sparse piano notes, icy and desolate, frozen wasteland, 60 BPM, no percussion, no vocals",
    "gelo_2":      "somber marching instrumental, low male wordless chant, heavy drums, bowed cellos, cold and relentless, warriors crossing the ice, 95 BPM",
    "gelo_3":      "mournful sacred instrumental, distant latin style choir on sustained vowels, solo cello, deep drone, frozen cathedral atmosphere, grieving and vast, 65 BPM",
    "floresta_1":  "mystical forest ambient instrumental, wooden flute, soft nylon guitar, nature textures, gentle strings, ancient and alive, 75 BPM, no vocals",
    "floresta_2":  "tribal ritual instrumental, frame drums and shakers, low wooden flute, layered wordless chanting, primal and hypnotic, 105 BPM",
    "floresta_3":  "sacred nature instrumental, soft latin style female choir on open vowels, harp and low strings, forest reverb, reverent and ancient, 70 BPM",
    "deserto_1":   "arid desert instrumental, duduk and oud, sparse frame drum, shimmering heat pads, lonely and endless, sun scorched dunes, 80 BPM, no vocals",
    "deserto_2":   "exotic rhythmic instrumental, darbuka and riq percussion, oud melody, low strings drone, traveling and determined, 120 BPM, no vocals",
    "deserto_3":   "ancient ruins instrumental, distant latin style choir on long vowels, low drone, sparse metallic percussion, haunting and forgotten, buried civilization, 70 BPM",
    "costa_1":     "coastal folk instrumental, acoustic guitar and accordion, soft fiddle, gentle wave textures, salty and welcoming, harbor at sunset, 95 BPM, no vocals",
    "costa_2":     "adventurous sea instrumental, sweeping strings, bold brass, rolling snare, hopeful and expansive, ship leaving port, 125 BPM, no vocals",
    "costa_3":     "melancholic maritime instrumental, low male latin style choir on sustained vowels, creaking ship textures, solo violin, deep water reverb, mournful, 70 BPM",
    "sombrias_1":  "dark ominous instrumental, low brass drones, dissonant string clusters, sparse deep drums, oppressive and dreadful, cursed land, 60 BPM, no vocals",
    "sombrias_2":  "dark orchestral action instrumental, aggressive low strings ostinato, pounding taiko, brass hits, urgent and threatening, 140 BPM, no vocals",
    "sombrias_3":  "sinister sacred instrumental, dark latin style male choir chanting on low vowels, pipe organ, deep drums, church ruins reverb, ominous and ritualistic, 75 BPM",
}
```

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
