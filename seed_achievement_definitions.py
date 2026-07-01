from app import create_app, db
from app.models.achievement_definition import AchievementDefinition

app = create_app()

with app.app_context():

    conquistas = [

        # DESPERTAR

        ("Despertar I", "Primeira tarefa concluída", "Despertar", 1, "Comum", 25, 1, 0, 0),
        ("Despertar II", "5 tarefas concluídas", "Despertar", 2, "Comum", 50, 5, 0, 0),
        ("Despertar III", "15 tarefas concluídas", "Despertar", 3, "Comum", 75, 15, 0, 0),

        # FUNDAMENTOS

        ("Fundamentos I", "25 tarefas concluídas", "Fundamentos", 1, "Comum", 100, 25, 0, 0),
        ("Fundamentos II", "50 tarefas concluídas", "Fundamentos", 2, "Comum", 125, 50, 0, 0),
        ("Fundamentos III", "100 tarefas concluídas", "Fundamentos", 3, "Rara", 150, 100, 0, 0),

        # PERSISTENTE

        ("Persistente I", "150 tarefas concluídas", "Persistente", 1, "Rara", 200, 150, 0, 0),
        ("Persistente II", "250 tarefas concluídas", "Persistente", 2, "Rara", 250, 250, 0, 0),
        ("Persistente III", "400 tarefas concluídas", "Persistente", 3, "Rara", 300, 400, 0, 0),

        # EXECUTOR

        ("Executor I", "600 tarefas concluídas", "Executor", 1, "Épica", 350, 600, 0, 0),
        ("Executor II", "850 tarefas concluídas", "Executor", 2, "Épica", 400, 850, 0, 0),
        ("Executor III", "1200 tarefas concluídas", "Executor", 3, "Épica", 500, 1200, 0, 0),

        # ARQUITETO

        ("Arquiteto I", "1600 tarefas e 5 jornadas", "Arquiteto", 1, "Épica", 600, 1600, 5, 0),
        ("Arquiteto II", "2100 tarefas e 8 jornadas", "Arquiteto", 2, "Épica", 700, 2100, 8, 0),
        ("Arquiteto III", "2700 tarefas e 10 jornadas", "Arquiteto", 3, "Lendária", 800, 2700, 10, 0),

        # ESTRATEGISTA

        ("Estrategista I", "3300 tarefas e 12 jornadas", "Estrategista", 1, "Lendária", 900, 3300, 12, 0),
        ("Estrategista II", "4000 tarefas e 16 jornadas", "Estrategista", 2, "Lendária", 1000, 4000, 16, 0),
        ("Estrategista III", "4800 tarefas e 20 jornadas", "Estrategista", 3, "Lendária", 1100, 4800, 20, 0),

        # DOMINADOR

        ("Dominador I", "5500 tarefas e 25 jornadas", "Dominador", 1, "Mítica", 1200, 5500, 25, 0),
        ("Dominador II", "6500 tarefas e 30 jornadas", "Dominador", 2, "Mítica", 1400, 6500, 30, 0),
        ("Dominador III", "7500 tarefas e 35 jornadas", "Dominador", 3, "Mítica", 1600, 7500, 35, 0),

        # LEGADO

        ("Legado I", "9000 tarefas e 40 jornadas", "Legado", 1, "Mítica", 1800, 9000, 40, 0),
        ("Legado II", "11000 tarefas e 45 jornadas", "Legado", 2, "Mítica", 2000, 11000, 45, 0),
        ("Legado III", "13000 tarefas e 50 jornadas", "Legado", 3, "Ascendente", 2500, 13000, 50, 0),

        # ASCENSÃO

        ("Ascensão I", "15000 tarefas e 60 jornadas", "Ascensão", 1, "Ascendente", 3000, 15000, 60, 180),
        ("Ascensão II", "18000 tarefas e 80 jornadas", "Ascensão", 2, "Ascendente", 3500, 18000, 80, 270),
        ("Ascensão III", "20000 tarefas e 100 jornadas", "Ascensão", 3, "Ascendente", 5000, 20000, 100, 365),
    ]

    for item in conquistas:

        existe = AchievementDefinition.query.filter_by(
            titulo=item[0]
        ).first()

        if not existe:

            db.session.add(
                AchievementDefinition(
                    titulo=item[0],
                    descricao=item[1],
                    categoria=item[2],
                    nivel=item[3],
                    raridade=item[4],
                    xp=item[5],
                    tarefas_requeridas=item[6],
                    jornadas_requeridas=item[7],
                    dias_consistencia=item[8]
                )
            )

    db.session.commit()

    print("Achievement Definitions cadastradas.")