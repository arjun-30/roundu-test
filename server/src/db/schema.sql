-- RoundU Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(15) UNIQUE NOT NULL,
    name VARCHAR(100),
    email VARCHAR(255) UNIQUE,
    address TEXT,
    avatar_url TEXT,
    role VARCHAR(20) DEFAULT 'customer',
    lat NUMERIC(10, 7),
    lng NUMERIC(10, 7),
    display_location VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Providers Table
CREATE TABLE IF NOT EXISTS providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    experience_years INTEGER DEFAULT 0,
    rating DECIMAL(3, 2) DEFAULT 0.00,
    response_rate INTEGER DEFAULT 100,
    is_online BOOLEAN DEFAULT false,
    service_radius INTEGER DEFAULT 20,
    working_hours TEXT,
    is_verified BOOLEAN DEFAULT false,
    lat NUMERIC(10, 7),
    lng NUMERIC(10, 7),
    display_location VARCHAR(255),
    service_category VARCHAR(255)[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Services Table
CREATE TABLE IF NOT EXISTS services (
    id VARCHAR(50) PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    description TEXT,
    price_per_hr INTEGER NOT NULL
);

-- Provider Services (Many-to-Many)
CREATE TABLE IF NOT EXISTS provider_services (
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
    service_id VARCHAR(50) REFERENCES services(id) ON DELETE CASCADE,
    PRIMARY KEY (provider_id, service_id)
);

-- Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES users(id),
    provider_id UUID REFERENCES providers(id),
    service_id VARCHAR(50) REFERENCES services(id),
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, rejected, completed, cancelled
    scheduled_at TIMESTAMP WITH TIME ZONE,
    address TEXT,
    price DECIMAL(10, 2),
    notes TEXT,
    voice_note BOOLEAN DEFAULT false,
    paid BOOLEAN DEFAULT false,
    lat DECIMAL(9, 6),
    lng DECIMAL(9, 6),
    provider_lat DECIMAL(9, 6),
    provider_lng DECIMAL(9, 6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Wallet Transactions (Earnings/Payments)
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    amount DECIMAL(10, 2) NOT NULL,
    type VARCHAR(20) NOT NULL, -- credit (earning), debit (payment)
    description TEXT,
    booking_id UUID REFERENCES bookings(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Wallets (per-user balances, stored in paise as BIGINT)
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    balance BIGINT DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'INR',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    status VARCHAR(20) DEFAULT 'pending', -- pending, success, failed, refunded
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    razorpay_signature VARCHAR(255),
    method VARCHAR(50), -- card, upi, netbanking, wallet
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);

-- Ratings Table
CREATE TABLE IF NOT EXISTS ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES users(id),
    provider_id UUID REFERENCES providers(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ratings_provider ON ratings(provider_id);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50), -- booking, payment, offer, general
    is_read BOOLEAN DEFAULT false,
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- KYC Documents Table
CREATE TABLE IF NOT EXISTS kyc_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL, -- aadhar, pan, driving_license
    document_number VARCHAR(100),
    document_url TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, verified, rejected
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kyc_docs_provider ON kyc_documents(provider_id);

-- Deleted Accounts (Audit)
CREATE TABLE IF NOT EXISTS deleted_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(15) NOT NULL,
    reason TEXT,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- OTP Attempts Table
CREATE TABLE IF NOT EXISTS otp_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(15) NOT NULL,
    otp_hash TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_otp_attempts_phone ON otp_attempts(phone);

-- Insert Initial Services
INSERT INTO services (id, label, description, price_per_hr) VALUES
('plumber', 'Plumber', 'Pipes & drainage', 299),
('electrician', 'Electrician', 'Wiring & fixtures', 299),
('carwash', 'Car Wash', 'At your doorstep', 199),
('drivers', 'Acting Drivers', 'Expert chauffeurs', 399),
('housekeeping', 'House Keeping', 'Deep & regular', 499)
ON CONFLICT (id) DO NOTHING;

-- KYC Audit Logs
CREATE TABLE IF NOT EXISTS kyc_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    request_id VARCHAR(100),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    consent_flag BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_kyc_audit_logs_user ON kyc_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_audit_logs_request ON kyc_audit_logs(request_id);

-- KYC Encrypted Vault
CREATE TABLE IF NOT EXISTS kyc_encrypted_vault (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    verified_name_encrypted TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users Table Alterations
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(20) DEFAULT 'unverified';
ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS masked_aadhaar VARCHAR(4);
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER DEFAULT 1;

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id VARCHAR(50) NOT NULL,
    sender_id VARCHAR(50) NOT NULL,
    sender_role VARCHAR(20) NOT NULL,
    text TEXT NOT NULL,
    audio_base64 TEXT,
    is_seen BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_booking ON chat_messages(booking_id);


-- Fraud flags for ops review
CREATE TABLE IF NOT EXISTS fraud_flags (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL,
  bank_account          VARCHAR(40),
  ifsc                  VARCHAR(11),
  cashfree_reference_id BIGINT,
  flagged_at            TIMESTAMP DEFAULT NOW(),
  reviewed              BOOLEAN DEFAULT FALSE,
  reviewed_by           VARCHAR(100),
  reviewed_at           TIMESTAMP,
  notes                 TEXT
);

-- BAV attempt counter per user
CREATE TABLE IF NOT EXISTS bav_attempts (
  user_id               UUID PRIMARY KEY,
  attempts              INT DEFAULT 0,
  locked                BOOLEAN DEFAULT FALSE,
  last_status_code      VARCHAR(30),
  last_attempt_at       TIMESTAMP,
  created_at            TIMESTAMP DEFAULT NOW()
);

-- Penny drop queue stub (next iteration)
CREATE TABLE IF NOT EXISTS penny_drop_queue (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL,
  bank_account          VARCHAR(40),
  ifsc                  VARCHAR(11),
  name                  VARCHAR(200),
  status                VARCHAR(20) DEFAULT 'QUEUED',
  reason                VARCHAR(100),
  queued_at             TIMESTAMP DEFAULT NOW(),
  processed_at          TIMESTAMP
);

-- Add fraud flag columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS fraud_flagged BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS fraud_reason VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS fraud_flagged_at TIMESTAMP;
