from datetime import date
from app import db


class DailyNutrition(db.Model):
    __tablename__ = "daily_nutrition"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    data = db.Column(
        db.Date,
        nullable=False,
        default=date.today
    )

    calorias_consumidas = db.Column(
        db.Integer,
        default=0
    )

    calorias_meta = db.Column(
        db.Integer,
        default=2000
    )

    proteina = db.Column(
        db.Integer,
        default=0
    )

    carboidrato = db.Column(
        db.Integer,
        default=0
    )

    gordura = db.Column(
        db.Integer,
        default=0
    )

    agua_ml = db.Column(
        db.Integer,
        default=0
    )

    # Relacionamento reverso automático via backref no User (opcional)
    user = db.relationship("User", backref=db.backref("nutrition_logs", lazy=True, cascade="all, delete-orphan"))

    def __repr__(self):
        return f"<DailyNutrition {self.data} - {self.calorias_consumidas}/{self.calorias_meta} kcal>"
