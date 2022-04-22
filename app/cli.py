import glob
import json
import os

import uuid
from pathlib import Path

from git import Repo
from jinja2 import Environment

from app.db import Database
from app.s3_uploader import Uploader
from common.product import Product
from common.user import User


class ProductEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Product):
            product_dict = obj.__dict__
            if isinstance(obj.uid, bytes):
                product_dict['uid'] = str(uuid.UUID(bytes_le=obj.uid))

            return product_dict
        return json.JSONEncoder.default(self, obj)


class Cli:
    def __init__(self, db: Database, env: Environment):
        self.deploy_repo = Repo('site-deploy/')
        self._env = env
        self.db = db

    def deploy(self):
        """
        Deploy site to Yandex Cloud Object Storage
        """
        products = self.db.get_products()
        for product in products:
            if len(product.uid) == 16:
                product.uid = str(uuid.UUID(bytes_le=product.uid))

        categories = self.db.get_categories()
        info = json.load(open('info.json'))

        for path in Path('templates').rglob('*.*'):
            path = path.relative_to('templates')
            # Check that file doesn't have sub-extensions. It's need to prevent uploading of base template files
            base = os.path.basename(path)
            exts = os.path.splitext(base)
            if os.path.splitext(exts[0])[1] == '':
                page = self._env.get_template(str(path)).render(products=products,
                                                                categories=categories,
                                                                info=info,
                                                                theme=info['theme'])
                with open(f'site-deploy/{path}', 'w') as f:
                    f.write(page)

                print(f'Deployed: {path}')
                # self.deployer.add_page(base, page)

        # self.deploy_repo.git.add(update=True)
        # self.deploy_repo.index.commit("Deploy from CLI")
        # self.deploy_repo.remote("origin").push()

    def add_product(self, title: str, description: str, price: float, image_uri: str, category: str):
        """
        Add product to the database

        :param category: Category of the product
        :param image_uri: URL of the image
        :param title: Product title
        :param description: Product description
        :param price: Product price
        """
        self.db.create_product(
            Product(title=title,
                    description=description,
                    price=price,
                    uid=uuid.uuid4().bytes,
                    image_uri=image_uri,
                    category=category))

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
        print("\nDeploying...")
        Uploader.deploy_lambdas()

    def create_tables(self):
        self.db.create_tables()
