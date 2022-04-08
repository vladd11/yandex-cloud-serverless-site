import boto3, ydb


class Cloud:
    def __init__(self, endpoint, database):
        driver_config = ydb.DriverConfig(
            endpoint, database, credentials=ydb.construct_credentials_from_environ(),
            root_certificates=ydb.load_ydb_root_certificate(),
        )
        with ydb.Driver(driver_config) as driver:
            try:
                driver.wait(timeout=5)
            except TimeoutError:
                print("Connect failed to YDB")
                print("Last reported errors by discovery:")
                print(driver.discovery_debug_details())
                exit(1)

    def get_products(self):
        pass
