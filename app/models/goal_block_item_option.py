from app import db
from datetime import datetime


class GoalBlockItemOption(db.Model):
    __tablename__ = "goal_block_item_options"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    item_id = db.Column(
        db.Integer,
        db.ForeignKey("goal_block_items.id"),
        nullable=False
    )

    texto = db.Column(
        db.String(200),
        nullable=False
    )

    selecionado = db.Column(
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
        return f"<GoalBlockItemOption {self.texto}>"