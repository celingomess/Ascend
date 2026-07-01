from app import db
from datetime import datetime


class GoalBlockItemSubItem(db.Model):
    __tablename__ = "goal_block_item_subitems"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    item_id = db.Column(
        db.Integer,
        db.ForeignKey("goal_block_items.id"),
        nullable=False
    )

    titulo = db.Column(
        db.String(200),
        nullable=False
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
        return f"<GoalBlockItemSubItem {self.titulo}>"