class Storage:
    def __init__(self):
        # could be a connection to S3, local disk, etc.
        self.files = {}

    def save(self, filename: str, data: bytes) -> dict:
        """
        Saves the file and returns metadata.
        """
        # For example, just store in memory
        key = filename  # normally you might generate a unique key
        self.files[key] = data
        return {"key": key, "etag": "dummy-etag"}  # etag could be a hash of data

# Dependency function
def get_storage() -> Storage:
    return Storage()