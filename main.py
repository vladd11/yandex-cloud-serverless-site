import os

from jinja2 import Environment, PackageLoader, select_autoescape

from db import Database

env = Environment(
    loader=PackageLoader('app'),
    autoescape=select_autoescape()
)

template = env.get_template("index.html")

if __name__ == '__main__':
    cloud = Database(os.environ.get("ENDPOINT"), os.environ.get("DATABASE"))
    print(template.render(products=cloud.get_products()))
    cloud.disconnect()
