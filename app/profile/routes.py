from datetime import datetime, date
import calendar
from flask import Blueprint, render_template, request, redirect, url_for, current_app
from flask_login import login_required, current_user
import bcrypt
from app import db
from app.models.goal import Goal
from app.models.achievement import Achievement
from app.models.goal_block import GoalBlock
from app.models.goal_block_item import GoalBlockItem
from app.models.user_event import UserEvent
from app.models.user import User
from app.utils import (
    obter_progressao_titulos,
    calcular_classe_evolucao,
    calcular_titulo_ascend,
    calcular_avatar_frame,
    obter_insignias_usuario,
    obter_dominios_ascensao,
    aplicar_reset_metas_recorrentes,
    salvar_arquivo_upload
)

profile_bp = Blueprint("profile", __name__)


@profile_bp.route("/hall")
@login_required
def hall_ascensao():
    progressao = obter_progressao_titulos(current_user)

    conquistas_total = Achievement.query.filter_by(
        user_id=current_user.id
    ).count()

    eventos_total = UserEvent.query.filter_by(
        user_id=current_user.id
    ).count()

    eventos_xp = db.session.query(
        db.func.coalesce(db.func.sum(UserEvent.xp), 0)
    ).filter(
        UserEvent.user_id == current_user.id
    ).scalar()

    classe_evolucao = calcular_classe_evolucao(current_user)

    return render_template(
        "hall_ascensao.html",
        usuario=current_user,
        classe_evolucao=classe_evolucao,
        rank_atual=calcular_titulo_ascend(current_user),
        progressao=progressao,
        conquistas_total=conquistas_total,
        eventos_total=eventos_total,
        eventos_xp=eventos_xp,
        streak_global=current_user.streak_atual or 0,
        recorde_global=current_user.melhor_streak or 0,
        ultima_atividade_global=current_user.ultima_atividade,
        avatar_frame=calcular_avatar_frame(current_user),
        insignias=obter_insignias_usuario(current_user),
        dominios_ascensao=obter_dominios_ascensao(current_user),
        insignias_destaque=obter_insignias_usuario(current_user)[:5]
    )


@profile_bp.route("/ascensao")
@login_required
def ascensao():
    aplicar_reset_metas_recorrentes(current_user)
    db.session.commit()

    metas_usuario = Goal.query.filter_by(
        user_id=current_user.id
    ).all()

    total_metas = len(metas_usuario)
    progresso_medio = 0

    if total_metas > 0:
        progresso_medio = round(
            sum(meta.progresso for meta in metas_usuario) / total_metas,
            1
        )

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

    conquistas_total = Achievement.query.filter_by(
        user_id=current_user.id
    ).count()

    eventos = UserEvent.query.filter_by(
        user_id=current_user.id
    ).order_by(
        UserEvent.criado_em.desc()
    ).limit(50).all()

    eventos_total = UserEvent.query.filter_by(
        user_id=current_user.id
    ).count()

    hoje = date.today()
    primeiro_dia_mes = hoje.replace(day=1)
    ultimo_dia_mes = hoje.replace(
        day=calendar.monthrange(hoje.year, hoje.month)[1]
    )

    eventos_mes = UserEvent.query.filter(
        UserEvent.user_id == current_user.id,
        UserEvent.criado_em >= datetime.combine(primeiro_dia_mes, datetime.min.time()),
        UserEvent.criado_em <= datetime.combine(ultimo_dia_mes, datetime.max.time())
    ).all()

    dias_com_evento = {
        evento.criado_em.date()
        for evento in eventos_mes
    }

    calendario_consistencia = []
    for dia in range(1, ultimo_dia_mes.day + 1):
        data_atual = hoje.replace(day=dia)

        calendario_consistencia.append({
            "dia": dia,
            "ativo": data_atual in dias_com_evento,
            "hoje": data_atual == hoje,
            "futuro": data_atual > hoje
        })

    dias_ativos_mes = len(dias_com_evento)

    return render_template(
        "ascensao.html",
        usuario=current_user,
        rank_atual=calcular_titulo_ascend(current_user),
        total_metas=total_metas,
        progresso_medio=progresso_medio,
        life_map=life_map,
        metas_quentes=metas_quentes,
        metas_frias=metas_frias,
        melhor_streak=melhor_streak,
        streak_global=current_user.streak_atual or 0,
        recorde_global=current_user.melhor_streak or 0,
        ultima_atividade_global=current_user.ultima_atividade,
        momentum_medio=momentum_medio,
        conquistas_total=conquistas_total,
        eventos=eventos,
        eventos_total=eventos_total,
        calendario_consistencia=calendario_consistencia,
        dias_ativos_mes=dias_ativos_mes,
        mes_atual=hoje.strftime("%m/%Y"),
        avatar_frame=calcular_avatar_frame(current_user),
        insignias=obter_insignias_usuario(current_user),
        insignias_destaque=obter_insignias_usuario(current_user)[:5]
    )


@profile_bp.route("/conquistas")
@login_required
def conquistas():
    conquistas_usuario = Achievement.query.filter_by(
        user_id=current_user.id
    ).all()

    return render_template(
        "conquistas.html",
        conquistas=conquistas_usuario
    )


@profile_bp.route("/perfil", methods=["GET", "POST"])
@login_required
def perfil():
    if request.method == "POST":
        nome = request.form.get("nome", "").strip()
        email = request.form.get("email", "").strip().lower()
        senha_atual = request.form.get("senha_atual", "")
        nova_senha = request.form.get("nova_senha", "")

        if not nome or not email:
            return "Nome e e-mail são obrigatórios."

        email_em_uso = User.query.filter(
            User.email == email,
            User.id != current_user.id
        ).first()

        if email_em_uso:
            return "Este e-mail já está sendo usado por outro usuário."

        current_user.nome = nome
        current_user.email = email

        arquivo_avatar = request.files.get("avatar")
        nome_avatar = salvar_arquivo_upload(
            arquivo_avatar,
            current_app.config["UPLOAD_FOLDER"]
        )

        if nome_avatar:
            current_user.avatar = nome_avatar

        if nova_senha:
            if not senha_atual:
                return "Informe sua senha atual para definir uma nova senha."

            senha_confere = bcrypt.checkpw(
                senha_atual.encode("utf-8"),
                current_user.senha_hash.encode("utf-8")
            )

            if not senha_confere:
                return "Senha atual incorreta."

            current_user.senha_hash = bcrypt.hashpw(
                nova_senha.encode("utf-8"),
                bcrypt.gensalt()
            ).decode("utf-8")

        db.session.commit()
        return redirect(url_for("profile.perfil", atualizado=1))

    total_jornadas = Goal.query.filter_by(
        user_id=current_user.id
    ).count()

    jornadas_concluidas = Goal.query.filter_by(
        user_id=current_user.id,
        status="Concluída"
    ).count()

    conquistas_total = Achievement.query.filter_by(
        user_id=current_user.id
    ).count()

    eventos_total = UserEvent.query.filter_by(
        user_id=current_user.id
    ).count()

    eventos_perfil = UserEvent.query.filter_by(
        user_id=current_user.id
    ).order_by(
        UserEvent.criado_em.desc()
    ).limit(6).all()

    classe_evolucao = calcular_classe_evolucao(current_user)

    return render_template(
        "perfil.html",
        usuario=current_user,
        classe_evolucao=classe_evolucao,
        rank_atual=calcular_titulo_ascend(current_user),
        total_jornadas=total_jornadas,
        jornadas_concluidas=jornadas_concluidas,
        conquistas_total=conquistas_total,
        eventos_total=eventos_total,
        eventos_perfil=eventos_perfil,
        dominios_ascensao=obter_dominios_ascensao(current_user),
        streak_global=current_user.streak_atual or 0,
        recorde_global=current_user.melhor_streak or 0,
        ultima_atividade_global=current_user.ultima_atividade,
        avatar_frame=calcular_avatar_frame(current_user),
        insignias=obter_insignias_usuario(current_user),
        progressao_ranque=obter_progressao_titulos(current_user)
    )
