-- Only extracted CV text and its display filename are saved; binary files are not retained.
ALTER TABLE profiles ADD COLUMN file_name TEXT;
