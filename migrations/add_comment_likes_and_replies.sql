-- Add parent_id column to comments table for replies
ALTER TABLE comments 
ADD COLUMN parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE;

-- Create comment_likes table for storing likes/dislikes
CREATE TABLE IF NOT EXISTS comment_likes (
    id SERIAL PRIMARY KEY,
    comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_email VARCHAR(255) NOT NULL,
    like_type VARCHAR(10) NOT NULL CHECK (like_type IN ('like', 'dislike')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(comment_id, user_email)
);

-- Create indexes for better performance
CREATE INDEX idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX idx_comment_likes_user_email ON comment_likes(user_email);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);

-- Update timestamp trigger for comment_likes
CREATE OR REPLACE FUNCTION update_comment_likes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_comment_likes_updated_at
    BEFORE UPDATE ON comment_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_comment_likes_updated_at();
