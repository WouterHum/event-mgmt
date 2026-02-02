# services/file_matcher.py
"""
Smart file matching between scanned files and upload records
"""

from typing import List, Tuple, Optional
from difflib import SequenceMatcher
from pathlib import Path


class FileMatcher:
    """Match scanned files to upload records"""
    
    @staticmethod
    def normalize_filename(filename: str) -> str:
        """Normalize filename for comparison"""
        name = Path(filename).stem.lower()
        name = name.replace('_', ' ').replace('-', ' ').replace('.', ' ')
        name = ' '.join(name.split())  # Remove multiple spaces
        return name
    
    @staticmethod
    def calculate_similarity(name1: str, name2: str) -> float:
        """Calculate similarity between two filenames (0-1)"""
        norm1 = FileMatcher.normalize_filename(name1)
        norm2 = FileMatcher.normalize_filename(name2)
        return SequenceMatcher(None, norm1, norm2).ratio()
    
    @staticmethod
    def match_file_to_upload(scanned_file: dict, uploads: List, threshold: float = 0.6) -> Optional[int]:
        """
        Match a scanned file to an upload record
        
        Args:
            scanned_file: Dict with 'filename' and 'file_size'
            uploads: List of upload objects
            threshold: Minimum similarity score (0-1)
            
        Returns:
            upload_id if match found, None otherwise
        """
        best_match = None
        best_score = 0.0
        
        scanned_filename = scanned_file['filename']
        
        for upload in uploads:
            # Calculate filename similarity
            similarity = FileMatcher.calculate_similarity(scanned_filename, upload.filename)
            
            # Bonus for exact file size match
            size_bonus = 0.0
            if upload.size_bytes and scanned_file.get('file_size'):
                if upload.size_bytes == scanned_file['file_size']:
                    size_bonus = 0.2
            
            total_score = similarity + size_bonus
            
            if total_score > best_score and similarity >= threshold:
                best_score = total_score
                best_match = upload.id
        
        return best_match