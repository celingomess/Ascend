from datetime import datetime
from flask import Blueprint, render_template, redirect, url_for
from flask_login import login_required, current_user
from app import db
from app.models.goal import Goal
from app.models.achievement import Achievement
from app.models.goal_block import GoalBlock
from app.models.goal_block_item import GoalBlockItem
from app.models.goal_progress import GoalProgress
from app.models.user_event import UserEvent
from app.utils import (
    aplicar_reset_metas_recorrentes,
    gerar_heatmap_consistencia,
    calcular_classe_evolucao,
    calcular_titulo_ascend,
    calcular_avatar_frame,
    obter_progressao_titulos
)

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/")
@dashboard_bp.route("/home")
def home():
    if current_user.is_authenticated:
        return redirect(url_for("dashboard.dashboard"))
    return render_template("home.html")


@dashboard_bp.route("/dashboard")
@login_required
def dashboard():
    aplicar_reset_metas_recorrentes(current_user)
    db.session.commit()

    metas_usuario = Goal.query.filter_by(user_id=current_user.id).all()
    total_metas = len(metas_usuario)

    metas_concluidas = len([
        meta for meta in metas_usuario
        if meta.status == "Concluída"
    ])

    metas_em_andamento = total_metas - metas_concluidas
    progresso_medio = 0

    if total_metas > 0:
        progresso_medio = round(
            sum(meta.progresso for meta in metas_usuario) / total_metas,
            1
        )

    dados_status = [
        metas_em_andamento,
        metas_concluidas
    ]

    categorias = [
        "Carreira",
        "Estudos",
        "Saúde",
        "Projetos",
        "Finanças",
        "Pessoal"
    ]

    life_map = {}
    for categoria in categorias:
        metas_categoria = [
            meta for meta in metas_usuario
            if meta.categoria == categoria
        ]

        if metas_categoria:
            life_map[categoria] = round(
                sum(meta.progresso for meta in metas_categoria) / len(metas_categoria),
                1
            )
        else:
            life_map[categoria] = 0

    conquistas_total = Achievement.query.filter_by(
        user_id=current_user.id
    ).count()

    metas_inteligentes = GoalBlockItem.query.join(
        GoalBlock,
        GoalBlockItem.block_id == GoalBlock.id
    ).join(
        Goal,
        GoalBlock.goal_id == Goal.id
    ).filter(
        Goal.user_id == current_user.id,
        GoalBlockItem.tipo == "mini_meta",
        GoalBlockItem.parent_id == None
    ).all()

    metas_quentes = 0
    metas_frias = 0
    melhor_streak = 0
    momentum_total = 0

    for item in metas_inteligentes:
        temperatura = item.temperatura()

        if temperatura == "quente":
            metas_quentes += 1
            momentum_total += 100
        elif temperatura == "morna":
            momentum_total += 60
        else:
            metas_frias += 1
            momentum_total += 20

        if item.melhor_streak and item.melhor_streak > melhor_streak:
            melhor_streak = item.melhor_streak

    momentum_medio = 0
    if metas_inteligentes:
        momentum_medio = round(momentum_total / len(metas_inteligentes))

    heatmap_consistencia = gerar_heatmap_consistencia(
        current_user,
        35
    )

    eventos_dashboard = UserEvent.query.filter_by(
        user_id=current_user.id
    ).order_by(
        UserEvent.criado_em.desc()
    ).limit(8).all()

    # Calcular as próximas ações de todas as áreas (blocos) do usuário
    proximas_acoes = []
    for meta in metas_usuario:
        for bloco in meta.blocks:
            next_val = None
            next_type = None

            # Procura nas metas inteligentes
            itens_pai = GoalBlockItem.query.filter_by(block_id=bloco.id, parent_id=None).all()
            for item in itens_pai:
                if item.tipo == "mini_meta":
                    # Se for meta recorrente e já foi exercitada hoje, pula
                    is_recorrente = item.frequencia in ["diaria", "semanal", "mensal"]
                    ja_feito_hoje = False
                    if is_recorrente and item.ultima_atividade:
                        from datetime import timedelta
                        local_now = datetime.utcnow() - timedelta(hours=3)
                        local_ativ = item.ultima_atividade - timedelta(hours=3)
                        if local_ativ.date() == local_now.date():
                            ja_feito_hoje = True

                    if not ja_feito_hoje and next_val is None and item.meta_valor and (item.valor_atual or 0) < item.meta_valor:
                        next_val = item.titulo
                        next_type = "Meta"
                    if next_val is None and item.filhos:
                        for filho in item.filhos:
                            if next_val is None and not filho.concluido:
                                next_val = filho.titulo
                                next_type = "Subtarefa"

            # Procura nas trilhas
            if next_val is None:
                progressos = GoalProgress.query.filter_by(block_id=bloco.id).all()
                for progresso in progressos:
                    for etapa in progresso.etapas:
                        if next_val is None and not etapa.concluido:
                            next_val = etapa.titulo
                            next_type = "Trilha"

            if next_val:
                proximas_acoes.append({
                    "jornada": meta.titulo,
                    "area": bloco.titulo,
                    "bloco_id": bloco.id,
                    "meta_id": meta.id,
                    "acao": next_val,
                    "tipo": next_type
                })

    classe_evolucao = calcular_classe_evolucao(current_user)

    return render_template(
        "dashboard.html",
        usuario=current_user,
        classe_evolucao=classe_evolucao,
        rank_atual=calcular_titulo_ascend(current_user),
        total_metas=total_metas,
        metas_concluidas=metas_concluidas,
        metas_em_andamento=metas_em_andamento,
        progresso_medio=progresso_medio,
        dados_status=dados_status,
        metas=metas_usuario[:5],
        conquistas_total=conquistas_total,
        life_map=life_map,
        metas_quentes=metas_quentes,
        metas_frias=metas_frias,
        melhor_streak=melhor_streak,
        streak_global=current_user.streak_atual or 0,
        recorde_global=current_user.melhor_streak or 0,
        momentum_medio=momentum_medio,
        avatar_frame=calcular_avatar_frame(current_user),
        heatmap_consistencia=heatmap_consistencia,
        eventos_dashboard=eventos_dashboard,
        proximas_acoes=proximas_acoes,
        progressao_ranque=obter_progressao_titulos(current_user)
    )
