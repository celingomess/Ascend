from app import db
from datetime import datetime


class GoalProgress(db.Model):
    __tablename__ = "goal_progress"

    id = db.Column(db.Integer, primary_key=True)

    block_id = db.Column(
        db.Integer,
        db.ForeignKey("goal_blocks.id"),
        nullable=False
    )

    titulo = db.Column(
        db.String(200),
        nullable=False
    )

    descricao = db.Column(
        db.Text,
        nullable=True
    )

    unidade = db.Column(
        db.String(50),
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

    etapas = db.relationship(
        "GoalProgressStep",
        backref="progresso",
        lazy="selectin",
        cascade="all, delete-orphan"
    )

    def percentual(self):
        if not self.etapas:
            return 0

        total = len(self.etapas)

        concluidas = len([
            etapa for etapa in self.etapas
            if etapa.concluido
        ])

        return round((concluidas / total) * 100, 1)

    def __repr__(self):
        return f"<GoalProgress {self.titulo}>"