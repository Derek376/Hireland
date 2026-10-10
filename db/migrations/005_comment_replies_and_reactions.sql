CREATE TABLE comment_replies (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  author_label TEXT NOT NULL,
  body TEXT NOT NULL CHECK(length(trim(body)) BETWEEN 1 AND 1000),
  created_at INTEGER NOT NULL
) STRICT;
CREATE INDEX comment_replies_order ON comment_replies(comment_id, created_at);

CREATE TABLE comment_reactions (
  user_id TEXT NOT NULL REFERENCES users(id),
  comment_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
  reply_id TEXT REFERENCES comment_replies(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL CHECK(reaction IN ('LIKE','DISLIKE')),
  updated_at INTEGER NOT NULL,
  CHECK((comment_id IS NOT NULL AND reply_id IS NULL) OR (comment_id IS NULL AND reply_id IS NOT NULL)),
  UNIQUE(user_id, comment_id),
  UNIQUE(user_id, reply_id)
) STRICT;
CREATE INDEX comment_reactions_post ON comment_reactions(comment_id);
CREATE INDEX comment_reactions_reply ON comment_reactions(reply_id);
