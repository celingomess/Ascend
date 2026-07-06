from app import db
from datetime import datetime


class GoalBlock(db.Model):
    __tablename__ = "goal_blocks"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    goal_id = db.Column(
        db.Integer,
        db.ForeignKey("goals.id"),
        nullable=False
    )

    titulo = db.Column(
        db.String(150),
        nullable=False
    )

    descricao = db.Column(
        db.Text,
        nullable=True
    )

    ordem = db.Column(
        db.Integer,
        default=0
    )

    criado_em = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    itens = db.relationship(
        "GoalBlockItem",
        backref="block",
        lazy="selectin",
        cascade="all, delete-orphan"
    )

    progressos = db.relationship(
        "GoalProgress",
        backref="block",
        lazy="selectin",
        cascade="all, delete-orphan"
    )


    