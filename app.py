import json
import os
import socket
import threading
import webbrowser
from datetime import datetime
from uuid import uuid4

import requests
from dotenv import load_dotenv
from flask import (Flask, Response, abort, jsonify, redirect, render_template,
                   request, stream_with_context, url_for)

from db import BASE_DIR, UPLOAD_DIR, delete_upload, get_db, init_db, purge_expired_archive

load_dotenv(os.path.join(BASE_DIR, ".env"))

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 64 * 1024 * 1024  # 64 MB por request

ALLOWED_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"}

PARAM_TYPES = {
    "region":      {"table": "regions",      "fk": "region_id",      "has_image": False, "label": "Região"},
    "affiliation": {"table": "affiliations", "fk": "affiliation_id", "has_image": False, "label": "Afiliação"},
    "element":     {"table": "elements",     "fk": "element_id",     "has_image": True,  "label": "Elemento"},
    "weapon":      {"table": "weapons",      "fk": "weapon_id",      "has_image": True,  "label": "Arma"},
}

BANNER_LIMITS = {
    "unitario": {5: 1, 4: 3},
    "duplo":    {5: 2, 4: 3},
    "especial": {5: 10, 4: 5},
}

TEXT_LIMITS = {
    "dom": 500, "normal_attack": 500, "skill1": 500, "skill2": 500,
    "ultimate": 500, "personality": 4000, "profession": 200, "lore": 4000,
}


# ---------------------------------------------------------------- helpers

def save_image(file_storage, subdir):
    filename = file_storage.filename or "image.png"
    ext = os.path.splitext(filename)[1].lower() or ".png"
    if ext not in ALLOWED_EXTS:
        raise ValueError(f"Formato de imagem não suportado: {ext}")
    name = uuid4().hex + ext
    dest_dir = os.path.join(UPLOAD_DIR, subdir)
    os.makedirs(dest_dir, exist_ok=True)
    file_storage.save(os.path.join(dest_dir, name))
    return f"uploads/{subdir}/{name}"


def fetch_params(conn):
    out = {}
    for key, meta in PARAM_TYPES.items():
        cols = "id, name" + (", image" if meta["has_image"] else "")
        rows = conn.execute(f"SELECT {cols} FROM {meta['table']} ORDER BY name COLLATE NOCASE").fetchall()
        out[key] = [dict(r) for r in rows]
    return out


def character_to_dict(row):
    d = dict(row)
    for key in ("region", "affiliation", "element", "weapon"):
        d[key] = {"id": d.pop(f"{key}_id"), "name": d.pop(f"{key}_name", None)}
        if f"{key}_image" in d:
            d[key]["image"] = d.pop(f"{key}_image")
    return d


CHAR_SELECT = """
SELECT c.*,
       r.name  AS region_name,
       a.name  AS affiliation_name,
       e.name  AS element_name,  e.image AS element_image,
       w.name  AS weapon_name,   w.image AS weapon_image
FROM characters c
LEFT JOIN regions r      ON r.id = c.region_id
LEFT JOIN affiliations a ON a.id = c.affiliation_id
LEFT JOIN elements e     ON e.id = c.element_id
LEFT JOIN weapons w      ON w.id = c.weapon_id
"""


# ---------------------------------------------------------------- páginas

@app.route("/")
def index():
    return redirect(url_for("page_chars"))


@app.route("/chars")
def page_chars():
    return render_template("chars.html", active="chars")


@app.route("/chars/new")
def page_char_new():
    conn = get_db()
    params = fetch_params(conn)
    conn.close()
    return render_template("character_form.html", active="chars",
                           params=params, character=None, limits=TEXT_LIMITS)


@app.route("/chars/<int:char_id>")
def page_char_detail(char_id):
    conn = get_db()
    row = conn.execute(CHAR_SELECT + " WHERE c.id = ?", (char_id,)).fetchone()
    conn.close()
    if not row:
        abort(404)
    return render_template("character_detail.html", active="chars",
                           c=character_to_dict(row))


@app.route("/chars/<int:char_id>/edit")
def page_char_edit(char_id):
    conn = get_db()
    row = conn.execute(CHAR_SELECT + " WHERE c.id = ?", (char_id,)).fetchone()
    params = fetch_params(conn)
    conn.close()
    if not row:
        abort(404)
    return render_template("character_form.html", active="chars",
                           params=params, character=character_to_dict(row),
                           limits=TEXT_LIMITS)


@app.route("/parametros")
def page_params():
    return render_template("params.html", active="params")


@app.route("/banners")
def page_banners():
    return render_template("banners.html", active="banners")


@app.route("/historico")
def page_history():
    return render_template("history.html", active="history")


@app.route("/arquivo")
def page_archive():
    purge_expired_archive()
    return render_template("archive.html", active="archive")


# ---------------------------------------------------------------- API: parâmetros

@app.route("/api/params")
def api_params_all():
    conn = get_db()
    out = fetch_params(conn)
    conn.close()
    return jsonify(out)


@app.route("/api/params/<ptype>", methods=["POST"])
def api_param_create(ptype):
    meta = PARAM_TYPES.get(ptype) or abort(404)
    name = (request.form.get("name") or "").strip()
    if not name:
        return jsonify(error="Informe o nome."), 400
    image = None
    if meta["has_image"]:
        file = request.files.get("image")
        if not file or not file.filename:
            return jsonify(error=f"{meta['label']} precisa de uma imagem."), 400
        image = save_image(file, meta["table"])
    conn = get_db()
    try:
        if meta["has_image"]:
            cur = conn.execute(f"INSERT INTO {meta['table']} (name, image) VALUES (?, ?)", (name, image))
        else:
            cur = conn.execute(f"INSERT INTO {meta['table']} (name) VALUES (?)", (name,))
        conn.commit()
        return jsonify(id=cur.lastrowid, name=name, image=image), 201
    except Exception:
        return jsonify(error=f"Já existe {meta['label']} com esse nome."), 409
    finally:
        conn.close()


@app.route("/api/params/<ptype>/<int:item_id>", methods=["PUT"])
def api_param_update(ptype, item_id):
    meta = PARAM_TYPES.get(ptype) or abort(404)
    conn = get_db()
    row = conn.execute(f"SELECT * FROM {meta['table']} WHERE id = ?", (item_id,)).fetchone()
    if not row:
        conn.close()
        abort(404)
    name = (request.form.get("name") or row["name"]).strip()
    try:
        conn.execute(f"UPDATE {meta['table']} SET name = ? WHERE id = ?", (name, item_id))
        if meta["has_image"]:
            file = request.files.get("image")
            if file and file.filename:
                delete_upload(row["image"])
                image = save_image(file, meta["table"])
                conn.execute(f"UPDATE {meta['table']} SET image = ? WHERE id = ?", (image, item_id))
        conn.commit()
        return jsonify(ok=True)
    except Exception:
        return jsonify(error=f"Já existe {meta['label']} com esse nome."), 409
    finally:
        conn.close()


@app.route("/api/params/<ptype>/<int:item_id>", methods=["DELETE"])
def api_param_delete(ptype, item_id):
    meta = PARAM_TYPES.get(ptype) or abort(404)
    reassign_to = request.args.get("reassign_to", type=int)
    conn = get_db()
    row = conn.execute(f"SELECT * FROM {meta['table']} WHERE id = ?", (item_id,)).fetchone()
    if not row:
        conn.close()
        abort(404)
    affected = conn.execute(
        f"SELECT id, name, card_promo FROM characters WHERE {meta['fk']} = ? AND archived = 0 ORDER BY name",
        (item_id,),
    ).fetchall()
    if affected and reassign_to is None:
        conn.close()
        return jsonify(in_use=True, characters=[dict(a) for a in affected]), 409
    if reassign_to is not None:
        if reassign_to == item_id or not conn.execute(
                f"SELECT 1 FROM {meta['table']} WHERE id = ?", (reassign_to,)).fetchone():
            conn.close()
            return jsonify(error="Opção de substituição inválida."), 400
        conn.execute(f"UPDATE characters SET {meta['fk']} = ? WHERE {meta['fk']} = ?",
                     (reassign_to, item_id))
    if meta["has_image"]:
        delete_upload(row["image"])
    conn.execute(f"DELETE FROM {meta['table']} WHERE id = ?", (item_id,))
    conn.commit()
    conn.close()
    return jsonify(ok=True)


# ---------------------------------------------------------------- API: personagens

def parse_character_form(form):
    data = {}
    for field in ("name", "age", "height", "dom", "normal_attack", "skill1",
                  "skill2", "ultimate", "personality", "profession", "lore"):
        value = (form.get(field) or "").strip()
        limit = TEXT_LIMITS.get(field)
        if limit and len(value) > limit:
            value = value[:limit]
        data[field] = value
    for field in ("region_id", "affiliation_id", "element_id", "weapon_id"):
        raw = form.get(field)
        data[field] = int(raw) if raw and raw.isdigit() else None
    data["rarity"] = int(form.get("rarity") or 0)
    return data


@app.route("/api/characters")
def api_characters():
    conn = get_db()
    rows = conn.execute(CHAR_SELECT + " WHERE c.archived = 0 ORDER BY c.name COLLATE NOCASE").fetchall()
    conn.close()
    return jsonify([character_to_dict(r) for r in rows])


@app.route("/api/characters", methods=["POST"])
def api_character_create():
    data = parse_character_form(request.form)
    if not data["name"]:
        return jsonify(error="Informe o nome do personagem."), 400
    if data["rarity"] not in (4, 5):
        return jsonify(error="Escolha a raridade."), 400
    card_full = request.files.get("card_full")
    card_promo = request.files.get("card_promo")
    if not card_full or not card_full.filename or not card_promo or not card_promo.filename:
        return jsonify(error="Envie o card completo e o card promo."), 400
    conn = get_db()
    if conn.execute("SELECT 1 FROM characters WHERE name = ? COLLATE NOCASE", (data["name"],)).fetchone():
        conn.close()
        return jsonify(error="Já existe um personagem com esse nome."), 409
    data["card_full"] = save_image(card_full, "characters")
    data["card_promo"] = save_image(card_promo, "characters")
    cols = ", ".join(data.keys())
    marks = ", ".join("?" for _ in data)
    cur = conn.execute(f"INSERT INTO characters ({cols}) VALUES ({marks})", list(data.values()))
    conn.commit()
    conn.close()
    return jsonify(id=cur.lastrowid), 201


@app.route("/api/characters/<int:char_id>", methods=["PUT"])
def api_character_update(char_id):
    conn = get_db()
    row = conn.execute("SELECT * FROM characters WHERE id = ?", (char_id,)).fetchone()
    if not row:
        conn.close()
        abort(404)
    data = parse_character_form(request.form)
    if not data["name"]:
        conn.close()
        return jsonify(error="Informe o nome do personagem."), 400
    if data["rarity"] not in (4, 5):
        conn.close()
        return jsonify(error="Escolha a raridade."), 400
    dup = conn.execute("SELECT 1 FROM characters WHERE name = ? COLLATE NOCASE AND id != ?",
                       (data["name"], char_id)).fetchone()
    if dup:
        conn.close()
        return jsonify(error="Já existe um personagem com esse nome."), 409
    for field, subkey in (("card_full", "card_full"), ("card_promo", "card_promo")):
        file = request.files.get(field)
        if file and file.filename:
            delete_upload(row[subkey])
            data[field] = save_image(file, "characters")
    sets = ", ".join(f"{k} = ?" for k in data)
    conn.execute(f"UPDATE characters SET {sets} WHERE id = ?", list(data.values()) + [char_id])
    conn.commit()
    conn.close()
    return jsonify(ok=True)


@app.route("/api/characters/<int:char_id>", methods=["DELETE"])
def api_character_archive(char_id):
    conn = get_db()
    row = conn.execute("SELECT id FROM characters WHERE id = ? AND archived = 0", (char_id,)).fetchone()
    if not row:
        conn.close()
        abort(404)
    conn.execute("UPDATE characters SET archived = 1, archived_at = datetime('now') WHERE id = ?", (char_id,))
    conn.commit()
    conn.close()
    return jsonify(ok=True)


@app.route("/api/characters/<int:char_id>/restore", methods=["POST"])
def api_character_restore(char_id):
    conn = get_db()
    conn.execute("UPDATE characters SET archived = 0, archived_at = NULL WHERE id = ?", (char_id,))
    conn.commit()
    conn.close()
    return jsonify(ok=True)


@app.route("/api/characters/<int:char_id>/permanent", methods=["DELETE"])
def api_character_permanent(char_id):
    conn = get_db()
    row = conn.execute("SELECT * FROM characters WHERE id = ? AND archived = 1", (char_id,)).fetchone()
    if not row:
        conn.close()
        return jsonify(error="Apenas personagens no arquivo podem ser excluídos definitivamente."), 400
    delete_upload(row["card_full"])
    delete_upload(row["card_promo"])
    conn.execute("DELETE FROM characters WHERE id = ?", (char_id,))
    conn.commit()
    conn.close()
    return jsonify(ok=True)


@app.route("/api/archive")
def api_archive():
    purge_expired_archive()
    conn = get_db()
    rows = conn.execute(CHAR_SELECT + " WHERE c.archived = 1 ORDER BY c.archived_at DESC").fetchall()
    conn.close()
    out = []
    for r in rows:
        d = character_to_dict(r)
        archived_at = datetime.strptime(d["archived_at"], "%Y-%m-%d %H:%M:%S")
        d["days_left"] = max(0, 30 - (datetime.utcnow() - archived_at).days)
        out.append(d)
    return jsonify(out)


# ---------------------------------------------------------------- API: banners

def banner_payload(conn):
    versions = {r["major"]: r["name"] for r in conn.execute("SELECT * FROM versions")}
    banners = []
    for b in conn.execute("SELECT * FROM banners ORDER BY major, minor"):
        chars = conn.execute(
            """SELECT c.id, c.name, c.rarity, c.card_promo
               FROM banner_characters bc JOIN characters c ON c.id = bc.character_id
               WHERE bc.banner_id = ? AND c.archived = 0
               ORDER BY c.rarity DESC, c.name COLLATE NOCASE""",
            (b["id"],),
        ).fetchall()
        banners.append({**dict(b), "characters": [dict(c) for c in chars]})
    return {"versions": versions, "banners": banners, "limits": BANNER_LIMITS}


@app.route("/api/banners")
def api_banners():
    conn = get_db()
    out = banner_payload(conn)
    conn.close()
    return jsonify(out)


@app.route("/api/banners", methods=["POST"])
def api_banner_create():
    body = request.get_json(force=True)
    major, minor = body.get("major"), body.get("minor")
    btype = body.get("type")
    version_name = (body.get("version_name") or "").strip()
    if not isinstance(major, int) or not 1 <= major <= 8:
        return jsonify(error="Versão inválida."), 400
    if not isinstance(minor, int) or not 0 <= minor <= 8:
        return jsonify(error="Subversão inválida."), 400
    if btype not in BANNER_LIMITS:
        return jsonify(error="Tipo de banner inválido."), 400
    conn = get_db()
    has_version = conn.execute("SELECT 1 FROM versions WHERE major = ?", (major,)).fetchone()
    if not has_version and not version_name:
        conn.close()
        return jsonify(error=f"A versão {major}.x ainda não tem nome. Informe um nome."), 400
    if conn.execute("SELECT 1 FROM banners WHERE major = ? AND minor = ?", (major, minor)).fetchone():
        conn.close()
        return jsonify(error=f"Já existe um banner na versão {major}.{minor}."), 409
    if not has_version:
        conn.execute("INSERT INTO versions (major, name) VALUES (?, ?)", (major, version_name))
    cur = conn.execute("INSERT INTO banners (major, minor, type) VALUES (?, ?, ?)", (major, minor, btype))
    conn.commit()
    conn.close()
    return jsonify(id=cur.lastrowid), 201


@app.route("/api/banners/<int:banner_id>", methods=["DELETE"])
def api_banner_delete(banner_id):
    conn = get_db()
    conn.execute("DELETE FROM banners WHERE id = ?", (banner_id,))
    conn.commit()
    conn.close()
    return jsonify(ok=True)


@app.route("/api/versions/<int:major>", methods=["PUT"])
def api_version_rename(major):
    name = (request.get_json(force=True).get("name") or "").strip()
    if not name:
        return jsonify(error="Informe o nome."), 400
    conn = get_db()
    conn.execute("INSERT INTO versions (major, name) VALUES (?, ?) "
                 "ON CONFLICT(major) DO UPDATE SET name = excluded.name", (major, name))
    conn.commit()
    conn.close()
    return jsonify(ok=True)


@app.route("/api/banners/<int:banner_id>/characters", methods=["POST"])
def api_banner_add_char(banner_id):
    char_id = request.get_json(force=True).get("character_id")
    conn = get_db()
    banner = conn.execute("SELECT * FROM banners WHERE id = ?", (banner_id,)).fetchone()
    char = conn.execute("SELECT * FROM characters WHERE id = ? AND archived = 0", (char_id,)).fetchone()
    if not banner or not char:
        conn.close()
        abort(404)
    if conn.execute("SELECT 1 FROM banner_characters WHERE banner_id = ? AND character_id = ?",
                    (banner_id, char_id)).fetchone():
        conn.close()
        return jsonify(error="Esse personagem já está no banner."), 409
    count = conn.execute(
        """SELECT COUNT(*) AS n FROM banner_characters bc
           JOIN characters c ON c.id = bc.character_id
           WHERE bc.banner_id = ? AND c.rarity = ?""",
        (banner_id, char["rarity"]),
    ).fetchone()["n"]
    limit = BANNER_LIMITS[banner["type"]][char["rarity"]]
    if count >= limit:
        conn.close()
        return jsonify(error=f"Limite de personagens {char['rarity']}★ atingido para banner "
                             f"{banner['type']} ({limit})."), 409
    conn.execute("INSERT INTO banner_characters (banner_id, character_id) VALUES (?, ?)",
                 (banner_id, char_id))
    conn.commit()
    conn.close()
    return jsonify(ok=True)


@app.route("/api/banners/<int:banner_id>/characters/<int:char_id>", methods=["DELETE"])
def api_banner_remove_char(banner_id, char_id):
    conn = get_db()
    conn.execute("DELETE FROM banner_characters WHERE banner_id = ? AND character_id = ?",
                 (banner_id, char_id))
    conn.commit()
    conn.close()
    return jsonify(ok=True)


# ---------------------------------------------------------------- API: histórico

@app.route("/api/history")
def api_history():
    banner_id = request.args.get("banner_id", type=int)
    conn = get_db()
    banners = conn.execute(
        """SELECT b.id, b.major, b.minor,
                  (SELECT COUNT(*) FROM banner_characters bc
                   JOIN characters c ON c.id = bc.character_id
                   WHERE bc.banner_id = b.id AND c.archived = 0) AS n_chars
           FROM banners b ORDER BY b.major, b.minor"""
    ).fetchall()
    timeline = [b for b in banners if b["n_chars"] > 0]
    options = [{"id": b["id"], "label": f"{b['major']}.{b['minor']}"} for b in timeline]
    if banner_id is None or not any(b["id"] == banner_id for b in timeline):
        conn.close()
        return jsonify(options=options, rows=None)

    current_idx = next(i for i, b in enumerate(timeline) if b["id"] == banner_id)
    appearances = {}
    for i, b in enumerate(timeline[:current_idx + 1]):
        for row in conn.execute(
                """SELECT bc.character_id FROM banner_characters bc
                   JOIN characters c ON c.id = bc.character_id
                   WHERE bc.banner_id = ? AND c.archived = 0""", (b["id"],)):
            appearances[row["character_id"]] = i

    chars = conn.execute(
        "SELECT id, name, rarity, card_promo FROM characters WHERE archived = 0 "
        "ORDER BY rarity DESC, name COLLATE NOCASE").fetchall()
    conn.close()

    rows = []
    for c in chars:
        last = appearances.get(c["id"])
        if last is None:
            gap = current_idx + 1
            last_label = None
        else:
            gap = current_idx - last
            b = timeline[last]
            last_label = f"{b['major']}.{b['minor']}"
        rows.append({"id": c["id"], "name": c["name"], "rarity": c["rarity"],
                     "card_promo": c["card_promo"], "gap": gap, "last_banner": last_label})
    rows.sort(key=lambda r: (-r["rarity"], -r["gap"], r["name"].lower()))
    return jsonify(options=options, rows=rows,
                   current=next(o["label"] for o in options if o["id"] == banner_id))


# ---------------------------------------------------------------- API: IA (OpenRouter)

AI_FIELD_SPECS = {
    "normal_attack": ("Ataque Normal",
                      "Descreva o ataque normal (básico) do personagem em combate, coerente com a arma e o "
                      "elemento dele. Inclua um nome curto para o ataque e a descrição do golpe. "
                      "Máximo de 450 caracteres."),
    "skill1": ("Skill 1",
               "Crie a primeira habilidade ativa (Skill 1) do personagem, com nome e descrição do efeito em "
               "combate, coerente com elemento, arma e tema do personagem. Máximo de 450 caracteres."),
    "skill2": ("Skill 2",
               "Crie a segunda habilidade ativa (Skill 2) do personagem, com nome e descrição, diferente e "
               "complementar à Skill 1. Máximo de 450 caracteres."),
    "ultimate": ("Ultimate",
                 "Crie a habilidade suprema (Ultimate) do personagem: o golpe mais poderoso e espetacular, "
                 "com nome épico e descrição do efeito. Máximo de 450 caracteres."),
    "personality": ("Personalidade",
                    "Escreva a personalidade do personagem em profundidade: temperamento, maneirismos, "
                    "medos, valores, como trata aliados e inimigos, contradições internas. Texto corrido, "
                    "envolvente. Máximo de 3500 caracteres."),
    "lore": ("Lore",
             "Escreva a lore (história de fundo) do personagem: origem, eventos marcantes, conexão com sua "
             "região e afiliação, como obteve seu Dom e seu papel no mundo de Niro. Tom épico e misterioso, "
             "texto corrido. Máximo de 3500 caracteres."),
}

FIELD_LABELS_PT = {
    "name": "Nome", "age": "Idade", "height": "Altura", "rarity": "Raridade",
    "region": "Região", "affiliation": "Afiliação", "element": "Elemento", "weapon": "Arma",
    "dom": "Dom", "normal_attack": "Ataque Normal", "skill1": "Skill 1", "skill2": "Skill 2",
    "ultimate": "Ultimate", "personality": "Personalidade", "profession": "Profissão", "lore": "Lore",
}


@app.route("/api/ai_fill", methods=["POST"])
def api_ai_fill():
    api_key = (os.environ.get("OPENROUTER_API_KEY") or "").strip()
    if not api_key:
        return jsonify(error="Chave do OpenRouter não configurada. Edite o arquivo .env e "
                             "preencha OPENROUTER_API_KEY."), 400
    body = request.get_json(force=True)
    field = body.get("field")
    if field not in AI_FIELD_SPECS:
        return jsonify(error="Campo inválido."), 400
    data = body.get("data") or {}

    label, instruction = AI_FIELD_SPECS[field]
    context_lines = []
    for key, pt in FIELD_LABELS_PT.items():
        value = (str(data.get(key) or "")).strip()
        if value and key != field:
            context_lines.append(f"- {pt}: {value}")
    context = "\n".join(context_lines) if context_lines else "(nenhum campo preenchido ainda)"

    system_prompt = (
        "Você é um escritor criativo de worldbuilding do projeto Niro, um universo de fantasia/RPG com "
        "regiões místicas, runas antigas, elementos mágicos e personagens jogáveis de 4 e 5 estrelas, no "
        "estilo de RPGs gacha. Você escreve em português do Brasil, com tom épico, criativo e coerente com "
        "as informações fornecidas. Responda APENAS com o texto solicitado para o campo, sem títulos, sem "
        "markdown, sem comentários adicionais e sem repetir o nome do campo."
    )
    user_prompt = (
        f"Informações já preenchidas do personagem:\n{context}\n\n"
        f"Tarefa: preencha o campo \"{label}\".\n{instruction}"
    )

    model = os.environ.get("OPENROUTER_MODEL", "anthropic/claude-haiku-4.5")
    payload = {
        "model": model,
        "stream": True,
        "max_tokens": 3000,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3004",
        "X-Title": "Niro Character Manager",
    }

    def generate():
        try:
            with requests.post("https://openrouter.ai/api/v1/chat/completions",
                               json=payload, headers=headers, stream=True, timeout=180) as resp:
                if resp.status_code != 200:
                    detail = resp.text[:300]
                    yield f"ERRO: OpenRouter retornou {resp.status_code}. {detail}"
                    return
                for line in resp.iter_lines(decode_unicode=True):
                    if not line or not line.startswith("data: "):
                        continue
                    chunk = line[6:]
                    if chunk == "[DONE]":
                        break
                    try:
                        delta = json.loads(chunk)["choices"][0]["delta"].get("content") or ""
                    except (KeyError, IndexError, json.JSONDecodeError):
                        continue
                    if delta:
                        yield delta
        except requests.RequestException as exc:
            yield f"ERRO: falha de conexão com o OpenRouter ({exc})"

    return Response(stream_with_context(generate()),
                    mimetype="text/plain; charset=utf-8",
                    headers={"X-Accel-Buffering": "no", "Cache-Control": "no-cache"})


# ---------------------------------------------------------------- bootstrap

def find_free_port(preferred=3004, tries=50):
    for port in range(preferred, preferred + tries):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    return preferred


if __name__ == "__main__":
    init_db()
    purge_expired_archive()
    port = find_free_port(3004)
    threading.Timer(1.0, lambda: webbrowser.open(f"http://localhost:{port}")).start()
    print(f"\n  Niro Character Manager rodando em http://localhost:{port}\n")
    app.run(host="127.0.0.1", port=port, debug=False)
