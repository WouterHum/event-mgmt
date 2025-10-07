-- Create database
CREATE DATABASE IF NOT EXISTS event_mgmt CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create application user
CREATE USER IF NOT EXISTS 'eventuser'@'%' IDENTIFIED BY 'StrongPassword123!';

-- Grant privileges
GRANT ALL PRIVILEGES ON event_mgmt.* TO 'eventuser'@'%';
FLUSH PRIVILEGES;

-- Switch to the new DB
USE event_mgmt;

-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin','technician','client','uploader') NOT NULL DEFAULT 'client',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Events table
CREATE TABLE events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    location VARCHAR(255),
    created_by INT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Rooms table
CREATE TABLE rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    capacity INT NOT NULL,
    location VARCHAR(255)
);

-- Speakers table
CREATE TABLE speakers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    bio TEXT,
    email VARCHAR(255) UNIQUE
);

-- Event-Speaker many-to-many
CREATE TABLE event_speakers (
    event_id INT NOT NULL,
    speaker_id INT NOT NULL,
    PRIMARY KEY (event_id, speaker_id),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (speaker_id) REFERENCES speakers(id) ON DELETE CASCADE
);

-- Files table (uploads like presentations)
CREATE TABLE files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT,
    uploader_id INT,
    file_name VARCHAR(255) NOT NULL,
    s3_key VARCHAR(512) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ===================================
-- SEED DATA
-- ===================================

-- Insert admin user
-- password_hash here should be replaced with a real bcrypt hash in production!
INSERT INTO users (email, password_hash, role)
VALUES ('admin@example.com', '$2b$12$DWhp6V44kneCAKlBGiZLkOxsGx7msKqb/w0eIOtR1Bg8EkhkAv/Jy', 'admin');

-- Insert a sample room
INSERT INTO rooms (name, capacity, location)
VALUES ('Main Hall', 200, 'Convention Center - First Floor');

-- Insert a sample event
INSERT INTO events (title, description, start_time, end_time, location, created_by)
VALUES (
  'Tech Conference 2025',
  'A sample tech event to demonstrate the system.',
  '2025-10-01 09:00:00',
  '2025-10-01 17:00:00',
  'Convention Center',
  1
);

-- Insert a speaker
INSERT INTO speakers (name, bio, email)
VALUES ('Jane Doe', 'Expert in AI and Cloud Computing.', 'jane.doe@example.com');

-- Link event to speaker
INSERT INTO event_speakers (event_id, speaker_id)
VALUES (1, 1);

-- Insert a sample file upload
INSERT INTO files (event_id, uploader_id, file_name, s3_key)
VALUES (1, 1, 'opening_presentation.pdf', 'uploads/opening_presentation.pdf');
