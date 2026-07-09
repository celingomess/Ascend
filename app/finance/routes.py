from datetime import date, datetime
from flask import Blueprint, render_template, redirect, url_for, request, jsonify
from flask_login import login_required, current_user
from app import db
from app.models.transaction import FinancialTransaction
from app.utils import registrar_evento, atualizar_nivel

finance_bp = Blueprint("finance", __name__, url_prefix="/financas")


def parse_quick_log(text):
    text = text.strip()
    parts = text.split(" ", 1)
    if len(parts) < 2:
        return None, None, None
    
    val_str, desc = parts[0], parts[1]
    
    # Verificar sinal
    is_income = val_str.startswith("+")
    is_expense = val_str.startswith("-")
    
    if is_income or is_expense:
        val_str = val_str[1:]
        
    try:
        val = float(val_str)
        # Se começou com menos, ou se não tem sinal (padrão é despesa)
        if is_expense or (not is_income and not is_expense):
            val = -val
    except ValueError:
        return None, None, None
        
    # Auto-categoria baseada na descrição
    desc_lower = desc.lower()
    category = "Outros"
    
    if any(k in desc_lower for k in ["almoço", "jantar", "ifood", "mercado", "padaria", "comida", "restaurante", "pizza", "burger", "lanche"]):
        category = "Alimentação"
    elif any(k in desc_lower for k in ["uber", "combustível", "gasolina", "metrô", "ônibus", "passagem", "pedágio", "carro", "moto"]):
        category = "Transporte"
    elif any(k in desc_lower for k in ["cinema", "bar", "show", "ingresso", "viagem", "cerveja", "festa", "balada", "jogo"]):
        category = "Lazer"
    elif any(k in desc_lower for k in ["aluguel", "luz", "água", "energia", "internet", "net", "condomínio", "gás"]):
        category = "Moradia"
    elif any(k in desc_lower for k in ["salário", "freela", "renda", "pix", "recebido", "venda", "dividendos"]):
        category = "Receita"
        val = abs(val)  # Forçar valor positivo se for categorizado como receita
    elif any(k in desc_lower for k in ["investimento", "ações", "tesouro", "fundo", "poupança", "cdb", "cripto"]):
        category = "Investimentos"
    elif any(k in desc_lower for k in ["remédio", "farmácia", "médico", "consulta", "dentista", "saúde"]):
        category = "Saúde"
        
    return val, desc, category


@finance_bp.route("/", methods=["GET"])
@login_required
def index():
    # Obter transações do usuário
    transactions = FinancialTransaction.query.filter_by(user_id=current_user.id).order_by(FinancialTransaction.data.desc(), FinancialTransaction.id.desc()).all()

    # Cálculos
    saldo_total = sum(t.valor for t in transactions)
    
    hoje = date.today()
    entradas_mes = sum(t.valor for t in transactions if t.valor > 0 and t.data.month == hoje.month and t.data.year == hoje.year)
    saidas_mes = sum(t.valor for t in transactions if t.valor < 0 and t.data.month == hoje.month and t.data.year == hoje.year)

    # Distribuição por categorias para o gráfico
    categorias_dict = {}
    for t in transactions:
        if t.valor < 0:  # Apenas despesas no gráfico
            cat = t.categoria
            categorias_dict[cat] = categorias_dict.get(cat, 0) + abs(t.valor)
            
    dados_categorias = {
        "labels": list(categorias_dict.keys()),
        "valores": list(categorias_dict.values())
    }

    return render_template(
        "finance.html",
        transactions=transactions,
        saldo_total=saldo_total,
        entradas_mes=entradas_mes,
        saidas_mes=abs(saidas_mes),
        dados_categorias=dados_categorias,
        usuario=current_user
    )


@finance_bp.route("/adicionar", methods=["POST"])
@login_required
def add_transaction():
    try:
        # Se for logger rápido
        if "quick_log" in request.form:
            quick_text = request.form.get("quick_log", "").strip()
            val, desc, cat = parse_quick_log(quick_text)
            if val is None:
                return jsonify({"success": False, "message": "Formato de log rápido inválido. Use ex: '-32 Almoço' ou '+500 Pix'"}), 400
        else:
            val = float(request.form.get("valor", 0))
            tipo = request.form.get("tipo", "saida")
            if tipo == "saida" and val > 0:
                val = -val
            elif tipo == "entrada" and val < 0:
                val = -val
                
            desc = request.form.get("descricao", "").strip()
            cat = request.form.get("categoria", "Outros")
            
        if not desc:
            return jsonify({"success": False, "message": "A descrição é obrigatória."}), 400

        data_str = request.form.get("data", "")
        if data_str:
            data_t = datetime.strptime(data_str, "%Y-%m-%d").date()
        else:
            data_t = date.today()

        transaction = FinancialTransaction(
            user_id=current_user.id,
            valor=val,
            descricao=desc,
            categoria=cat,
            data=data_t
        )
        db.session.add(transaction)

        # Gamificação: Ganho de 5 XP ao registrar disciplina financeira
        xp_ganho = 5
        current_user.xp_total = (current_user.xp_total or 0) + xp_ganho
        
        nivel_subiu = False
        nivel_anterior = current_user.nivel
        
        tipo_str = "entrada" if val > 0 else "saída"
        registrar_evento(
            current_user,
            "Finanças Atualizadas",
            f"Registrou {tipo_str} de R$ {abs(val):.2f} - {desc}",
            "financas",
            xp=xp_ganho
        )

        atualizar_nivel(current_user)
        if current_user.nivel > nivel_anterior:
            nivel_subiu = True

        db.session.commit()

        # Recalcular resumo
        transactions_user = FinancialTransaction.query.filter_by(user_id=current_user.id).all()
        saldo_total = sum(t.valor for t in transactions_user)
        hoje = date.today()
        entradas_mes = sum(t.valor for t in transactions_user if t.valor > 0 and t.data.month == hoje.month and t.data.year == hoje.year)
        saidas_mes = sum(t.valor for t in transactions_user if t.valor < 0 and t.data.month == hoje.month and t.data.year == hoje.year)

        return jsonify({
            "success": True,
            "valor": val,
            "descricao": desc,
            "categoria": cat,
            "data": data_t.strftime("%d/%m/%Y"),
            "saldo_total": saldo_total,
            "entradas_mes": entradas_mes,
            "saidas_mes": abs(saidas_mes),
            "xp_ganho": xp_ganho,
            "usuario_xp": current_user.xp_total,
            "usuario_nivel": current_user.nivel,
            "nivel_subiu": nivel_subiu
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": str(e)}), 400


@finance_bp.route("/deletar/<int:transaction_id>", methods=["POST"])
@login_required
def delete_transaction(transaction_id):
    transaction = FinancialTransaction.query.filter_by(id=transaction_id, user_id=current_user.id).first()
    if not transaction:
        return redirect(url_for("finance.index"))

    try:
        db.session.delete(transaction)
        db.session.commit()
    except Exception as e:
        db.session.rollback()

    return redirect(url_for("finance.index"))
