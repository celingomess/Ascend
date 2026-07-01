from datetime import datetime
from flask import Blueprint, render_template, request, redirect, url_for, current_app
from flask_login import login_required, current_user
from app import db
from app.models.goal import Goal
from app.models.goal_block import GoalBlock
from app.models.goal_block_item import GoalBlockItem
from app.models.goal_block_item_option import GoalBlockItemOption
from app.models.goal_progress import GoalProgress
from app.models.goal_progress_step import GoalProgressStep
from app.utils import (
    aplicar_reset_metas_recorrentes,
    recalcular_progresso_meta,
    atualizar_streak_usuario,
    atualizar_streak_item,
    registrar_evento,
    atualizar_nivel,
    verificar_conquistas,
    retornar_json_progresso,
    salvar_arquivo_upload
)

goals_bp = Blueprint("goals", __name__)


@goals_bp.route("/metas")
@login_required
def metas():
    aplicar_reset_metas_recorrentes(current_user)
    db.session.commit()

    metas_usuario = Goal.query.filter_by(user_id=current_user.id).all()
    return render_template("metas.html", metas=metas_usuario)


@goals_bp.route("/metas/nova", methods=["GET", "POST"])
@login_required
def nova_meta():
    if request.method == "POST":
        prazo_formatado = None

        if request.form["prazo"]:
            prazo_formatado = datetime.strptime(
                request.form["prazo"],
                "%Y-%m-%d"
            ).date()

        arquivo_capa = request.files.get("cover_image")
        nome_capa = salvar_arquivo_upload(
            arquivo_capa,
            current_app.config["UPLOAD_FOLDER"]
        )

        nova_meta = Goal(
            user_id=current_user.id,
            titulo=request.form["titulo"],
            descricao=request.form["descricao"],
            categoria=request.form["categoria"],
            prazo=prazo_formatado,
            progresso=0,
            cover_image=nome_capa
        )

        db.session.add(nova_meta)

        current_user.xp_total += 20
        atualizar_streak_usuario(current_user)

        registrar_evento(
            current_user,
            "Jornada criada",
            nova_meta.titulo,
            "jornada",
            20
        )

        atualizar_nivel(current_user)
        db.session.commit()

        return redirect(url_for("goals.metas"))

    return render_template("nova_meta.html")


@goals_bp.route("/metas/<int:id>")
@login_required
def visualizar_meta(id):
    meta = Goal.query.get_or_404(id)

    if meta.user_id != current_user.id:
        return "Acesso negado."

    aplicar_reset_metas_recorrentes(current_user)
    recalcular_progresso_meta(meta)
    db.session.commit()

    blocos = GoalBlock.query.filter_by(
        goal_id=meta.id
    ).order_by(
        GoalBlock.ordem
    ).all()

    blocos_com_itens = []

    for bloco in blocos:
        itens = GoalBlockItem.query.filter_by(
            block_id=bloco.id,
            parent_id=None
        ).order_by(
            GoalBlockItem.ordem
        ).all()

        progressos = GoalProgress.query.filter_by(
            block_id=bloco.id
        ).order_by(
            GoalProgress.ordem
        ).all()

        if progressos:
            media_progresso = round(
                sum(progresso.percentual() for progresso in progressos) / len(progressos),
                1
            )
        else:
            media_progresso = 0

        blocos_com_itens.append({
            "bloco": bloco,
            "itens": itens,
            "progressos": progressos,
            "media_progresso": media_progresso
        })

    return render_template(
        "meta_detalhe.html",
        meta=meta,
        blocos_com_itens=blocos_com_itens
    )


@goals_bp.route("/metas/<int:id>/bloco", methods=["POST"])
@login_required
def adicionar_bloco(id):
    meta = Goal.query.get_or_404(id)

    if meta.user_id != current_user.id:
        return "Acesso negado."

    ultimo_bloco = GoalBlock.query.filter_by(
        goal_id=meta.id
    ).order_by(
        GoalBlock.ordem.desc()
    ).first()

    nova_ordem = 1

    if ultimo_bloco:
        nova_ordem = ultimo_bloco.ordem + 1

    novo_bloco = GoalBlock(
        goal_id=meta.id,
        titulo=request.form["titulo"],
        descricao=request.form["descricao"],
        ordem=nova_ordem
    )

    db.session.add(novo_bloco)

    current_user.xp_total += 10
    atualizar_streak_usuario(current_user)

    registrar_evento(
        current_user,
        "Módulo criado",
        novo_bloco.titulo,
        "modulo",
        10
    )

    atualizar_nivel(current_user)
    recalcular_progresso_meta(meta)
    db.session.commit()

    return redirect(url_for("goals.visualizar_meta", id=meta.id, modal=novo_bloco.id))


@goals_bp.route("/blocos/<int:id>/item", methods=["POST"])
@login_required
def adicionar_item_bloco(id):
    bloco = GoalBlock.query.get_or_404(id)
    meta = Goal.query.get_or_404(bloco.goal_id)

    if meta.user_id != current_user.id:
        return "Acesso negado."

    tipo = request.form.get("tipo")

    ultimo_item = GoalBlockItem.query.filter_by(
        block_id=bloco.id,
        parent_id=None
    ).order_by(
        GoalBlockItem.ordem.desc()
    ).first()

    nova_ordem = 1

    if ultimo_item:
        nova_ordem = ultimo_item.ordem + 1

    if tipo == "checklist":
        subtipo = request.form.get("subtipo_checklist")
        titulo = request.form.get("titulo_checklist")
        opcoes = request.form.get("opcoes_checklist", "")

        novo_item = GoalBlockItem(
            block_id=bloco.id,
            parent_id=None,
            tipo="checklist",
            subtipo=subtipo,
            titulo=titulo,
            ordem=nova_ordem
        )

        db.session.add(novo_item)
        db.session.flush()

        linhas = [
            linha.strip()
            for linha in opcoes.splitlines()
            if linha.strip()
        ]

        for index, linha in enumerate(linhas, start=1):
            nova_opcao = GoalBlockItemOption(
                item_id=novo_item.id,
                texto=linha,
                ordem=index
            )

            db.session.add(nova_opcao)

    elif tipo == "data":
        data_item = None

        if request.form.get("data_item"):
            data_item = datetime.strptime(
                request.form.get("data_item"),
                "%Y-%m-%d"
            ).date()

        novo_item = GoalBlockItem(
            block_id=bloco.id,
            parent_id=None,
            tipo="data",
            titulo=request.form.get("titulo"),
            data_item=data_item,
            ordem=nova_ordem
        )

        db.session.add(novo_item)

    elif tipo == "metrica":
        novo_item = GoalBlockItem(
            block_id=bloco.id,
            parent_id=None,
            tipo="metrica",
            titulo=request.form.get("titulo"),
            valor=request.form.get("valor"),
            ordem=nova_ordem
        )

        db.session.add(novo_item)

    elif tipo == "arquivo":
        arquivo = request.files.get("arquivo")
        nome_arquivo = salvar_arquivo_upload(
            arquivo,
            current_app.config["UPLOAD_FOLDER"]
        )

        novo_item = GoalBlockItem(
            block_id=bloco.id,
            parent_id=None,
            tipo="arquivo",
            titulo=request.form.get("titulo") or "Arquivo",
            arquivo=nome_arquivo,
            ordem=nova_ordem
        )

        db.session.add(novo_item)

    elif tipo == "mini_meta":
        meta_valor = request.form.get("meta_valor")

        novo_item = GoalBlockItem(
            block_id=bloco.id,
            parent_id=None,
            tipo="mini_meta",
            titulo=request.form.get("titulo"),
            conteudo=request.form.get("conteudo"),
            frequencia=request.form.get("frequencia") or "unica",
            meta_valor=int(meta_valor) if meta_valor else None,
            valor_atual=0,
            ultima_atividade=datetime.utcnow(),
            ultima_reinicializacao=datetime.utcnow(),
            ordem=nova_ordem
        )

        db.session.add(novo_item)

        registrar_evento(
            current_user,
            "Meta Inteligent criada",
            novo_item.titulo,
            "meta",
            0
        )

    else:
        novo_item = GoalBlockItem(
            block_id=bloco.id,
            parent_id=None,
            tipo=tipo,
            titulo=request.form.get("titulo"),
            conteudo=request.form.get("conteudo"),
            ordem=nova_ordem
        )

        db.session.add(novo_item)

    recalcular_progresso_meta(meta)
    db.session.commit()

    aba = "metas" if tipo == "mini_meta" else "biblioteca"
    return redirect(url_for("goals.visualizar_meta", id=meta.id, modal=bloco.id, tab=aba))


@goals_bp.route("/itens/<int:id>/filho", methods=["POST"])
@login_required
def adicionar_filho_item(id):
    item_pai = GoalBlockItem.query.get_or_404(id)
    bloco = GoalBlock.query.get_or_404(item_pai.block_id)
    meta = Goal.query.get_or_404(bloco.goal_id)

    if meta.user_id != current_user.id:
        return "Acesso negado."

    ultimo_filho = GoalBlockItem.query.filter_by(
        parent_id=item_pai.id
    ).order_by(
        GoalBlockItem.ordem.desc()
    ).first()

    nova_ordem = 1

    if ultimo_filho:
        nova_ordem = ultimo_filho.ordem + 1

    novo_filho = GoalBlockItem(
        block_id=bloco.id,
        parent_id=item_pai.id,
        tipo="subtarefa",
        titulo=request.form["titulo"],
        conteudo=request.form.get("conteudo"),
        ordem=nova_ordem
    )

    db.session.add(novo_filho)

    item_pai.ultima_atividade = datetime.utcnow()

    registrar_evento(
        current_user,
        "Subtarefa criada",
        novo_filho.titulo,
        "subtarefa",
        0
    )

    recalcular_progresso_meta(meta)
    db.session.commit()

    return redirect(url_for("goals.visualizar_meta", id=meta.id, modal=bloco.id, tab="metas"))


@goals_bp.route("/metas-inteligentes/<int:id>/incrementar")
@login_required
def incrementar_meta_inteligente(id):
    item = GoalBlockItem.query.get_or_404(id)
    bloco = GoalBlock.query.get_or_404(item.block_id)
    meta = Goal.query.get_or_404(bloco.goal_id)

    if meta.user_id != current_user.id:
        return "Acesso negado."

    if item.meta_valor:
        if item.valor_atual is None:
            item.valor_atual = 0

        if item.valor_atual < item.meta_valor:
            item.valor_atual += 1
            item.ultima_atividade = datetime.utcnow()
            atualizar_streak_item(item)

            current_user.xp_total += 2
            atualizar_streak_usuario(current_user)

            registrar_evento(
                current_user,
                "Meta atualizada",
                item.titulo,
                "meta",
                2
            )

            atualizar_nivel(current_user)

        if item.valor_atual >= item.meta_valor:
            item.concluido = True

    recalcular_progresso_meta(meta)
    verificar_conquistas(current_user)

    db.session.commit()

    if request.args.get("ajax") == "1":
        return retornar_json_progresso(meta, bloco, {
            "item_id": item.id,
            "valor_atual": item.valor_atual,
            "concluido": item.concluido,
            "percentual": item.percentual()
        })

    aba = request.args.get("tab", "metas")
    return redirect(url_for("goals.visualizar_meta", id=meta.id, modal=bloco.id, tab=aba))


@goals_bp.route("/metas-inteligentes/<int:id>/reduzir")
@login_required
def reduzir_meta_inteligente(id):
    item = GoalBlockItem.query.get_or_404(id)
    bloco = GoalBlock.query.get_or_404(item.block_id)
    meta = Goal.query.get_or_404(bloco.goal_id)

    if meta.user_id != current_user.id:
        return "Acesso negado."

    if item.valor_atual and item.valor_atual > 0:
        item.valor_atual -= 1
        item.ultima_atividade = datetime.utcnow()

    if item.meta_valor and item.valor_atual < item.meta_valor:
        item.concluido = False

    recalcular_progresso_meta(meta)
    db.session.commit()

    if request.args.get("ajax") == "1":
        return retornar_json_progresso(meta, bloco, {
            "item_id": item.id,
            "valor_atual": item.valor_atual,
            "concluido": item.concluido,
            "percentual": item.percentual()
        })

    aba = request.args.get("tab", "metas")
    return redirect(url_for("goals.visualizar_meta", id=meta.id, modal=bloco.id, tab=aba))


@goals_bp.route("/blocos/<int:id>/progresso", methods=["POST"])
@login_required
def adicionar_progresso(id):
    bloco = GoalBlock.query.get_or_404(id)
    meta = Goal.query.get_or_404(bloco.goal_id)

    if meta.user_id != current_user.id:
        return "Acesso negado."

    ultimo_progresso = GoalProgress.query.filter_by(
        block_id=bloco.id
    ).order_by(
        GoalProgress.ordem.desc()
    ).first()

    nova_ordem = 1

    if ultimo_progresso:
        nova_ordem = ultimo_progresso.ordem + 1

    novo_progresso = GoalProgress(
        block_id=bloco.id,
        titulo=request.form["titulo"],
        descricao=request.form["descricao"],
        unidade=request.form["unidade"],
        ordem=nova_ordem
    )

    db.session.add(novo_progresso)
    db.session.flush()

    etapas = request.form.get("etapas", "")

    linhas = [
        linha.strip()
        for linha in etapas.splitlines()
        if linha.strip()
    ]

    for index, linha in enumerate(linhas, start=1):
        etapa = GoalProgressStep(
            progress_id=novo_progresso.id,
            titulo=linha,
            ordem=index
        )

        db.session.add(etapa)

    recalcular_progresso_meta(meta)
    db.session.commit()

    return redirect(url_for("goals.visualizar_meta", id=meta.id, modal=bloco.id, tab="trilhas"))


@goals_bp.route("/progressos/<int:id>/etapa", methods=["POST"])
@login_required
def adicionar_etapa_progresso(id):
    progresso = GoalProgress.query.get_or_404(id)
    bloco = GoalBlock.query.get_or_404(progresso.block_id)
    meta = Goal.query.get_or_404(bloco.goal_id)

    if meta.user_id != current_user.id:
        return "Acesso negado."

    ultima_etapa = GoalProgressStep.query.filter_by(
        progress_id=progresso.id
    ).order_by(
        GoalProgressStep.ordem.desc()
    ).first()

    nova_ordem = 1

    if ultima_etapa:
        nova_ordem = ultima_etapa.ordem + 1

    etapa = GoalProgressStep(
        progress_id=progresso.id,
        titulo=request.form["titulo"],
        descricao=request.form.get("descricao"),
        ordem=nova_ordem
    )

    db.session.add(etapa)
    recalcular_progresso_meta(meta)
    db.session.commit()

    return redirect(url_for("goals.visualizar_meta", id=meta.id, modal=bloco.id, tab="trilhas"))


@goals_bp.route("/etapas/<int:id>/alternar")
@login_required
def alternar_etapa(id):
    etapa = GoalProgressStep.query.get_or_404(id)
    progresso = GoalProgress.query.get_or_404(etapa.progress_id)
    bloco = GoalBlock.query.get_or_404(progresso.block_id)
    meta = Goal.query.get_or_404(bloco.goal_id)

    if meta.user_id != current_user.id:
        return "Acesso negado."

    etapa.concluido = not etapa.concluido

    if etapa.concluido:
        current_user.xp_total += 5
        atualizar_streak_usuario(current_user)
        verificar_conquistas(current_user)

    atualizar_nivel(current_user)
    recalcular_progresso_meta(meta)
    db.session.commit()

    if request.args.get("ajax") == "1":
        return retornar_json_progresso(meta, bloco, {
            "etapa_id": etapa.id,
            "concluido": etapa.concluido,
            "progresso_id": progresso.id,
            "progresso_percentual": progresso.percentual()
        })

    return redirect(url_for("goals.visualizar_meta", id=meta.id, modal=bloco.id, tab="trilhas"))


@goals_bp.route("/etapas/<int:id>/excluir")
@login_required
def excluir_etapa(id):
    etapa = GoalProgressStep.query.get_or_404(id)
    progresso = GoalProgress.query.get_or_404(etapa.progress_id)
    bloco = GoalBlock.query.get_or_404(progresso.block_id)
    meta = Goal.query.get_or_404(bloco.goal_id)

    if meta.user_id != current_user.id:
        return "Acesso negado."

    db.session.delete(etapa)
    recalcular_progresso_meta(meta)
    db.session.commit()

    return redirect(url_for("goals.visualizar_meta", id=meta.id, modal=bloco.id, tab="trilhas"))


@goals_bp.route("/progressos/<int:id>/excluir")
@login_required
def excluir_progresso(id):
    progresso = GoalProgress.query.get_or_404(id)
    bloco = GoalBlock.query.get_or_404(progresso.block_id)
    meta = Goal.query.get_or_404(bloco.goal_id)

    if meta.user_id != current_user.id:
        return "Acesso negado."

    db.session.delete(progresso)
    recalcular_progresso_meta(meta)
    db.session.commit()

    return redirect(url_for("goals.visualizar_meta", id=meta.id, modal=bloco.id, tab="trilhas"))


@goals_bp.route("/opcoes/<int:id>/alternar")
@login_required
def alternar_opcao(id):
    opcao = GoalBlockItemOption.query.get_or_404(id)
    item = GoalBlockItem.query.get_or_404(opcao.item_id)
    bloco = GoalBlock.query.get_or_404(item.block_id)
    meta = Goal.query.get_or_404(bloco.goal_id)

    if meta.user_id != current_user.id:
        return "Acesso negado."

    if item.subtipo in ["radio", "dropdown", "escala"]:
        outras_opcoes = GoalBlockItemOption.query.filter_by(
            item_id=item.id
        ).all()

        for outra in outras_opcoes:
            outra.selecionado = False

        opcao.selecionado = True
    else:
        opcao.selecionado = not opcao.selecionado

    # Se for checkbox, o item está concluído se todas as opções estiverem selecionadas
    if item.subtipo in ["radio", "dropdown", "escala"]:
        item.concluido = any(o.selecionado for o in item.opcoes)
    else:
        item.concluido = all(o.selecionado for o in item.opcoes)

    recalcular_progresso_meta(meta)
    db.session.commit()

    if request.args.get("ajax") == "1":
        return retornar_json_progresso(meta, bloco, {
            "opcao_id": opcao.id,
            "selecionado": opcao.selecionado,
            "item_id": item.id,
            "item_concluido": item.concluido,
            "item_percentual": item.percentual()
        })

    return redirect(url_for("goals.visualizar_meta", id=meta.id, modal=bloco.id, tab="biblioteca"))


@goals_bp.route("/itens/<int:id>/alternar")
@login_required
def alternar_item(id):
    item = GoalBlockItem.query.get_or_404(id)
    bloco = GoalBlock.query.get_or_404(item.block_id)
    meta = Goal.query.get_or_404(bloco.goal_id)

    if meta.user_id != current_user.id:
        return "Acesso negado."

    item.concluido = not item.concluido
    item.ultima_atividade = datetime.utcnow()

    if item.concluido:
        atualizar_streak_item(item)
        current_user.xp_total += 5
        atualizar_streak_usuario(current_user)

        registrar_evento(
            current_user,
            "Tarefa concluída",
            item.titulo,
            "tarefa",
            5
        )

        verificar_conquistas(current_user)

    if item.pai:
        item.pai.concluido = item.pai.percentual() >= 100
        item.pai.ultima_atividade = datetime.utcnow()

        if item.concluido:
            atualizar_streak_item(item.pai)

    atualizar_nivel(current_user)
    recalcular_progresso_meta(meta)
    db.session.commit()

    if request.args.get("ajax") == "1":
        return retornar_json_progresso(meta, bloco, {
            "item_id": item.id,
            "concluido": item.concluido,
            "percentual": item.percentual(),
            "pai_id": item.pai.id if item.pai else None,
            "pai_concluido": item.pai.concluido if item.pai else None,
            "pai_percentual": item.pai.percentual() if item.pai else None
        })

    aba = request.args.get("tab", "metas")
    return redirect(url_for("goals.visualizar_meta", id=meta.id, modal=bloco.id, tab=aba))


@goals_bp.route("/itens/<int:id>/excluir")
@login_required
def excluir_item(id):
    item = GoalBlockItem.query.get_or_404(id)
    bloco = GoalBlock.query.get_or_404(item.block_id)
    meta = Goal.query.get_or_404(bloco.goal_id)

    if meta.user_id != current_user.id:
        return "Acesso negado."

    aba = "metas" if item.tipo == "mini_meta" else "biblioteca"

    db.session.delete(item)
    recalcular_progresso_meta(meta)
    db.session.commit()

    return redirect(url_for("goals.visualizar_meta", id=meta.id, modal=bloco.id, tab=aba))


@goals_bp.route("/blocos/<int:id>/excluir")
@login_required
def excluir_bloco(id):
    bloco = GoalBlock.query.get_or_404(id)
    meta = Goal.query.get_or_404(bloco.goal_id)

    if meta.user_id != current_user.id:
        return "Acesso negado."

    db.session.delete(bloco)
    recalcular_progresso_meta(meta)
    db.session.commit()

    return redirect(url_for("goals.visualizar_meta", id=meta.id))


@goals_bp.route("/itens/<int:id>/editar", methods=["POST"])
@login_required
def editar_item_bloco(id):
    item = GoalBlockItem.query.get_or_404(id)
    bloco = GoalBlock.query.get_or_404(item.block_id)
    meta = Goal.query.get_or_404(bloco.goal_id)

    if meta.user_id != current_user.id:
        return "Acesso negado."

    item.titulo = request.form.get("titulo", item.titulo)
    item.conteudo = request.form.get("conteudo", item.conteudo)

    if item.tipo == "mini_meta":
        item.frequencia = request.form.get("frequencia", item.frequencia)
        meta_valor = request.form.get("meta_valor")
        item.meta_valor = int(meta_valor) if meta_valor else None

        if item.meta_valor and (item.valor_atual or 0) >= item.meta_valor:
            item.concluido = True
        elif item.meta_valor and (item.valor_atual or 0) < item.meta_valor:
            item.concluido = False

    elif item.tipo == "data":
        data_str = request.form.get("data_item")
        if data_str:
            item.data_item = datetime.strptime(data_str, "%Y-%m-%d").date()
        else:
            item.data_item = None

    elif item.tipo == "metrica":
        item.valor = request.form.get("valor", item.valor)

    elif item.tipo == "link":
        item.conteudo = request.form.get("conteudo", item.conteudo)

    elif item.tipo == "arquivo":
        novo_arquivo = request.files.get("arquivo")
        if novo_arquivo:
            nome_arquivo = salvar_arquivo_upload(novo_arquivo, current_app.config["UPLOAD_FOLDER"])
            if nome_arquivo:
                item.arquivo = nome_arquivo

    recalcular_progresso_meta(meta)
    db.session.commit()

    aba = "metas" if item.tipo == "mini_meta" else "biblioteca"
    return redirect(url_for("goals.visualizar_meta", id=meta.id, modal=bloco.id, tab=aba))


@goals_bp.route("/opcoes/<int:item_id>/adicionar", methods=["POST"])
@login_required
def adicionar_opcao_checklist(item_id):
    item = GoalBlockItem.query.get_or_404(item_id)
    bloco = GoalBlock.query.get_or_404(item.block_id)
    meta = Goal.query.get_or_404(bloco.goal_id)

    if meta.user_id != current_user.id:
        return "Acesso negado."

    texto = request.form.get("texto", "").strip()
    if texto:
        ultima_opcao = GoalBlockItemOption.query.filter_by(item_id=item.id).order_by(GoalBlockItemOption.ordem.desc()).first()
        nova_ordem = (ultima_opcao.ordem + 1) if ultima_opcao else 1

        nova_opcao = GoalBlockItemOption(
            item_id=item.id,
            texto=texto,
            ordem=nova_ordem
        )
        db.session.add(nova_opcao)

        if item.subtipo not in ["radio", "dropdown", "escala"]:
            item.concluido = False

        recalcular_progresso_meta(meta)
        db.session.commit()

    return redirect(url_for("goals.visualizar_meta", id=meta.id, modal=bloco.id, tab="biblioteca"))


@goals_bp.route("/metas/concluir/<int:id>")
@login_required
def concluir_meta(id):
    meta = Goal.query.get_or_404(id)

    if meta.user_id != current_user.id:
        return "Acesso negado."

    recalcular_progresso_meta(meta)

    if meta.progresso >= 100 and meta.status != "Concluída":
        meta.status = "Concluída"

        current_user.xp_total += 100
        atualizar_streak_usuario(current_user)

        registrar_evento(
            current_user,
            "Jornada concluída",
            meta.titulo,
            "jornada",
            100
        )

        verificar_conquistas(current_user)
        atualizar_nivel(current_user)

        db.session.commit()

    return redirect(url_for("goals.metas"))


@goals_bp.route("/metas/editar/<int:id>", methods=["GET", "POST"])
@login_required
def editar_meta(id):
    meta = Goal.query.get_or_404(id)

    if meta.user_id != current_user.id:
        return "Acesso negado."

    if request.method == "POST":
        meta.titulo = request.form["titulo"]
        meta.descricao = request.form["descricao"]
        meta.categoria = request.form["categoria"]
        meta.status = request.form["status"]

        prazo = request.form["prazo"]

        if prazo:
            meta.prazo = datetime.strptime(
                prazo,
                "%Y-%m-%d"
            ).date()
        else:
            meta.prazo = None

        arquivo_capa = request.files.get("cover_image")
        nome_capa = salvar_arquivo_upload(
            arquivo_capa,
            current_app.config["UPLOAD_FOLDER"]
        )

        if nome_capa:
            meta.cover_image = nome_capa

        recalcular_progresso_meta(meta)
        db.session.commit()

        return redirect(url_for("goals.metas"))

    return render_template("editar_meta.html", meta=meta)


@goals_bp.route("/metas/excluir/<int:id>")
@login_required
def excluir_meta(id):
    meta = Goal.query.get_or_404(id)

    if meta.user_id != current_user.id:
        return "Acesso negado."

    blocos = GoalBlock.query.filter_by(
        goal_id=meta.id
    ).all()

    for bloco in blocos:
        progressos = GoalProgress.query.filter_by(
            block_id=bloco.id
        ).all()

        for progresso in progressos:
            etapas = GoalProgressStep.query.filter_by(
                progress_id=progresso.id
            ).all()

            for etapa in etapas:
                db.session.delete(etapa)

            db.session.delete(progresso)

        itens = GoalBlockItem.query.filter_by(
            block_id=bloco.id
        ).all()

        for item in itens:
            opcoes = GoalBlockItemOption.query.filter_by(
                item_id=item.id
            ).all()

            for opcao in opcoes:
                db.session.delete(opcao)

            db.session.delete(item)

        db.session.delete(bloco)

    db.session.delete(meta)
    db.session.commit()

    return redirect(url_for("goals.metas"))
