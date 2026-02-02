# services/room_scanner.py
"""
Service for pinging rooms and scanning for files
"""

import subprocess
import platform
import os
from pathlib import Path
from typing import List, Optional
from datetime import datetime
import mimetypes


class RoomScanner:
    """Service for pinging rooms and scanning for attachments"""
    
    # Common file extensions to look for
    MEDIA_EXTENSIONS = {
        '.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm', '.m4v',
        '.mp3', '.wav', '.aac', '.m4a', '.flac', '.ogg', '.wma',
        '.ppt', '.pptx', '.pdf', '.doc', '.docx', '.key', '.odp'
    }
    
    VIDEO_EXTENSIONS = {'.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm', '.m4v'}
    AUDIO_EXTENSIONS = {'.mp3', '.wav', '.aac', '.m4a', '.flac', '.ogg', '.wma', '.mp4', '.mkv'}
    
    @staticmethod
    def ping_host(ip_address: str, timeout: int = 2) -> bool:
        """
        Ping a host to check if it's online
        
        Args:
            ip_address: IP address to ping
            timeout: Timeout in seconds
            
        Returns:
            True if host responds, False otherwise
        """
        if not ip_address:
            return False
            
        # Determine ping command based on OS
        param = '-n' if platform.system().lower() == 'windows' else '-c'
        timeout_param = '-w' if platform.system().lower() == 'windows' else '-W'
        timeout_value = str(timeout * 1000 if platform.system().lower() == 'windows' else timeout)
        
        command = ['ping', param, '1', timeout_param, timeout_value, ip_address]
        
        try:
            result = subprocess.run(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=timeout + 2
            )
            return result.returncode == 0
        except (subprocess.TimeoutExpired, Exception):
            return False
    
    @staticmethod
    def scan_folder(folder_path: str, extensions: Optional[set] = None) -> List[dict]:
        """
        Scan a folder for files
        
        Args:
            folder_path: Path to folder (local or UNC path like \\\\IP\\Share)
            extensions: Set of file extensions to include (default: MEDIA_EXTENSIONS)
            
        Returns:
            List of file information dictionaries
        """
        if extensions is None:
            extensions = RoomScanner.MEDIA_EXTENSIONS
        
        attachments = []
        
        if not os.path.exists(folder_path):
            raise FileNotFoundError(f"Folder not found: {folder_path}")
        
        try:
            for root, dirs, files in os.walk(folder_path):
                for file in files:
                    file_path = os.path.join(root, file)
                    file_ext = Path(file).suffix.lower()
                    
                    # Only include files with specified extensions
                    if file_ext in extensions:
                        try:
                            stat_info = os.stat(file_path)
                            mime_type, _ = mimetypes.guess_type(file_path)
                            
                            # Detect media type
                            has_video = file_ext in RoomScanner.VIDEO_EXTENSIONS
                            has_audio = file_ext in RoomScanner.AUDIO_EXTENSIONS
                            
                            attachment = {
                                "filename": file,
                                "file_path": file_path,
                                "file_size": stat_info.st_size,
                                "file_type": mime_type or "application/octet-stream",
                                "file_extension": file_ext,
                                "last_modified": datetime.fromtimestamp(stat_info.st_mtime),
                                "has_video": has_video,
                                "has_audio": has_audio
                            }
                            attachments.append(attachment)
                        except Exception as e:
                            print(f"Error reading file {file_path}: {str(e)}")
                            continue
        
        except PermissionError:
            raise Exception(f"Permission denied accessing folder: {folder_path}")
        
        return attachments