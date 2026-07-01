from datetime import datetime
from app import db


class Goal(db.Model):
    __tablename__ = "goals"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    titulo = db.Column(
        db.String(150),
        nullable=False
    )

    descricao = db.Column(db.Text)

    categoria = db.Column(
        db.String(50),
        nullable=False
    )

    status = db.Column(
        db.String(30),
        default="Em andamento"
    )

    prazo = db.Column(db.Date)

    progresso = db.Column(
        db.Integer,
        default=0
    )

    cover_image = db.Column(
        db.String(255),
        nullable=True
    )

    data_criacao = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    # RELACIONAMENTO

    blocks = db.relationship(
        "GoalBlock",
        backref="goal",
        lazy="selectin",
        cascade="all, delete-orphan"
    )