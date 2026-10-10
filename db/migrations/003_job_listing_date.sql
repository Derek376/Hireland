-- User-assigned listing dates are separate from an employer's publication date.
ALTER TABLE jobs ADD COLUMN listed_at INTEGER;
