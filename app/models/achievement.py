from datetime import datetime
from app import db


class Achievement(db.Model):

    __tablename__ = "achievements"

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

    icone = db.Column(
        db.String(50)
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id")
    )

    xp = db.Column(
        db.Integer,
        default=50
    )

    raridade = db.Column(
        db.String(30),
        default="Comum"
    )

    data_desbloqueio = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )