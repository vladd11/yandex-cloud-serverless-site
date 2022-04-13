import os

from fire import Fire
from jinja2 import Environment, PackageLoader, select_autoescape

from app.cli import Cli
from app.db import Database
from app.deploy import Deployer

env = Environment(
    loader=PackageLoader(package_name='app'),
    autoescape=select_autoescape()
)

db = Database(os.environ.get("ENDPOINT"), os.environ.get("DATABASE"))
deployer = Deployer()


if __name__ == '__main__':
    Fire(Cli(db, deployer, env), name="Yandex Cloud serverless site")

db.disconnect()
