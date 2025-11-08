import os
import hashlib
from abc import ABC, abstractmethod
from typing import Optional

class StorageBackend(ABC):
    """Abstract base class for storage backends"""
    
    @abstractmethod
    def save(self, filename: str, data: bytes) -> dict:
        pass

class LocalStorage(StorageBackend):
    """Local filesystem storage for development"""
    
    def __init__(self, base_path: str = "./uploads"):
        self.base_path = base_path
        os.makedirs(base_path, exist_ok=True)
        print(f"LocalStorage initialized: {self.base_path}")

    def save(self, filename: str, data: bytes) -> dict:
        import time
        print(f"=== LocalStorage.save() ===")
        print(f"Filename: {filename}, Size: {len(data)} bytes")
        
        timestamp = int(time.time() * 1000)
        key = f"{timestamp}_{filename}"
        etag = hashlib.md5(data).hexdigest()
        
        file_path = os.path.join(self.base_path, key)
        with open(file_path, "wb") as f:
            f.write(data)
        
        print(f"Saved to: {file_path}")
        return {"key": key, "etag": etag}

class S3Storage(StorageBackend):
    """S3 storage for production"""
    
    def __init__(self, bucket_name: str, region: str = "us-east-1"):
        import boto3
        self.bucket_name = bucket_name
        self.s3_client = boto3.client('s3', region_name=region)
        print(f"S3Storage initialized: bucket={bucket_name}, region={region}")

    def save(self, filename: str, data: bytes) -> dict:
        import time
        print(f"=== S3Storage.save() ===")
        print(f"Filename: {filename}, Size: {len(data)} bytes")
        
        timestamp = int(time.time() * 1000)
        key = f"uploads/{timestamp}_{filename}"
        
        # Upload to S3
        response = self.s3_client.put_object(
            Bucket=self.bucket_name,
            Key=key,
            Body=data,
            ContentType=self._get_content_type(filename)
        )
        
        etag = response['ETag'].strip('"')
        print(f"Saved to S3: s3://{self.bucket_name}/{key}")
        return {"key": key, "etag": etag}
    
    def _get_content_type(self, filename: str) -> str:
        import mimetypes
        content_type, _ = mimetypes.guess_type(filename)
        return content_type or 'application/octet-stream'

def get_storage() -> StorageBackend:
    """
    Returns appropriate storage based on environment.
    Set STORAGE_TYPE env variable: 'local' or 's3'
    """
    storage_type = os.getenv("STORAGE_TYPE", "local")
    print(f"=== get_storage() called, type={storage_type} ===")
    
    if storage_type == "s3":
        bucket = os.getenv("S3_BUCKET_NAME")
        region = os.getenv("AWS_REGION", "us-east-1")
        if not bucket:
            raise ValueError("S3_BUCKET_NAME environment variable required for S3 storage")
        return S3Storage(bucket_name=bucket, region=region)
    else:
        base_path = os.getenv("STORAGE_PATH", "./uploads")
        return LocalStorage(base_path=base_path)