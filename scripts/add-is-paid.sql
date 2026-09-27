-- Adds the membership flag to users.
-- Only needed if the server prints "users.is_paid column is missing" on startup.
-- Run once in MySQL Workbench (or the mysql command line) against your optics_db database.

ALTER TABLE users ADD COLUMN is_paid TINYINT(1) NOT NULL DEFAULT 0;
