-- ==============================================================================
-- ANIMANGA PLATFORM: DRAFT 06.2 - THE AUTHORITATIVE SCHEMA CONTRACT
-- Architecture: Identity -> Commerce -> Events | Integration <-> Finance
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS commerce;
CREATE SCHEMA IF NOT EXISTS events;
CREATE SCHEMA IF NOT EXISTS integration;
CREATE SCHEMA IF NOT EXISTS finance;

-- ==========================================
-- SHARED UTILITIES
-- ==========================================
CREATE OR REPLACE FUNCTION finance.prevent_update_delete() RETURNS TRIGGER AS $$
BEGIN RAISE EXCEPTION 'Record is strictly immutable (append-only)'; END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 1. FINANCE & LEDGER CORE
-- ==========================================

CREATE TYPE finance.account_classification AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');
CREATE TYPE finance.entry_direction AS ENUM ('DEBIT', 'CREDIT');

CREATE TYPE finance.ledger_entry_input AS (
    account_id UUID,
    direction finance.entry_direction,
    amount NUMERIC(19, 4)
);

CREATE TABLE IF NOT EXISTS finance.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_account_id UUID REFERENCES finance.accounts(id),
    classification finance.account_classification NOT NULL,
    account_code VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KES' NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE(account_code, currency),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance.ledger_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_type VARCHAR(50) NOT NULL,
    reference_type VARCHAR(50) NOT NULL,
    reference_id VARCHAR(255) NOT NULL,
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    request_hash CHAR(64) NOT NULL CHECK (request_hash ~ '^[0-9a-fA-F]{64}$'),
    currency VARCHAR(3) DEFAULT 'KES' NOT NULL,
    reverses_transaction_id UUID REFERENCES finance.ledger_transactions(id),
    status VARCHAR(20) DEFAULT 'POSTED' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Payment transactions map 1:1 with commerce.payments
CREATE UNIQUE INDEX IF NOT EXISTS uq_ledger_single_payment 
ON finance.ledger_transactions (reference_type, reference_id) 
WHERE transaction_type = 'PAYMENT' AND status = 'POSTED';

CREATE TABLE IF NOT EXISTS finance.ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES finance.ledger_transactions(id),
    account_id UUID NOT NULL REFERENCES finance.accounts(id),
    direction finance.entry_direction NOT NULL,
    amount NUMERIC(19, 4) NOT NULL CHECK (amount > 0),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER enforce_entry_immutability
BEFORE UPDATE OR DELETE ON finance.ledger_entries
FOR EACH ROW EXECUTE FUNCTION finance.prevent_update_delete();

CREATE TRIGGER enforce_tx_immutability
BEFORE UPDATE OR DELETE ON finance.ledger_transactions
FOR EACH ROW EXECUTE FUNCTION finance.prevent_update_delete();

-- ==========================================
-- 2. IDENTITY DOMAIN & RBAC
-- ==========================================

CREATE TABLE IF NOT EXISTS identity.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email CITEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(30),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS identity.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS identity.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(150) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS identity.role_permissions (
    role_id UUID NOT NULL REFERENCES identity.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES identity.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TYPE identity.scope_type AS ENUM ('GLOBAL', 'MERCHANT', 'EVENT');

CREATE TABLE IF NOT EXISTS identity.role_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES identity.roles(id) ON DELETE RESTRICT,
    scope_type identity.scope_type NOT NULL,
    scope_id UUID, 
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    assigned_by UUID REFERENCES identity.users(id) ON DELETE SET NULL,
    CHECK (
        (scope_type = 'GLOBAL' AND scope_id IS NULL) OR 
        (scope_type IN ('MERCHANT', 'EVENT') AND scope_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_role_assignment_global 
ON identity.role_assignments (user_id, role_id, scope_type) 
WHERE scope_type = 'GLOBAL';

CREATE UNIQUE INDEX IF NOT EXISTS uq_role_assignment_scoped 
ON identity.role_assignments (user_id, role_id, scope_type, scope_id) 
WHERE scope_type IN ('MERCHANT', 'EVENT');

CREATE TYPE identity.kyc_profile_status AS ENUM ('UNVERIFIED', 'VERIFIED', 'SUSPENDED');
CREATE TYPE identity.kyc_case_status AS ENUM ('OPEN', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CLOSED');

CREATE TABLE IF NOT EXISTS identity.kyc_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES identity.users(id) ON DELETE RESTRICT,
    legal_name VARCHAR(255) NOT NULL,
    kra_pin_hash TEXT,
    verification_status identity.kyc_profile_status NOT NULL DEFAULT 'UNVERIFIED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS identity.kyc_verification_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kyc_profile_id UUID NOT NULL REFERENCES identity.kyc_profiles(id) ON DELETE CASCADE,
    status identity.kyc_case_status NOT NULL,
    reviewer_id UUID REFERENCES identity.users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER enforce_kyc_cases_immutability
BEFORE UPDATE OR DELETE ON identity.kyc_verification_cases
FOR EACH ROW EXECUTE FUNCTION finance.prevent_update_delete();

CREATE TABLE IF NOT EXISTS identity.kyc_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kyc_profile_id UUID NOT NULL REFERENCES identity.kyc_profiles(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    document_storage_key TEXT NOT NULL UNIQUE,
    document_sha256 CHAR(64) NOT NULL CHECK (document_sha256 ~ '^[0-9a-fA-F]{64}$'),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS identity.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES identity.users(id) ON DELETE SET NULL,
    action VARCHAR(150) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER enforce_audit_log_immutability
BEFORE UPDATE OR DELETE ON identity.audit_log
FOR EACH ROW EXECUTE FUNCTION finance.prevent_update_delete();

-- ==========================================
-- 3. COMMERCE DOMAIN
-- ==========================================

CREATE TYPE commerce.merchant_status AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED');

CREATE TABLE IF NOT EXISTS commerce.merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
    business_name VARCHAR(255) NOT NULL,
    operating_currency CHAR(3) DEFAULT 'KES' NOT NULL,
    status commerce.merchant_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ 
);

CREATE TYPE commerce.order_payment_status AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID');
CREATE TYPE commerce.fulfillment_status AS ENUM ('UNFULFILLED', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED');
CREATE TYPE commerce.refund_status AS ENUM ('NOT_REFUNDED', 'PARTIALLY_REFUNDED', 'FULLY_REFUNDED');

CREATE TABLE IF NOT EXISTS commerce.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
    merchant_id UUID NOT NULL REFERENCES commerce.merchants(id) ON DELETE RESTRICT,
    gross_amount NUMERIC(19,4) NOT NULL CHECK (gross_amount > 0),
    currency CHAR(3) NOT NULL,
    payment_status commerce.order_payment_status NOT NULL DEFAULT 'UNPAID',
    fulfillment_status commerce.fulfillment_status NOT NULL DEFAULT 'UNFULFILLED',
    refund_status commerce.refund_status NOT NULL DEFAULT 'NOT_REFUNDED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON commerce.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_merchant ON commerce.orders(merchant_id);

CREATE TYPE commerce.order_item_type AS ENUM ('TICKET', 'MERCH');

CREATE TABLE IF NOT EXISTS commerce.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES commerce.orders(id) ON DELETE RESTRICT,
    item_type commerce.order_item_type NOT NULL,
    item_id UUID NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_per_unit NUMERIC(19,4) NOT NULL CHECK (price_per_unit >= 0),
    currency CHAR(3) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE commerce.payment_status AS ENUM ('PENDING', 'AUTHORIZED', 'COMPLETED', 'FAILED', 'REVERSED');
CREATE TYPE commerce.payment_method AS ENUM ('MPESA_STK', 'MPESA_C2B', 'CARD');

-- The Operational Link between Order Intent and Provider Reality
CREATE TABLE IF NOT EXISTS commerce.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES commerce.orders(id) ON DELETE RESTRICT,
    amount NUMERIC(19,4) NOT NULL CHECK (amount > 0),
    currency CHAR(3) NOT NULL,
    status commerce.payment_status NOT NULL DEFAULT 'PENDING',
    payment_method commerce.payment_method NOT NULL,
    provider VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE commerce.refund_workflow_status AS ENUM ('REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE IF NOT EXISTS commerce.refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    refund_number VARCHAR(50) UNIQUE NOT NULL,
    order_id UUID NOT NULL REFERENCES commerce.orders(id) ON DELETE RESTRICT,
    amount NUMERIC(19,4) NOT NULL CHECK (amount > 0),
    currency CHAR(3) NOT NULL,
    status commerce.refund_workflow_status NOT NULL DEFAULT 'REQUESTED',
    reason TEXT,
    requested_by UUID NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
    approved_by UUID REFERENCES identity.users(id) ON DELETE RESTRICT,
    original_payment_ledger_tx_id UUID, 
    reversal_ledger_tx_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE commerce.payout_status AS ENUM ('REQUESTED', 'APPROVED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

CREATE TABLE IF NOT EXISTS commerce.payout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_number VARCHAR(50) UNIQUE NOT NULL,
    merchant_id UUID NOT NULL REFERENCES commerce.merchants(id) ON DELETE RESTRICT,
    amount NUMERIC(19,4) NOT NULL CHECK (amount > 0),
    currency CHAR(3) NOT NULL,
    destination_reference TEXT NOT NULL,
    status commerce.payout_status NOT NULL DEFAULT 'REQUESTED',
    requested_by UUID NOT NULL REFERENCES identity.users(id) ON DELETE RESTRICT,
    approved_by UUID REFERENCES identity.users(id) ON DELETE RESTRICT,
    approved_at TIMESTAMPTZ,
    payout_ledger_tx_id UUID,
    provider_transaction_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- 4. EVENTS DOMAIN & INVENTORY PKI
-- ==========================================

CREATE TYPE events.event_status AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'ON_SALE', 'CLOSED', 'COMPLETED', 'CANCELLED');

CREATE TABLE IF NOT EXISTS events.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES commerce.merchants(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    currency CHAR(3) NOT NULL,
    status events.event_status NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS events.ticket_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events.events(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    price NUMERIC(19,4) NOT NULL CHECK (price >= 0),
    currency CHAR(3) NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    sales_cutoff TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    UNIQUE (event_id, name)
);

CREATE TABLE IF NOT EXISTS events.ticket_inventory (
    ticket_type_id UUID PRIMARY KEY REFERENCES events.ticket_types(id) ON DELETE RESTRICT,
    capacity INT NOT NULL CHECK (capacity >= 0),
    available_quantity INT NOT NULL CHECK (available_quantity >= 0),
    reserved_quantity INT NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    sold_quantity INT NOT NULL DEFAULT 0 CHECK (sold_quantity >= 0),
    version INT NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ticket_inventory_capacity_math_check 
        CHECK (available_quantity + reserved_quantity + sold_quantity = capacity)
);

CREATE TYPE events.reservation_status AS ENUM ('RESERVED', 'SOLD', 'EXPIRED', 'RELEASED');

CREATE TABLE IF NOT EXISTS events.ticket_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_type_id UUID NOT NULL REFERENCES events.ticket_types(id) ON DELETE RESTRICT,
    checkout_session_id UUID UNIQUE NOT NULL, -- Idempotency for Cart Checkouts
    order_id UUID REFERENCES commerce.orders(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    status events.reservation_status NOT NULL DEFAULT 'RESERVED',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    released_at TIMESTAMPTZ
);

CREATE TYPE events.signing_key_status AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

CREATE TABLE IF NOT EXISTS events.signing_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    algorithm VARCHAR(50) NOT NULL,
    public_key TEXT NOT NULL,
    status events.signing_key_status NOT NULL DEFAULT 'ACTIVE',
    valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_until TIMESTAMPTZ
);

CREATE TYPE events.ticket_status AS ENUM ('ISSUED', 'SCANNED', 'REVOKED');

CREATE TABLE IF NOT EXISTS events.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(100) NOT NULL UNIQUE,
    order_id UUID NOT NULL REFERENCES commerce.orders(id) ON DELETE RESTRICT,
    order_item_id UUID NOT NULL REFERENCES commerce.order_items(id) ON DELETE RESTRICT,
    ticket_type_id UUID NOT NULL REFERENCES events.ticket_types(id) ON DELETE RESTRICT,
    signature_key_id UUID NOT NULL REFERENCES events.signing_keys(id) ON DELETE RESTRICT,
    qr_payload TEXT NOT NULL,
    qr_signature TEXT NOT NULL,
    qr_payload_hash CHAR(64) NOT NULL CHECK (qr_payload_hash ~ '^[0-9a-fA-F]{64}$'),
    status events.ticket_status NOT NULL DEFAULT 'ISSUED',
    issued_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE events.ticket_scan_result AS ENUM ('VALID', 'DUPLICATE', 'WRONG_EVENT', 'INVALID_SIGNATURE', 'EXPIRED', 'REVOKED');

CREATE TABLE IF NOT EXISTS events.ticket_scan_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES events.tickets(id) ON DELETE SET NULL,
    event_id UUID NOT NULL REFERENCES events.events(id) ON DELETE RESTRICT,
    scanner_user_id UUID REFERENCES identity.users(id) ON DELETE SET NULL,
    result events.ticket_scan_result NOT NULL,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    device_id TEXT,
    app_version VARCHAR(50),
    network_status VARCHAR(20),
    sync_sequence BIGINT,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER enforce_scans_immutability
BEFORE UPDATE OR DELETE ON events.ticket_scan_attempts
FOR EACH ROW EXECUTE FUNCTION finance.prevent_update_delete();

-- ==========================================
-- 5. INTEGRATION DOMAIN & RECONCILIATION
-- ==========================================

CREATE TYPE integration.provider_tx_status AS ENUM ('INITIATED', 'PENDING', 'COMPLETED', 'FAILED', 'REVERSED');

CREATE TABLE IF NOT EXISTS integration.provider_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL,
    provider_transaction_id VARCHAR(255) NOT NULL,
    internal_payment_id UUID REFERENCES commerce.payments(id) ON DELETE SET NULL,
    amount NUMERIC(19,4) NOT NULL,
    currency CHAR(3) NOT NULL,
    status integration.provider_tx_status NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(provider, provider_transaction_id)
);

CREATE TYPE integration.provider_event_status AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'DEAD_LETTER');

CREATE TABLE IF NOT EXISTS integration.provider_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL,
    provider_event_id VARCHAR(255) NOT NULL,
    provider_transaction_id UUID REFERENCES integration.provider_transactions(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    idempotency_key VARCHAR(500) NOT NULL,
    payload_hash CHAR(64) NOT NULL CHECK (payload_hash ~ '^[0-9a-fA-F]{64}$'),
    raw_payload JSONB NOT NULL,
    status integration.provider_event_status NOT NULL DEFAULT 'PENDING',
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ,
    last_error TEXT,
    UNIQUE (provider, provider_event_id),
    UNIQUE (provider, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_provider_events_status ON integration.provider_events(status);

CREATE TRIGGER enforce_provider_events_immutability
BEFORE UPDATE OR DELETE ON integration.provider_events
FOR EACH ROW EXECUTE FUNCTION finance.prevent_update_delete();

CREATE TYPE integration.outbox_status AS ENUM ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED', 'DEAD_LETTER');

CREATE TABLE IF NOT EXISTS integration.outbox_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type VARCHAR(150) NOT NULL,
    payload JSONB NOT NULL,
    status integration.outbox_status NOT NULL DEFAULT 'PENDING',
    deduplication_key VARCHAR(255) UNIQUE NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outbox_dispatch ON integration.outbox_messages(status, next_attempt_at) WHERE status IN ('PENDING', 'FAILED');

CREATE TYPE integration.statement_import_status AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE IF NOT EXISTS integration.statement_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL,
    provider_account VARCHAR(255),
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    file_hash CHAR(64) NOT NULL CHECK (file_hash ~ '^[0-9a-fA-F]{64}$'),
    imported_by UUID REFERENCES identity.users(id) ON DELETE SET NULL,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status integration.statement_import_status NOT NULL DEFAULT 'PROCESSING'
);

CREATE TABLE IF NOT EXISTS integration.statement_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    statement_import_id UUID NOT NULL REFERENCES integration.statement_imports(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_statement_id VARCHAR(255) NOT NULL,
    provider_transaction_id VARCHAR(255) NOT NULL,
    reference VARCHAR(255),
    amount NUMERIC(19,4) NOT NULL,
    currency CHAR(3) NOT NULL,
    transaction_type VARCHAR(100),
    occurred_at TIMESTAMPTZ,
    settled_at TIMESTAMPTZ,
    statement_hash CHAR(64) NOT NULL CHECK (statement_hash ~ '^[0-9a-fA-F]{64}$'),
    raw_payload JSONB,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(provider, statement_hash)
);

CREATE INDEX IF NOT EXISTS idx_statement_lines_provider_transaction ON integration.statement_lines(provider, provider_transaction_id);

CREATE TYPE integration.reconciliation_status AS ENUM ('DISCOVERED', 'MATCHING', 'MATCHED', 'EXCEPTION', 'RESOLVED');
CREATE TYPE integration.reconciliation_exception AS ENUM ('AMOUNT_MISMATCH', 'MISSING_INTERNAL_TRANSACTION', 'MISSING_PROVIDER_TRANSACTION', 'STATUS_MISMATCH', 'UNEXPECTED_FEE');

CREATE TABLE IF NOT EXISTS integration.reconciliation_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status integration.reconciliation_status NOT NULL DEFAULT 'DISCOVERED',
    exception_category integration.reconciliation_exception,
    notes TEXT,
    resolved_by UUID REFERENCES identity.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (status <> 'EXCEPTION' OR exception_category IS NOT NULL)
);

-- Many-to-Many matching logic
CREATE TABLE IF NOT EXISTS integration.reconciliation_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reconciliation_case_id UUID NOT NULL REFERENCES integration.reconciliation_cases(id) ON DELETE CASCADE,
    statement_line_id UUID NOT NULL REFERENCES integration.statement_lines(id) ON DELETE RESTRICT,
    ledger_transaction_id UUID, 
    matched_amount NUMERIC(19,4) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- 6. SECURITY DEFINER PL/pgSQL
-- ==========================================

CREATE OR REPLACE FUNCTION finance.post_ledger_transaction(
    p_tx_type VARCHAR,
    p_ref_type VARCHAR,
    p_ref_id VARCHAR,
    p_idempotency_key VARCHAR,
    p_currency VARCHAR,
    p_entries finance.ledger_entry_input[],
    p_request_hash CHAR(64) DEFAULT '0000000000000000000000000000000000000000000000000000000000000000',
    p_reverses_tx_id UUID DEFAULT NULL
) RETURNS UUID 
SECURITY DEFINER SET search_path = finance, pg_catalog
AS $$
DECLARE
    v_tx_id UUID;
    v_existing_hash CHAR(64);
    v_entry finance.ledger_entry_input;
    v_acct_currency VARCHAR(3);
    v_total_debit NUMERIC := 0;
    v_total_credit NUMERIC := 0;
    v_parent_type VARCHAR(50);
    v_parent_value NUMERIC := 0;
    v_refunded_value NUMERIC := 0;
BEGIN
    SELECT id, request_hash INTO v_tx_id, v_existing_hash FROM finance.ledger_transactions WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN 
        IF v_existing_hash != p_request_hash THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT: Key reused with mismatched payload'; END IF;
        RETURN v_tx_id; 
    END IF;

    FOREACH v_entry IN ARRAY p_entries LOOP
        SELECT currency INTO v_acct_currency FROM finance.accounts WHERE id = v_entry.account_id;
        IF v_acct_currency != p_currency THEN RAISE EXCEPTION 'CURRENCY_MISMATCH: Cannot post % transaction to % account', p_currency, v_acct_currency; END IF;

        IF v_entry.direction = 'DEBIT' THEN v_total_debit := v_total_debit + v_entry.amount;
        ELSIF v_entry.direction = 'CREDIT' THEN v_total_credit := v_total_credit + v_entry.amount;
        END IF;
    END LOOP;

    IF v_total_debit != v_total_credit THEN RAISE EXCEPTION 'Ledger imbalance: Debits (%) != Credits (%)', v_total_debit, v_total_credit; END IF;

    IF p_reverses_tx_id IS NOT NULL THEN
        SELECT transaction_type INTO v_parent_type FROM finance.ledger_transactions WHERE id = p_reverses_tx_id FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'LINEAGE_ERROR: Parent transaction not found'; END IF;
        IF p_tx_type = 'REFUND' AND v_parent_type != 'PAYMENT' THEN RAISE EXCEPTION 'LINEAGE_ERROR: Cannot refund a non-payment'; END IF;
        
        SELECT COALESCE(SUM(amount), 0) INTO v_parent_value FROM finance.ledger_entries WHERE transaction_id = p_reverses_tx_id AND direction = 'DEBIT';
        SELECT COALESCE(SUM(amount), 0) INTO v_refunded_value FROM finance.ledger_entries e JOIN finance.ledger_transactions t ON e.transaction_id = t.id WHERE t.reverses_transaction_id = p_reverses_tx_id AND e.direction = 'DEBIT';
        
        IF (v_refunded_value + v_total_debit) > v_parent_value THEN RAISE EXCEPTION 'REFUND_EXCEEDED: Cannot refund more than original amount'; END IF;
    END IF;

    BEGIN
        INSERT INTO finance.ledger_transactions (transaction_type, reference_type, reference_id, idempotency_key, request_hash, currency, reverses_transaction_id)
        VALUES (p_tx_type, p_ref_type, p_ref_id, p_idempotency_key, p_request_hash, p_currency, p_reverses_tx_id)
        RETURNING id INTO v_tx_id;
    EXCEPTION WHEN unique_violation THEN
        SELECT id, request_hash INTO v_tx_id, v_existing_hash FROM finance.ledger_transactions WHERE idempotency_key = p_idempotency_key;
        IF NOT FOUND THEN RAISE; END IF;
        IF v_existing_hash != p_request_hash THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT: Key reused with mismatched payload'; END IF;
        RETURN v_tx_id;
    END;

    FOREACH v_entry IN ARRAY p_entries LOOP
        INSERT INTO finance.ledger_entries (transaction_id, account_id, direction, amount)
        VALUES (v_tx_id, v_entry.account_id, v_entry.direction, v_entry.amount);
    END LOOP;

    RETURN v_tx_id;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 7. INFRASTRUCTURE ROLE BINDINGS
-- ==========================================

DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'animanga_app') THEN
        REVOKE INSERT, UPDATE, DELETE ON finance.ledger_transactions FROM animanga_app;
        REVOKE INSERT, UPDATE, DELETE ON finance.ledger_entries FROM animanga_app;
        
        GRANT EXECUTE ON FUNCTION finance.post_ledger_transaction(
            VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, finance.ledger_entry_input[], CHAR(64), UUID
        ) TO animanga_app;
    END IF;
END
$$;