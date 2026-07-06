from datetime import datetime, date, timedelta
import os
import uuid
from flask import current_app, jsonify
from werkzeug.utils import secure_filename
from app import db
from app.models.user import User
from app.models.goal import Goal
from app.models.achievement import Achievement
from app.models.goal_block import GoalBlock
from app.models.goal_block_item import GoalBlockItem
from app.models.goal_block_item_option import GoalBlockItemOption
from app.models.goal_progress import GoalProgress
from app.models.goal_progress_step import GoalProgressStep
from app.models.achievement_definition import AchievementDefinition
from app.models.user_event import UserEvent


def salvar_arquivo_upload(arquivo, upload_folder):
    if arquivo and arquivo.filename:
        nome_original = secure_filename(arquivo.filename)
        extensao = os.path.splitext(nome_original)[1]
        nome_arquivo = f"{uuid.uuid4().hex}{extensao}"
        caminho = os.path.join(upload_folder, nome_arquivo)
        arquivo.save(caminho)
        return nome_arquivo
    return None


def atualizar_nivel(usuario):
    while usuario.xp_total >= usuario.nivel * 500:
        usuario.nivel += 1


def registrar_evento(usuario, titulo, descricao="", tipo="geral", xp=0):
    evento = UserEvent(
        user_id=usuario.id,
        titulo=titulo,
        descricao=descricao,
        tipo=tipo,
        xp=xp
    )
    db.session.add(evento)


def aplicar_reset_metas_recorrentes(usuario):
    agora = datetime.utcnow()

    metas_recorrentes = GoalBlockItem.query.join(
        GoalBlock,
        GoalBlockItem.block_id == GoalBlock.id
    ).join(
        Goal,
        GoalBlock.goal_id == Goal.id
    ).filter(
        Goal.user_id == usuario.id,
        GoalBlockItem.tipo == "mini_meta",
        GoalBlockItem.frequencia.in_(["diaria", "semanal", "mensal"])
    ).all()

    for item in metas_recorrentes:
        referencia = item.ultima_reinicializacao or item.criado_em or agora
        deve_resetar = False

        if item.frequencia == "diaria":
            deve_resetar = referencia.date() < agora.date()

        elif item.frequencia == "semanal":
            semana_referencia = referencia.isocalendar()[:2]
            semana_atual = agora.isocalendar()[:2]
            deve_resetar = semana_referencia != semana_atual

        elif item.frequencia == "mensal":
            deve_resetar = (
                referencia.year != agora.year
                or referencia.month != agora.month
            )

        if deve_resetar:
            if item.valor_atual and item.meta_valor and item.valor_atual < item.meta_valor:
                item.streak_atual = 0
                registrar_evento(
                    usuario,
                    "Sequência reiniciada",
                    item.titulo,
                    "streak",
                    0
                )

            item.valor_atual = 0
            item.concluido = False
            item.ultima_reinicializacao = agora

            registrar_evento(
                usuario,
                "Meta recorrente reiniciada",
                item.titulo,
                "reset",
                0
            )


def atualizar_streak_item(item):
    hoje = date.today()

    if item.ultima_data_streak is None:
        item.streak_atual = 1

    elif item.ultima_data_streak == hoje:
        return

    elif item.ultima_data_streak == hoje - timedelta(days=1):
        item.streak_atual = (item.streak_atual or 0) + 1

    else:
        item.streak_atual = 1

    item.ultima_data_streak = hoje

    if not item.melhor_streak or item.streak_atual > item.melhor_streak:
        item.melhor_streak = item.streak_atual


def atualizar_streak_usuario(usuario):
    hoje = date.today()

    if usuario.ultima_atividade is None:
        usuario.streak_atual = 1

    elif usuario.ultima_atividade == hoje:
        return

    elif usuario.ultima_atividade == hoje - timedelta(days=1):
        usuario.streak_atual = (usuario.streak_atual or 0) + 1

    else:
        usuario.streak_atual = 1

    usuario.ultima_atividade = hoje

    if (
        not usuario.melhor_streak
        or usuario.streak_atual > usuario.melhor_streak
    ):
        usuario.melhor_streak = usuario.streak_atual


def recalcular_progresso_meta(meta):
    blocos = GoalBlock.query.filter_by(goal_id=meta.id).all()

    if not blocos:
        meta.progresso = 0
        return

    progresso_blocos = []

    for bloco in blocos:
        itens_pai = GoalBlockItem.query.filter_by(
            block_id=bloco.id,
            parent_id=None
        ).all()

        # Desconsiderar metas recorrentes (diárias, semanais, mensais) para evitar queda no progresso geral no reset
        itens_calculo = [
            item for item in itens_pai
            if not (item.tipo == "mini_meta" and item.frequencia in ["diaria", "semanal", "mensal"])
        ]

        total_elementos = 0
        soma_progresso = 0

        for item in itens_calculo:
            total_elementos += 1
            soma_progresso += item.percentual()

        progressos = GoalProgress.query.filter_by(block_id=bloco.id).all()
        for progresso in progressos:
            total_elementos += 1
            soma_progresso += progresso.percentual()

        if total_elementos > 0:
            progresso_blocos.append(soma_progresso / total_elementos)
        else:
            progresso_blocos.append(0)

    meta.progresso = round(sum(progresso_blocos) / len(progresso_blocos))

    if meta.progresso >= 100:
        meta.progresso = 100


def retornar_json_progresso(meta, bloco, extra_data=None):
    itens_pai = GoalBlockItem.query.filter_by(block_id=bloco.id, parent_id=None).all()
    itens_calculo = [
        item for item in itens_pai
        if not (item.tipo == "mini_meta" and item.frequencia in ["diaria", "semanal", "mensal"])
    ]
    total_elementos = 0
    soma_progresso = 0
    for item in itens_calculo:
        total_elementos += 1
        soma_progresso += item.percentual()
    progressos = GoalProgress.query.filter_by(block_id=bloco.id).all()
    for progresso in progressos:
        total_elementos += 1
        soma_progresso += progresso.percentual()
    bloco_media_progresso = round(soma_progresso / total_elementos, 1) if total_elementos > 0 else 0

    from flask_login import current_user
    data = {
        "success": True,
        "meta_progresso": meta.progresso,
        "bloco_id": bloco.id,
        "bloco_media_progresso": bloco_media_progresso,
        "usuario_nivel": current_user.nivel if current_user.is_authenticated else 1,
        "usuario_xp": current_user.xp_total if current_user.is_authenticated else 0
    }
    if extra_data:
        data.update(extra_data)
    return jsonify(data)



def verificar_conquistas(usuario):
    total_itens_concluidos = GoalBlockItem.query.join(
        GoalBlock,
        GoalBlockItem.block_id == GoalBlock.id
    ).join(
        Goal,
        GoalBlock.goal_id == Goal.id
    ).filter(
        Goal.user_id == usuario.id,
        GoalBlockItem.concluido == True
    ).count()

    total_etapas_concluidas = GoalProgressStep.query.join(
        GoalProgress,
        GoalProgressStep.progress_id == GoalProgress.id
    ).join(
        GoalBlock,
        GoalProgress.block_id == GoalBlock.id
    ).join(
        Goal,
        GoalBlock.goal_id == Goal.id
    ).filter(
        Goal.user_id == usuario.id,
        GoalProgressStep.concluido == True
    ).count()

    total_tarefas = total_itens_concluidos + total_etapas_concluidas

    jornadas_concluidas = Goal.query.filter_by(
        user_id=usuario.id,
        status="Concluída"
    ).count()

    definicoes = AchievementDefinition.query.order_by(
        AchievementDefinition.tarefas_requeridas,
        AchievementDefinition.jornadas_requeridas
    ).all()

    icone_map = {
        "Despertar": "bi-stars",
        "Fundamentos": "bi-book",
        "Persistente": "bi-fire",
        "Executor": "bi-lightning-charge-fill",
        "Arquiteto": "bi-building",
        "Estrategista": "bi-diagram-3",
        "Dominador": "bi-shield-fill-check",
        "Legado": "bi-gem",
        "Ascensão": "bi-trophy-fill"
    }

    for definicao in definicoes:
        ja_tem = Achievement.query.filter_by(
            user_id=usuario.id,
            titulo=definicao.titulo
        ).first()

        if ja_tem:
            continue

        requisitos_ok = (
            total_tarefas >= definicao.tarefas_requeridas
            and jornadas_concluidas >= definicao.jornadas_requeridas
            and definicao.dias_consistencia == 0
        )

        if requisitos_ok:
            nova_conquista = Achievement(
                titulo=definicao.titulo,
                descricao=definicao.descricao,
                icone=icone_map.get(definicao.categoria, "bi-award-fill"),
                user_id=usuario.id,
                xp=definicao.xp,
                raridade=definicao.raridade
            )

            usuario.xp_total += definicao.xp
            atualizar_streak_usuario(usuario)
            db.session.add(nova_conquista)

            registrar_evento(
                usuario,
                "Conquista desbloqueada",
                definicao.titulo,
                "achievement",
                definicao.xp
            )

    atualizar_nivel(usuario)


def calcular_rank_atual(usuario):
    categorias_rank = [
        "Despertar",
        "Fundamentos",
        "Persistente",
        "Executor",
        "Arquiteto",
        "Estrategista",
        "Dominador",
        "Legado",
        "Ascensão"
    ]

    rank_atual = "Despertar"
    maior_rank = 0

    conquistas_usuario = Achievement.query.filter_by(user_id=usuario.id).all()

    for conquista in conquistas_usuario:
        definicao = AchievementDefinition.query.filter_by(
            titulo=conquista.titulo
        ).first()

        if definicao and definicao.categoria in categorias_rank:
            indice = categorias_rank.index(definicao.categoria)
            if indice > maior_rank:
                maior_rank = indice
                rank_atual = definicao.categoria

    return rank_atual


def calcular_titulo_ascend(usuario):
    xp = usuario.xp_total or 0

    titulos = [
        (0, "Despertar I"),
        (250, "Despertar II"),
        (500, "Despertar III"),

        (1000, "Persistente I"),
        (1750, "Persistente II"),
        (2500, "Persistente III"),

        (4000, "Executor I"),
        (6000, "Executor II"),
        (8500, "Executor III"),

        (12000, "Arquiteto I"),
        (16000, "Arquiteto II"),
        (21000, "Arquiteto III"),

        (30000, "Estrategista I"),
        (40000, "Estrategista II"),
        (50000, "Estrategista III"),

        (65000, "Visionário I"),
        (80000, "Visionário II"),
        (100000, "Visionário III")
    ]

    titulo = "Despertar I"

    for xp_minimo, nome in titulos:
        if xp >= xp_minimo:
            titulo = nome
        else:
            break

    return titulo


def calcular_avatar_frame(usuario):
    titulo = calcular_titulo_ascend(usuario)

    if titulo.startswith("Visionário"):
        return "frame-visionario"

    if titulo.startswith("Estrategista"):
        return "frame-estrategista"

    if titulo.startswith("Arquiteto"):
        return "frame-arquiteto"

    if titulo.startswith("Executor"):
        return "frame-executor"

    if titulo.startswith("Persistente"):
        return "frame-persistente"

    return "frame-despertar"


def obter_progressao_titulos(usuario):
    xp = usuario.xp_total or 0

    titulos = [
        (0, "Despertar I", "Despertar"),
        (250, "Despertar II", "Despertar"),
        (500, "Despertar III", "Despertar"),

        (1000, "Persistente I", "Persistente"),
        (1750, "Persistente II", "Persistente"),
        (2500, "Persistente III", "Persistente"),

        (4000, "Executor I", "Executor"),
        (6000, "Executor II", "Executor"),
        (8500, "Executor III", "Executor"),

        (12000, "Arquiteto I", "Arquiteto"),
        (16000, "Arquiteto II", "Arquiteto"),
        (21000, "Arquiteto III", "Arquiteto"),

        (30000, "Estrategista I", "Estrategista"),
        (40000, "Estrategista II", "Estrategista"),
        (50000, "Estrategista III", "Estrategista"),

        (65000, "Visionário I", "Visionário"),
        (80000, "Visionário II", "Visionário"),
        (100000, "Visionário III", "Visionário")
    ]

    titulo_atual = titulos[0]
    proximo_titulo = None

    for index, titulo in enumerate(titulos):
        if xp >= titulo[0]:
            titulo_atual = titulo

            if index + 1 < len(titulos):
                proximo_titulo = titulos[index + 1]
        else:
            break

    if proximo_titulo:
        xp_base = titulo_atual[0]
        xp_proximo = proximo_titulo[0]
        xp_intervalo = xp_proximo - xp_base
        xp_no_intervalo = xp - xp_base

        progresso_proximo = round((xp_no_intervalo / xp_intervalo) * 100)

        if progresso_proximo > 100:
            progresso_proximo = 100

        xp_restante = xp_proximo - xp
    else:
        progresso_proximo = 100
        xp_restante = 0

    grupos = {}

    for xp_minimo, nome, categoria in titulos:
        if categoria not in grupos:
            grupos[categoria] = []

        # Encontra se já tem esse nome no grupo
        existente = any(item["nome"] == nome for item in grupos[categoria])
        if not existente:
            grupos[categoria].append({
                "nome": nome,
                "xp_minimo": xp_minimo,
                "desbloqueado": xp >= xp_minimo,
                "atual": nome == titulo_atual[1]
            })

    return {
        "titulo_atual": titulo_atual[1],
        "proximo_titulo": proximo_titulo[1] if proximo_titulo else "Título máximo",
        "xp_atual": xp,
        "xp_proximo": proximo_titulo[0] if proximo_titulo else xp,
        "xp_restante": xp_restante,
        "progresso_proximo": progresso_proximo,
        "grupos": grupos
    }


def obter_dominios_ascensao(usuario):
    categorias = {
        "Carreira": {
            "icone": "bi-briefcase",
            "titulos": [
                (0, "Estagiário I"),
                (10, "Estagiário II"),
                (20, "Aprendiz I"),
                (30, "Aprendiz II"),
                (40, "Assistente I"),
                (50, "Profissional I"),
                (60, "Profissional II"),
                (70, "Especialista I"),
                (80, "Especialista II"),
                (90, "Referência I"),
                (100, "Líder Lendário")
            ]
        },

        "Estudos": {
            "icone": "bi-book",
            "titulos": [
                (0, "Curioso I"),
                (10, "Iniciado I"),
                (20, "Iniciado II"),
                (30, "Estudioso I"),
                (40, "Estudioso II"),
                (50, "Disciplinado I"),
                (60, "Disciplinado II"),
                (70, "Acadêmico I"),
                (80, "Acadêmico II"),
                (90, "Mestre I"),
                (100, "Sábio Supremo")
            ]
        },

        "Saúde": {
            "icone": "bi-heart-pulse",
            "titulos": [
                (0, "Base I"),
                (10, "Base II"),
                (20, "Iniciante I"),
                (30, "Iniciante II"),
                (40, "Constante I"),
                (50, "Constante II"),
                (60, "Forte I"),
                (70, "Forte II"),
                (80, "Atleta I"),
                (90, "Titã I"),
                (100, "Divindade Física")
            ]
        },

        "Projetos": {
            "icone": "bi-lightbulb",
            "titulos": [
                (0, "Sonhador I"),
                (10, "Sonhador II"),
                (20, "Criador I"),
                (30, "Criador II"),
                (40, "Desenvolvedor I"),
                (50, "Construtor I"),
                (60, "Construtor II"),
                (70, "Arquiteto I"),
                (80, "Arquiteto II"),
                (90, "Fundador I"),
                (100, "Pioneiro Visionário")
            ]
        },

        "Finanças": {
            "icone": "bi-cash-stack",
            "titulos": [
                (0, "Poupador I"),
                (10, "Organizado I"),
                (20, "Organizado II"),
                (30, "Controlador I"),
                (40, "Controlador II"),
                (50, "Acumulador I"),
                (60, "Investidor I"),
                (70, "Investidor II"),
                (80, "Próspero I"),
                (90, "Patrimônio I"),
                (100, "Magnata Financeiro")
            ]
        },

        "Pessoal": {
            "icone": "bi-person",
            "titulos": [
                (0, "Observador I"),
                (10, "Autoconhecimento I"),
                (20, "Autoconhecimento II"),
                (30, "Equilíbrio I"),
                (40, "Equilíbrio II"),
                (50, "Focado I"),
                (60, "Domínio I"),
                (70, "Domínio II"),
                (80, "Evoluído I"),
                (90, "Legado I"),
                (100, "Iluminado")
            ]
        }
    }

    dominios = []

    for categoria, config in categorias.items():
        metas_categoria = Goal.query.filter_by(
            user_id=usuario.id,
            categoria=categoria
        ).all()

        progresso = 0

        if metas_categoria:
            progresso = round(
                sum(meta.progresso for meta in metas_categoria)
                / len(metas_categoria),
                1
            )

        titulo_atual = config["titulos"][0][1]
        proximo_titulo_nome = "Título máximo"
        percentual_proximo = None

        for percentual, titulo in config["titulos"]:
            if progresso >= percentual:
                titulo_atual = titulo
            else:
                proximo_titulo_nome = titulo
                percentual_proximo = percentual
                break

        progresso_restante = None
        if percentual_proximo is not None:
            progresso_restante = round(percentual_proximo - progresso, 1)
            if progresso_restante < 0:
                progresso_restante = 0

        marcos = []
        for percentual, titulo in config["titulos"]:
            marcos.append({
                "titulo": titulo,
                "percentual": percentual,
                "desbloqueado": progresso >= percentual,
                "atual": titulo == titulo_atual
            })

        dominios.append({
            "nome": categoria,
            "icone": config["icone"],
            "progresso": progresso,
            "titulo": titulo_atual,
            "proximo_titulo": proximo_titulo_nome,
            "progresso_restante": progresso_restante,
            "marcos": marcos
        })

    return dominios


def calcular_classe_evolucao(usuario):
    dominios = obter_dominios_ascensao(usuario)

    if not dominios:
        return {
            "classe": "Iniciado",
            "subtitulo": "Primeiros Passos",
            "icone": "bi-stars",
            "descricao": "Sua jornada está apenas começando.",
            "dominio": "Geral",
            "tema": "iniciado"
        }

    dominio_principal = max(
        dominios,
        key=lambda d: d["progresso"]
    )
    nome = dominio_principal["nome"]

    classes = {
        "Estudos": {
            "classe": "Acadêmico",
            "subtitulo": "Mestre do Saber",
            "icone": "bi-mortarboard-fill",
            "descricao": "Sua evolução está focada em aprendizado, conhecimento e domínio intelectual.",
            "dominio": "Estudos",
            "tema": "academico"
        },

        "Carreira": {
            "classe": "Profissional",
            "subtitulo": "Executor de Valor",
            "icone": "bi-briefcase-fill",
            "descricao": "Sua energia está direcionada ao crescimento profissional.",
            "dominio": "Carreira",
            "tema": "profissional"
        },

        "Saúde": {
            "classe": "Atleta",
            "subtitulo": "Força e Constância",
            "icone": "bi-heart-pulse-fill",
            "descricao": "Disciplina física, vitalidade e performance definem sua evolução.",
            "dominio": "Saúde",
            "tema": "atleta"
        },

        "Projetos": {
            "classe": "Construtor",
            "subtitulo": "Criador de Estruturas",
            "icone": "bi-tools",
            "descricao": "Você transforma ideias em resultados concretos.",
            "dominio": "Projetos",
            "tema": "construtor"
        },

        "Finanças": {
            "classe": "Estrategista",
            "subtitulo": "Mente Patrimonial",
            "icone": "bi-bank",
            "descricao": "Seu foco está na construção de patrimônio e autonomia.",
            "dominio": "Finanças",
            "tema": "estrategista"
        },

        "Pessoal": {
            "classe": "Interior",
            "subtitulo": "Domínio de Si",
            "icone": "bi-person-badge-fill",
            "descricao": "Autoconhecimento e desenvolvimento pessoal conduzem sua jornada.",
            "dominio": "Pessoal",
            "tema": "interior"
        }
    }

    return classes.get(
        nome,
        {
            "classe": "Ascendente",
            "subtitulo": "Evolução Equilibrada",
            "icone": "bi-stars",
            "descricao": "Você evolui de forma equilibrada entre diferentes áreas da vida.",
            "dominio": nome,
            "tema": "ascendente"
        }
    )


def obter_insignias_usuario(usuario):
    xp = usuario.xp_total or 0
    nivel = usuario.nivel or 1
    titulo = calcular_titulo_ascend(usuario)

    total_jornadas = Goal.query.filter_by(user_id=usuario.id).count()
    jornadas_concluidas = Goal.query.filter_by(user_id=usuario.id, status="Concluída").count()
    conquistas_total = Achievement.query.filter_by(user_id=usuario.id).count()
    eventos_total = UserEvent.query.filter_by(user_id=usuario.id).count()
    eventos_dias = UserEvent.query.filter_by(user_id=usuario.id).all()

    dias_ativos = {
        evento.criado_em.date()
        for evento in eventos_dias
        if evento.criado_em
    }

    insignias = []

    if total_jornadas >= 1:
        insignias.append({
            "titulo": "Primeira Jornada",
            "descricao": "Criou sua primeira jornada dentro do Ascend.",
            "icone": "bi-compass",
            "raridade": "comum"
        })

    if jornadas_concluidas >= 1:
        insignias.append({
            "titulo": "Jornada Concluída",
            "descricao": "Concluiu uma jornada completa.",
            "icone": "bi-check-circle",
            "raridade": "rara"
        })

    if conquistas_total >= 1:
        insignias.append({
            "titulo": "Legado Iniciado",
            "descricao": "Desbloqueou sua primeira conquista.",
            "icone": "bi-trophy",
            "raridade": "comum"
        })

    if xp >= 100:
        insignias.append({
            "titulo": "Primeiro Marco",
            "descricao": "Alcançou 100 XP acumulados.",
            "icone": "bi-stars",
            "raridade": "comum"
        })

    if xp >= 1000:
        insignias.append({
            "titulo": "Milhar de Ascensão",
            "descricao": "Alcançou 1000 XP acumulados.",
            "icone": "bi-lightning-charge",
            "raridade": "rara"
        })

    if xp >= 5000:
        insignias.append({
            "titulo": "Força Consolidada",
            "descricao": "Alcançou 5000 XP acumulados.",
            "icone": "bi-gem",
            "raridade": "epica"
        })

    if nivel >= 5:
        insignias.append({
            "titulo": "Nível V",
            "descricao": "Chegou ao nível 5.",
            "icone": "bi-bar-chart",
            "raridade": "rara"
        })

    if len(dias_ativos) >= 7:
        insignias.append({
            "titulo": "7 Dias Ativos",
            "descricao": "Registrou atividade em 7 dias diferentes.",
            "icone": "bi-fire",
            "raridade": "rara"
        })

    if len(dias_ativos) >= 30:
        insignias.append({
            "titulo": "Consistência Mensal",
            "descricao": "Registrou atividade em 30 dias diferentes.",
            "icone": "bi-calendar-check",
            "raridade": "epica"
        })

    if eventos_total >= 50:
        insignias.append({
            "titulo": "Histórico Vivo",
            "descricao": "Registrou 50 eventos de evolução.",
            "icone": "bi-clock-history",
            "raridade": "rara"
        })

    if titulo.startswith("Executor"):
        insignias.append({
            "titulo": "Executor",
            "descricao": "Alcançou a classe Executor.",
            "icone": "bi-lightning-charge-fill",
            "raridade": "epica"
        })

    if titulo.startswith("Arquiteto"):
        insignias.append({
            "titulo": "Arquiteto",
            "descricao": "Alcançou a classe Arquiteto.",
            "icone": "bi-building",
            "raridade": "epica"
        })

    if titulo.startswith("Visionário"):
        insignias.append({
            "titulo": "Visionário",
            "descricao": "Alcançou a classe Visionário.",
            "icone": "bi-eye",
            "raridade": "lendaria"
        })

    return insignias


def gerar_heatmap_consistencia(usuario, dias=35):
    hoje = date.today()
    eventos = UserEvent.query.filter_by(user_id=usuario.id).all()

    dias_ativos = {
        evento.criado_em.date()
        for evento in eventos
        if evento.criado_em
    }

    heatmap = []

    for i in range(dias):
        data_ref = hoje - timedelta(days=(dias - 1 - i))
        heatmap.append({
            "data": data_ref,
            "ativo": data_ref in dias_ativos,
            "hoje": data_ref == hoje
        })

    return heatmap
