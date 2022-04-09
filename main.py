import glob
import os

from jinja2 import Environment, PackageLoader, select_autoescape

from db import Database
from deploy import Deployer

env = Environment(
    loader=PackageLoader('app'),
    autoescape=select_autoescape()
)

template = env.get_template("index.html")

if __name__ == '__main__':
    db = Database(os.environ.get("ENDPOINT"), os.environ.get("DATABASE"))

    deployer = Deployer()
    for path in glob.glob('app\\templates\\*'):
        deployer.add_page(os.path.basename(path), template.render(products=db.get_products()))
        print(f'Deployed: {os.path.basename(path)}')
    db.disconnect()
