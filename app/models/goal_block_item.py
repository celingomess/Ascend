from app import db
from datetime import datetime


class GoalBlockItem(db.Model):
    __tablename__ = "goal_block_items"

    id = db.Column(db.Integer, primary_key=True)

    block_id = db.Column(
        db.Integer,
        db.ForeignKey("goal_blocks.id"),
        nullable=False
    )

    parent_id = db.Column(
        db.Integer,
        db.ForeignKey("goal_block_items.id"),
        nullable=True
    )

    tipo = db.Column(
        db.String(30),
        nullable=False,
        default="texto"
    )

    subtipo = db.Column(
        db.String(30),
        nullable=True
    )

    titulo = db.Column(
        db.String(200),
        nullable=False
    )

    conteudo = db.Column(
        db.Text,
        nullable=True
    )

    concluido = db.Column(
        db.Boolean,
        default=False
    )

    data_item = db.Column(
        db.Date,
        nullable=True
    )

    valor = db.Column(
        db.String(100),
        nullable=True
    )

    frequencia = db.Column(
        db.String(20),
        nullable=True
    )

    meta_valor = db.Column(
        db.Integer,
        nullable=True
    )

    valor_atual = db.Column(
        db.Integer,
        default=0
    )

    arquivo = db.Column(
        db.String(255),
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

    ultima_atividade = db.Column(
        db.DateTime,
        nullable=True
    )

    ultima_reinicializacao = db.Column(
        db.DateTime,
        nullable=True
    )

    streak_atual = db.Column(
        db.Integer,
        default=0
    )

    melhor_streak = db.Column(
        db.Integer,
        default=0
    )

    ultima_data_streak = db.Column(
        db.Date,
        nullable=True
    )

    opcoes = db.relationship(
        "GoalBlockItemOption",
        backref="item",
        lazy="selectin",
        cascade="all, delete-orphan"
    )

    filhos = db.relationship(
        "GoalBlockItem",
        backref=db.backref(
            "pai",
            remote_side=[id]
        ),
        lazy="selectin",
        cascade="all, delete-orphan"
    )

    def percentual(self):
        if self.meta_valor:
            valor = self.valor_atual or 0

            if self.meta_valor <= 0:
                return 0

            percentual = round((valor / self.meta_valor) * 100)

            if percentual > 100:
                return 100

            return percentual

        if self.tipo == "checklist" and self.opcoes:
            total_opcoes = len(self.opcoes)
            selecionadas = len([
                opcao for opcao in self.opcoes
                if opcao.selecionado
            ])
            return round((selecionadas / total_opcoes) * 100) if total_opcoes > 0 else 0

        if not self.filhos:
            return 100 if self.concluido else 0

        total = len(self.filhos)

        soma_progresso = sum(filho.percentual() for filho in self.filhos)

        return round(soma_progresso / total)

    def total_filhos(self):
        return len(self.filhos)

    def filhos_concluidos(self):
        return len([
            filho for filho in self.filhos
            if filho.concluido
        ])

    def temperatura(self):
        if not self.ultima_atividade:
            return "fria"

        dias_sem_atividade = (
            datetime.utcnow() - self.ultima_atividade
        ).days

        if dias_sem_atividade <= 1:
            return "quente"

        if dias_sem_atividade <= 6:
            return "morna"

        return "fria"

    def __repr__(self):
        return f"<GoalBlockItem {self.titulo}>"
