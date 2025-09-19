-- Database initialization script for TikTok Carousel Middleware

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enum types
CREATE TYPE job_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE media_type AS ENUM ('image', 'video');

-- Users/Accounts table for TikTok account management
CREATE TABLE IF NOT EXISTS tiktok_accounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    account_id VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    username VARCHAR(255),
    avatar_url TEXT,
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    refresh_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Jobs table for async processing tracking
CREATE TABLE IF NOT EXISTS jobs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    job_id VARCHAR(255) UNIQUE NOT NULL,
    status job_status DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    total_items INTEGER DEFAULT 0,
    tiktok_account_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Media uploads table for tracking uploaded media
CREATE TABLE IF NOT EXISTS media_uploads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    media_id VARCHAR(255) UNIQUE NOT NULL,
    job_id VARCHAR(255) REFERENCES jobs(job_id) ON DELETE SET NULL,
    tiktok_account_id VARCHAR(255),
    file_path TEXT,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    upload_status VARCHAR(50) DEFAULT 'uploaded',
    tiktok_media_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    uploaded_at TIMESTAMP WITH TIME ZONE
);

-- Posts table for tracking TikTok posts
CREATE TABLE IF NOT EXISTS tiktok_posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id VARCHAR(255) UNIQUE,
    job_id VARCHAR(255) REFERENCES jobs(job_id) ON DELETE SET NULL,
    tiktok_account_id VARCHAR(255) NOT NULL,
    caption TEXT,
    tags TEXT[],
    media_ids TEXT[] NOT NULL,
    tiktok_post_id VARCHAR(255),
    share_url TEXT,
    is_draft BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    posted_at TIMESTAMP WITH TIME ZONE
);

-- Webhook events table for tracking callbacks
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id VARCHAR(255) UNIQUE NOT NULL,
    job_id VARCHAR(255) REFERENCES jobs(job_id) ON DELETE SET NULL,
    callback_url TEXT,
    event_type VARCHAR(100),
    payload JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_account_id ON jobs(tiktok_account_id);

CREATE INDEX IF NOT EXISTS idx_media_uploads_job_id ON media_uploads(job_id);
CREATE INDEX IF NOT EXISTS idx_media_uploads_account_id ON media_uploads(tiktok_account_id);
CREATE INDEX IF NOT EXISTS idx_media_uploads_created_at ON media_uploads(created_at);

CREATE INDEX IF NOT EXISTS idx_posts_account_id ON tiktok_posts(tiktok_account_id);
CREATE INDEX IF NOT EXISTS idx_posts_job_id ON tiktok_posts(job_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON tiktok_posts(created_at);

CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_job_id ON webhook_events(job_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_tiktok_accounts_updated_at 
    BEFORE UPDATE ON tiktok_accounts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at 
    BEFORE UPDATE ON jobs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create views for common queries
CREATE OR REPLACE VIEW active_jobs AS
SELECT 
    j.*,
    COUNT(m.id) as media_count,
    p.post_id as tiktok_post_id,
    p.share_url
FROM jobs j
LEFT JOIN media_uploads m ON j.job_id = m.job_id
LEFT JOIN tiktok_posts p ON j.job_id = p.job_id
WHERE j.status IN ('pending', 'processing')
GROUP BY j.id, p.post_id, p.share_url;

CREATE OR REPLACE VIEW job_summary AS
SELECT 
    j.*,
    COUNT(m.id) as total_media,
    COUNT(CASE WHEN m.upload_status = 'uploaded' THEN 1 END) as uploaded_media,
    p.post_id as tiktok_post_id,
    p.share_url,
    p.is_draft
FROM jobs j
LEFT JOIN media_uploads m ON j.job_id = m.job_id
LEFT JOIN tiktok_posts p ON j.job_id = p.job_id
GROUP BY j.id, p.post_id, p.share_url, p.is_draft;

-- Sample data for development (only insert if not exists)
INSERT INTO tiktok_accounts (account_id, display_name, username) 
VALUES ('default', 'Development Account', 'dev_account')
ON CONFLICT (account_id) DO NOTHING;

-- Grant permissions (adjust as needed for your user)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO tiktok_middleware_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO tiktok_middleware_user;

COMMIT;