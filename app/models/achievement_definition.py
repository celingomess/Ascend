from app import db


class AchievementDefinition(db.Model):

    __tablename__ = "achievement_definitions"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    titulo = db.Column(
        db.String(100),
        nullable=False
    )

    descricao = db.Column(
        db.String(255)
    )

    categoria = db.Column(
        db.String(50)
    )

    nivel = db.Column(
        db.Integer,
        default=1
    )

    raridade = db.Column(
        db.String(30),
        default="Comum"
    )

    xp = db.Column(
        db.Integer,
        default=50
    )

    tarefas_requeridas = db.Column(
        db.Integer,
        default=0
    )

    jornadas_requeridas = db.Column(
        db.Integer,
        default=0
    )

    dias_consistencia = db.Column(
        db.Integer,
        default=0
    )