from datetime import date, datetime
from flask import Blueprint, render_template, redirect, url_for, request, jsonify
from flask_login import login_required, current_user
from app import db
from app.models.nutrition import DailyNutrition
from app.models.workout import Workout, WorkoutExercise, WorkoutLog
from app.utils import registrar_evento, atualizar_nivel

health_bp = Blueprint("health", __name__, url_prefix="/saude")


@health_bp.route("/", methods=["GET"])
@login_required
def index():
    hoje = date.today()
    
    # Obter ou criar registro de nutrição para hoje
    nutrition = DailyNutrition.query.filter_by(user_id=current_user.id, data=hoje).first()
    if not nutrition:
        nutrition = DailyNutrition(
            user_id=current_user.id,
            data=hoje,
            calorias_consumidas=0,
            calorias_meta=2000,
            proteina=0,
            carboidrato=0,
            gordura=0,
            agua_ml=0
        )
        db.session.add(nutrition)
        db.session.commit()

    # Obter treinos do usuário
    workouts = Workout.query.filter_by(user_id=current_user.id).order_by(Workout.criado_em.asc()).all()

    # Obter histórico de treinos recentes (últimos 10)
    workout_logs = WorkoutLog.query.filter_by(user_id=current_user.id).order_by(WorkoutLog.data_conclusao.desc()).limit(10).all()

    return render_template(
        "health.html",
        nutrition=nutrition,
        workouts=workouts,
        workout_logs=workout_logs,
        usuario=current_user
    )


@health_bp.route("/nutricao/adicionar", methods=["POST"])
@login_required
def add_nutrition():
    hoje = date.today()
    nutrition = DailyNutrition.query.filter_by(user_id=current_user.id, data=hoje).first()
    if not nutrition:
        return jsonify({"success": False, "message": "Registro de hoje não encontrado."}), 404

    try:
        # Obter dados do formulário AJAX
        calorias = int(request.form.get("calorias", 0))
        proteina = int(request.form.get("proteina", 0))
        carboidrato = int(request.form.get("carboidrato", 0))
        gordura = int(request.form.get("gordura", 0))
        agua = int(request.form.get("agua", 0))

        # Atualizar
        meta_anterior = nutrition.calorias_consumidas >= nutrition.calorias_meta

        nutrition.calorias_consumidas += calorias
        nutrition.proteina += proteina
        nutrition.carboidrato += carboidrato
        nutrition.gordura += gordura
        nutrition.agua_ml += agua

        meta_atingida = nutrition.calorias_consumidas >= nutrition.calorias_meta

        xp_ganho = 0
        nivel_subiu = False
        nivel_anterior = current_user.nivel

        # Ganho de XP por beber água
        if agua > 0:
            xp_ganho += 5
            current_user.xp_total = (current_user.xp_total or 0) + 5
            registrar_evento(current_user, "Hidratação registrada", f"Bebeu {agua}ml de água", "saude", xp=5)

        # Ganho de XP por atingir a meta de calorias (apenas uma vez por dia)
        if meta_atingida and not meta_anterior:
            xp_ganho += 15
            current_user.xp_total = (current_user.xp_total or 0) + 15
            registrar_evento(current_user, "Meta Calórica Atingida", "Bateu a meta de ingestão de calorias diária", "saude", xp=15)

        atualizar_nivel(current_user)
        if current_user.nivel > nivel_anterior:
            nivel_subiu = True

        db.session.commit()

        return jsonify({
            "success": True,
            "calorias_consumidas": nutrition.calorias_consumidas,
            "calorias_meta": nutrition.calorias_meta,
            "proteina": nutrition.proteina,
            "carboidrato": nutrition.carboidrato,
            "gordura": nutrition.gordura,
            "agua_ml": nutrition.agua_ml,
            "xp_ganho": xp_ganho,
            "usuario_xp": current_user.xp_total,
            "usuario_nivel": current_user.nivel,
            "nivel_subiu": nivel_subiu,
            "meta_atingida": meta_atingida
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 400


@health_bp.route("/nutricao/meta", methods=["POST"])
@login_required
def update_nutrition_meta():
    hoje = date.today()
    nutrition = DailyNutrition.query.filter_by(user_id=current_user.id, data=hoje).first()
    if not nutrition:
        return jsonify({"success": False, "message": "Registro não encontrado."}), 404

    try:
        nova_meta = int(request.form.get("calorias_meta", 2000))
        nutrition.calorias_meta = max(500, nova_meta)
        db.session.commit()
        return jsonify({
            "success": True,
            "calorias_meta": nutrition.calorias_meta,
            "calorias_consumidas": nutrition.calorias_consumidas
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 400


@health_bp.route("/treino/criar", methods=["POST"])
@login_required
def create_workout():
    nome = request.form.get("nome", "").strip()
    if not nome:
        return redirect(url_for("health.index"))

    try:
        workout = Workout(user_id=current_user.id, nome=nome)
        db.session.add(workout)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        
    return redirect(url_for("health.index"))


@health_bp.route("/treino/deletar/<int:workout_id>", methods=["POST"])
@login_required
def delete_workout(workout_id):
    workout = Workout.query.filter_by(id=workout_id, user_id=current_user.id).first()
    if workout:
        try:
            db.session.delete(workout)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
    return redirect(url_for("health.index"))


@health_bp.route("/treino/<int:workout_id>/exercicio/criar", methods=["POST"])
@login_required
def add_exercise(workout_id):
    workout = Workout.query.filter_by(id=workout_id, user_id=current_user.id).first()
    if not workout:
        return redirect(url_for("health.index"))

    nome = request.form.get("nome_exercicio", "").strip()
    series = int(request.form.get("series", 4))
    repeticoes = request.form.get("repeticoes", "8-12").strip()
    carga = float(request.form.get("carga", 0))

    if nome:
        try:
            # Pegar última ordem
            last_ex = WorkoutExercise.query.filter_by(workout_id=workout_id).order_by(WorkoutExercise.ordem.desc()).first()
            nova_ordem = (last_ex.ordem + 1) if last_ex else 0

            exercise = WorkoutExercise(
                workout_id=workout_id,
                nome_exercicio=nome,
                series=series,
                repeticoes=repeticoes,
                carga_atual=carga,
                ordem=nova_ordem
            )
            db.session.add(exercise)
            db.session.commit()
        except Exception as e:
            db.session.rollback()

    return redirect(url_for("health.index"))


@health_bp.route("/exercicio/deletar/<int:exercise_id>", methods=["POST"])
@login_required
def delete_exercise(exercise_id):
    exercise = WorkoutExercise.query.join(Workout).filter(
        WorkoutExercise.id == exercise_id,
        Workout.user_id == current_user.id
    ).first()
    if exercise:
        try:
            db.session.delete(exercise)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
    return redirect(url_for("health.index"))


@health_bp.route("/exercicio/<int:exercise_id>/carga", methods=["POST"])
@login_required
def update_load(exercise_id):
    exercise = WorkoutExercise.query.join(Workout).filter(
        WorkoutExercise.id == exercise_id,
        Workout.user_id == current_user.id
    ).first()
    if not exercise:
        return jsonify({"success": False, "message": "Exercício não encontrado."}), 404

    try:
        nova_carga = float(request.form.get("carga", 0.0))
        exercise.carga_atual = max(0.0, nova_carga)
        db.session.commit()
        return jsonify({
            "success": True,
            "carga_atual": exercise.carga_atual
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 400


@health_bp.route("/treino/<int:workout_id>/concluir", methods=["POST"])
@login_required
def complete_workout(workout_id):
    workout = Workout.query.filter_by(id=workout_id, user_id=current_user.id).first()
    if not workout:
        return jsonify({"success": False, "message": "Treino não encontrado."}), 404

    try:
        log = WorkoutLog(
            user_id=current_user.id,
            workout_id=workout_id,
            data_conclusao=date.today()
        )
        db.session.add(log)

        # Gamificação: Ganho de 20 XP ao concluir um treino
        xp_ganho = 20
        current_user.xp_total = (current_user.xp_total or 0) + xp_ganho
        
        nivel_subiu = False
        nivel_anterior = current_user.nivel
        
        registrar_evento(
            current_user,
            "Treino Concluído",
            f"Concluiu a rotina de treinos: {workout.nome}",
            "saude",
            xp=xp_ganho
        )

        atualizar_nivel(current_user)
        if current_user.nivel > nivel_anterior:
            nivel_subiu = True

        db.session.commit()

        return jsonify({
            "success": True,
            "xp_ganho": xp_ganho,
            "usuario_xp": current_user.xp_total,
            "usuario_nivel": current_user.nivel,
            "nivel_subiu": nivel_subiu,
            "mensagem": f"Parabéns! Você concluiu '{workout.nome}'."
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 400
