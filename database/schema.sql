-- =============================================
-- database/schema.sql
-- QUIZZERD Database Schema (Updated)
-- =============================================

CREATE DATABASE IF NOT EXISTS quizzerd;
USE quizzerd;

-- ১. Users table: (total_point এবং total_attempt_quizz যোগ করা হয়েছে লিডারবোর্ডের জন্য)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    total_attempt_quizz INT DEFAULT 0, -- ইউজারের মোট খেলা কুইজ সংখ্যা
    total_point INT DEFAULT 0,         -- ইউজারের মোট অর্জিত পয়েন্ট
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ২. Quizzes table: (attempt_count যোগ করা হয়েছে ট্রেন্ডিং কুইজ খোঁজার জন্য)
CREATE TABLE IF NOT EXISTS quizzes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    subject VARCHAR(100) NOT NULL,
    prompt TEXT, 
    difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
    attempt_count INT DEFAULT 0,       -- কতবার এই কুইজটি খেলা হয়েছে
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ৩. Questions table: (correct_answer TEXT করা হয়েছে বড় উত্তরের জন্য)
CREATE TABLE IF NOT EXISTS questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quiz_id INT NOT NULL,
    question_text TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

-- ৪. Options table:
CREATE TABLE IF NOT EXISTS options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question_id INT NOT NULL,
    option_text TEXT NOT NULL,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- ৫. Attempts table:
CREATE TABLE IF NOT EXISTS attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    quiz_id INT NOT NULL,
    score INT DEFAULT 0,
    total_questions INT DEFAULT 0,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

-- ৬. Attempt Answers table:
CREATE TABLE IF NOT EXISTS attempt_answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    attempt_id INT NOT NULL,
    question_id INT NOT NULL,
    selected_option TEXT,
    is_correct BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- ৭. Bookmarks table: (আপনার bookmarks.js রাউটের জন্য এটি প্রয়োজন)
CREATE TABLE IF NOT EXISTS bookmarks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    question_text TEXT NOT NULL,
    options JSON NOT NULL, -- অপশনগুলো JSON ফরম্যাটে সেভ হবে
    correct_answer TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);