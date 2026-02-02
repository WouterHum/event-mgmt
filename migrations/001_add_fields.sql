ALTER TABLE rooms
ADD COLUMN ip_address VARCHAR(45);

ALTER TABLE uploads ADD COLUMN room_id INTEGER;
ALTER TABLE uploads ADD COLUMN session_date DATE;
ALTER TABLE uploads ADD COLUMN session_time TIME;
ALTER TABLE uploads ADD COLUMN uploaded BOOLEAN DEFAULT FALSE;

ALTER TABLE rooms 
ADD COLUMN username VARCHAR(255) NULL COMMENT 'Network share username',
ADD COLUMN password VARCHAR(255) NULL COMMENT 'Encrypted password for network access',
ADD COLUMN share_path VARCHAR(512) NULL COMMENT 'Network share path, e.g., SharedFolder/Attachments',
ADD COLUMN attachment_folder VARCHAR(512) NULL COMMENT 'Specific folder to scan for attachments';