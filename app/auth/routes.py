from flask import Blueprint, render_template, request, redirect, url_for
from flask_login import login_user, logout_user
import bcrypt
from app import db
from app.models.user import User

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/cadastro", methods=["GET", "POST"])
def cadastro():
    if request.method == "POST":
        nome = request.form["nome"]
        email = request.form["email"]
        senha = request.form["senha"]

        if User.query.filter_by(email=email).first():
            return "E-mail já cadastrado."

        senha_hash = bcrypt.hashpw(
            senha.encode("utf-8"),
            bcrypt.gensalt()
        ).decode("utf-8")

        novo_usuario = User(
            nome=nome,
            email=email,
            senha_hash=senha_hash
        )

        db.session.add(novo_usuario)
        db.session.commit()

        return redirect(url_for("auth.login"))

    return render_template("cadastro.html")


@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form["email"]
        senha = request.form["senha"]

        usuario = User.query.filter_by(email=email).first()

        if usuario and bcrypt.checkpw(
            senha.encode("utf-8"),
            usuario.senha_hash.encode("utf-8")
        ):
            login_user(usuario)
            return redirect(url_for("dashboard.dashboard"))

        return "E-mail ou senha inválidos."

    return render_template("login.html")


@auth_bp.route("/logout")
def logout():
    logout_user()
    return redirect(url_for("dashboard.home"))
