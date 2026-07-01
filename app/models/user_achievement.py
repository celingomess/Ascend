from datetime import datetime
from app import db


class UserAchievement(db.Model):
    __tablename__ = "user_achievements"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    achievement_id = db.Column(
        db.Integer,
        db.ForeignKey("achievements.id"),
        nullable=False
    )

    data_desbloqueio = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )