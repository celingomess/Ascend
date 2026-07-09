import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager, current_user

db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()


def create_app():
    app = Flask(__name__)
    app.config.from_object("config.Config")

    app.config["UPLOAD_FOLDER"] = os.path.join(app.root_path, "static", "uploads")
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    login_manager.login_view = "auth.login"

    # Registrar os Blueprints
    from app.auth.routes import auth_bp
    from app.dashboard.routes import dashboard_bp
    from app.goals.routes import goals_bp
    from app.profile.routes import profile_bp
    from app.health.routes import health_bp
    from app.finance.routes import finance_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(goals_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(health_bp)
    app.register_blueprint(finance_bp)

    # Carregar Modelos para que o Flask-Migrate os detecte
    from app.models.nutrition import DailyNutrition
    from app.models.workout import Workout, WorkoutExercise, WorkoutLog
    from app.models.transaction import FinancialTransaction

    @login_manager.user_loader
    def load_user(user_id):
        from app.models.user import User
        return User.query.get(int(user_id))

    @app.context_processor
    def inject_sidebar_data():
        if current_user.is_authenticated:
            from app.models.goal import Goal
            from app.utils import calcular_titulo_ascend, calcular_avatar_frame

            metas_usuario = Goal.query.filter_by(user_id=current_user.id).all()
            progresso_sidebar = 0

            if metas_usuario:
                progresso_sidebar = round(
                    sum(meta.progresso for meta in metas_usuario) / len(metas_usuario),
                    1
                )

            return {
                "sidebar_progresso": progresso_sidebar,
                "rank_atual": calcular_titulo_ascend(current_user),
                "avatar_frame": calcular_avatar_frame(current_user),
                "streak_global": current_user.streak_atual or 0,
                "recorde_global": current_user.melhor_streak or 0
            }

        return {
            "sidebar_progresso": 0,
            "rank_atual": "Despertar I",
            "avatar_frame": "frame-despertar",
            "streak_global": 0,
            "recorde_global": 0
        }

    return app
