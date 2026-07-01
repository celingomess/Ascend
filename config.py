import os
from urllib.parse import quote_plus
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "chave_secreta_padrao_para_desenvolvimento")

    database_url = os.getenv("DATABASE_URL")
    if database_url:
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)
        SQLALCHEMY_DATABASE_URI = database_url
    else:
        DB_USER = os.getenv("DB_USER", "root")
        DB_PASSWORD = os.getenv("DB_PASSWORD", "")
        if DB_PASSWORD:
            DB_PASSWORD = quote_plus(DB_PASSWORD)
        DB_HOST = os.getenv("DB_HOST", "localhost")
        DB_NAME = os.getenv("DB_NAME", "ascend")

        SQLALCHEMY_DATABASE_URI = (
            f"mysql+pymysql://{DB_USER}:"
            f"{DB_PASSWORD}@"
            f"{DB_HOST}/"
            f"{DB_NAME}"
        )

    SQLALCHEMY_TRACK_MODIFICATIONS = False