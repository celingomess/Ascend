from datetime import datetime, date
from app import db


class Workout(db.Model):
    __tablename__ = "workouts"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    nome = db.Column(
        db.String(150),
        nullable=False
    )

    criado_em = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    # Relacionamentos
    user = db.relationship("User", backref=db.backref("workouts", lazy=True, cascade="all, delete-orphan"))
    
    exercises = db.relationship(
        "WorkoutExercise",
        backref="workout",
        lazy="selectin",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Workout {self.nome}>"


class WorkoutExercise(db.Model):
    __tablename__ = "workout_exercises"

    id = db.Column(db.Integer, primary_key=True)

    workout_id = db.Column(
        db.Integer,
        db.ForeignKey("workouts.id"),
        nullable=False
    )

    nome_exercicio = db.Column(
        db.String(200),
        nullable=False
    )

    series = db.Column(
        db.Integer,
        default=4
    )

    repeticoes = db.Column(
        db.String(50),
        default="8-12"
    )

    carga_atual = db.Column(
        db.Float,
        default=0.0
    )

    ordem = db.Column(
        db.Integer,
        default=0
    )

    def __repr__(self):
        return f"<WorkoutExercise {self.nome_exercicio} - {self.carga_atual}kg>"


class WorkoutLog(db.Model):
    __tablename__ = "workout_logs"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    workout_id = db.Column(
        db.Integer,
        db.ForeignKey("workouts.id"),
        nullable=False
    )

    data_conclusao = db.Column(
        db.Date,
        nullable=False,
        default=date.today
    )

    # Relacionamento de conveniência
    workout = db.relationship("Workout")
    user = db.relationship("User", backref=db.backref("workout_logs", lazy=True, cascade="all, delete-orphan"))

    def __repr__(self):
        return f"<WorkoutLog {self.workout_id} concluído em {self.data_conclusao}>"
