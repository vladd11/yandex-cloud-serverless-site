import glob
import os

from fire import Fire
from jinja2 import Environment, PackageLoader, select_autoescape

from db import Database
from deploy import Deployer

env = Environment(
    loader=PackageLoader('app'),
    autoescape=select_autoescape()
)

template = env.get_template("index.html")
db = Database(os.environ.get("ENDPOINT"), os.environ.get("DATABASE"))
deployer = Deployer()


def deploy():
    """
    Deploy site to Yandex Cloud Object Storage
    """
    for path in glob.glob('app\\templates\\*'):
        # Check that file doesn't have sub-extensions. It's need to prevent uploading of base template files
        base = os.path.basename(path)
        if os.path.splitext(os.path.splitext(base)[0])[1] == '':
            deployer.add_page(base, template.render(products=db.get_products()))
            print(f'Deployed: {base}')


if __name__ == '__main__':
    Fire({"deploy": deploy}, name="Yandex Cloud serverless site")

db.disconnect()
