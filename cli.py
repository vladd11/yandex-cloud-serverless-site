import glob
import os
import uuid

from db import Database
from deploy import Deployer
from product import Product
from jinja2 import Environment


class Cli:
    def __init__(self, db: Database, deployer: Deployer, env: Environment):
        self._env = env
        self.deployer = deployer
        self.db = db

    def deploy(self):
        """
        Deploy site to Yandex Cloud Object Storage
        """
        for path in glob.glob('app\\templates\\*'):
            # Check that file doesn't have sub-extensions. It's need to prevent uploading of base template files
            base = os.path.basename(path)
            if os.path.splitext(os.path.splitext(base)[0])[1] == '':
                self.deployer.add_page(base, self._env.get_template(base).render(products=self.db.get_products()))
                print(f'Deployed: {base}')

    def add_product(self, title: str, description: str, price: float):
        """
        Add product to the database

        :param title: Product title
        :param description: Product description
        :param price: Product price
        """
        self.db.create_product(Product(title=title, description=description, price=price, uid=uuid.uuid4().bytes))

    def remove_product(self, uid: str):
        """
        Add product to the database
        :param uid UUID of the product
        """
        self.db.remove_product(uuid.UUID(uid).bytes)

    def update_product(self, uid: str, title: str, description: str, price: float):
        """
        Update product in database
        :param uid: UID of the product
        :param title: Product's title
        :param description: Product's description
        :param price: Product's price
        """
        self.db.update_product(Product(uid=uuid.UUID(uid).bytes, title=title, description=description, price=price))
