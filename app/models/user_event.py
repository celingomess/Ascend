from app import db
from datetime import datetime


class UserEvent(db.Model):
    __tablename__ = "user_events"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    titulo = db.Column(
        db.String(255),
        nullable=False
    )

    descricao = db.Column(
        db.Text,
        nullable=True
    )

    tipo = db.Column(
        db.String(50),
        nullable=False
    )

    xp = db.Column(
        db.Integer,
        default=0
    )

    criado_em = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    def __repr__(self):
        return f"<UserEvent {self.titulo}>"
