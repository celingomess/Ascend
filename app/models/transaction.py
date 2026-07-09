from datetime import date
from app import db


class FinancialTransaction(db.Model):
    __tablename__ = "financial_transactions"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    valor = db.Column(
        db.Float,
        nullable=False
    )

    descricao = db.Column(
        db.String(255),
        nullable=False
    )

    categoria = db.Column(
        db.String(100),
        nullable=False,
        default="Outros"
    )

    data = db.Column(
        db.Date,
        nullable=False,
        default=date.today
    )

    user = db.relationship("User", backref=db.backref("transactions", lazy=True, cascade="all, delete-orphan"))

    def __repr__(self):
        return f"<FinancialTransaction {self.descricao} - {self.valor} R$>"
