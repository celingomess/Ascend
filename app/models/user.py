from datetime import datetime
from flask_login import UserMixin
from app import db


class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    nome = db.Column(
        db.String(100),
        nullable=False
    )

    email = db.Column(
        db.String(150),
        unique=True,
        nullable=False
    )

    senha_hash = db.Column(
        db.String(255),
        nullable=False
    )

    avatar = db.Column(
        db.String(255),
        nullable=True
    )

    nivel = db.Column(
        db.Integer,
        default=1
    )

    xp_total = db.Column(
        db.Integer,
        default=0
    )

    # ==================================
    # STREAK GLOBAL
    # ==================================

    streak_atual = db.Column(
        db.Integer,
        default=0
    )

    melhor_streak = db.Column(
        db.Integer,
        default=0
    )

    ultima_atividade = db.Column(
        db.Date,
        nullable=True
    )

    # ==================================
    # SISTEMA
    # ==================================

    data_cadastro = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    eventos = db.relationship(
        "UserEvent",
        backref="usuario",
        lazy=True,
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<User {self.nome}>"