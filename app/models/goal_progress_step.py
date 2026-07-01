from app import db
from datetime import datetime


class GoalProgressStep(db.Model):
    __tablename__ = "goal_progress_steps"

    id = db.Column(db.Integer, primary_key=True)

    progress_id = db.Column(
        db.Integer,
        db.ForeignKey("goal_progress.id"),
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

    concluido = db.Column(
        db.Boolean,
        default=False
    )

    ordem = db.Column(
        db.Integer,
        default=0
    )

    criado_em = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    def __repr__(self):
        return f"<GoalProgressStep {self.titulo}>"