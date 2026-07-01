from app import create_app, db
from app.models.achievement import Achievement

app = create_app()

with app.app_context():

    conquistas = [

        {
            "titulo": "Primeira Jornada",
            "descricao": "Criou sua primeira jornada.",
            "icone": "fa-flag",
            "xp": 50,
            "raridade": "Comum"
        },

        {
            "titulo": "Primeiro Módulo",
            "descricao": "Criou seu primeiro módulo.",
            "icone": "fa-layer-group",
            "xp": 50,
            "raridade": "Comum"
        },

        {
            "titulo": "Primeira Conclusão",
            "descricao": "Concluiu sua primeira tarefa.",
            "icone": "fa-check",
            "xp": 75,
            "raridade": "Comum"
        },

        {
            "titulo": "Jornada Concluída",
            "descricao": "Finalizou uma jornada.",
            "icone": "fa-trophy",
            "xp": 100,
            "raridade": "Rara"
        },

        {
            "titulo": "Persistente",
            "descricao": "Concluiu 10 tarefas.",
            "icone": "fa-fire",
            "xp": 150,
            "raridade": "Rara"
        },

        {
            "titulo": "Executor",
            "descricao": "Concluiu 50 tarefas.",
            "icone": "fa-bolt",
            "xp": 250,
            "raridade": "Épica"
        },

        {
            "titulo": "Arquiteto",
            "descricao": "Concluiu 100 tarefas.",
            "icone": "fa-crown",
            "xp": 500,
            "raridade": "Lendária"
        }

    ]

    for conquista in conquistas:

        existe = Achievement.query.filter_by(
            titulo=conquista["titulo"]
        ).first()

        if not existe:
            db.session.add(Achievement(**conquista))

    db.session.commit()

    print("Conquistas cadastradas com sucesso.")