import os

from fire import Fire
from jinja2 import Environment, FileSystemLoader

from app.cli import Cli
from app.db import Database
from app.s3_uploader import Uploader

env = Environment(
    loader=FileSystemLoader('templates/'),
)

db = Database(os.environ.get("ENDPOINT"), os.environ.get("DATABASE"))
deployer = Uploader()


if __name__ == '__main__':
    Fire(Cli(db, env), name="Yandex Cloud serverless site")

db.disconnect()
