import glob
import os
import shutil
import uuid

from app.db import Database
from app.deploy import Deployer
from common.product import Product
from jinja2 import Environment

from common.user import User


class Cli:
    def __init__(self, db: Database, deployer: Deployer, env: Environment):
        self._env = env
        self.deployer = deployer
        self.db = db

    def deploy(self):
        """
        Deploy site to Yandex Cloud Object Storage
        """
        for path in glob.glob('templates/*'):
            # Check that file doesn't have sub-extensions. It's need to prevent uploading of base template files
            base = os.path.basename(path)
            exts = os.path.splitext(base)
            if os.path.splitext(exts[0])[1] == '':
                if exts[1] == '.html':
                    page = self._env.get_template(base).render(products=self.db.get_products())
                    with open(f'tmp/{base}', 'w') as f:
                        f.write(page)
                else:
                    shutil.copy('templates/' + base, 'tmp/' + base)

                # self.deployer.add_page(base, page)
                print(f'Deployed: {base}')

    def add_product(self, title: str, description: str, price: float, image_uri: str):
        """
        Add product to the database

        :param image_uri: URL of the image
        :param title: Product title
        :param description: Product description
        :param price: Product price
        """
        self.db.create_product(
            Product(title=title, description=description, price=price, uid=uuid.uuid4().bytes, image_uri=image_uri))

    def remove_product(self, uid: str):
        """
        Add product to the database
        :param uid UUID of the product
        """
        self.db.remove_product(uuid.UUID(uid).bytes)

    def update_product(self, uid: str, title: str, description: str, price: float, image_uri: str):
        """
        Update product in database
        :param image_uri: URL of the image that will be displayed on index page
        :param uid: UID of the product
        :param title: Product's title
        :param description: Product's description
        :param price: Product's price
        """
        self.db.update_product(
            Product(uid=uuid.UUID(uid).bytes, title=title, description=description, price=price, image_uri=image_uri))

    def create_user(self, phone: int):
        """
            Create user with specified phone number
            :param phone Phone number of user
        """
        self.db.create_user(str(phone))

    def add_order(self, uid: str, products_count: int):
        products = []
        for i in range(products_count):
            product = Product()
            product.uid = input(f"Product ({i}) UID: ")
            products.append(product)

        self.db.create_order(User(uuid.UUID(uid).bytes), products)

    def deploy_lambdas(self):
        self.deployer.zip_lambdas()

    def create_tables(self):
        self.db.create_tables()
