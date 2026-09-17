--
-- PostgreSQL database dump
--

\restrict 2sO9ArFIx52WEpig9dIeClS1LTmrkOrQdWgpRDMX5ez8oEQSpPBOubLNYZBJg32

-- Dumped from database version 15.15
-- Dumped by pg_dump version 15.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: commerce; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA commerce;


--
-- Name: content; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA content;


--
-- Name: events; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA events;


--
-- Name: finance; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA finance;


--
-- Name: identity; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA identity;


--
-- Name: integration; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA integration;


--
-- Name: system; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA system;


--
-- Name: citext; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;


--
-- Name: EXTENSION citext; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: scan_result; Type: TYPE; Schema: events; Owner: -
--

CREATE TYPE events.scan_result AS ENUM (
    'VALID',
    'DUPLICATE',
    'INVALID_SIGNATURE',
    'WRONG_EVENT',
    'VOIDED'
);


--
-- Name: ticket_state; Type: TYPE; Schema: events; Owner: -
--

CREATE TYPE events.ticket_state AS ENUM (
    'AVAILABLE',
    'RESERVED',
    'ISSUED',
    'SCANNED',
    'CANCELLED',
    'REFUNDED',
    'VOIDED'
);


--
-- Name: account_type; Type: TYPE; Schema: finance; Owner: -
--

CREATE TYPE finance.account_type AS ENUM (
    'ASSET',
    'LIABILITY',
    'EQUITY',
    'REVENUE',
    'EXPENSE'
);


--
-- Name: entry_direction; Type: TYPE; Schema: finance; Owner: -
--

CREATE TYPE finance.entry_direction AS ENUM (
    'DEBIT',
    'CREDIT'
);


--
-- Name: ledger_entry_input; Type: TYPE; Schema: finance; Owner: -
--

CREATE TYPE finance.ledger_entry_input AS (
	account_id uuid,
	direction finance.entry_direction,
	amount numeric(19,4)
);


--
-- Name: payout_destination_status; Type: TYPE; Schema: finance; Owner: -
--

CREATE TYPE finance.payout_destination_status AS ENUM (
    'PENDING_VERIFICATION',
    'VERIFIED',
    'SUSPENDED'
);


--
-- Name: payout_status; Type: TYPE; Schema: finance; Owner: -
--

CREATE TYPE finance.payout_status AS ENUM (
    'DRAFT',
    'PENDING_APPROVAL',
    'APPROVED',
    'IN_TRANSIT',
    'SETTLED',
    'FAILED'
);


--
-- Name: transaction_status; Type: TYPE; Schema: finance; Owner: -
--

CREATE TYPE finance.transaction_status AS ENUM (
    'DRAFT',
    'POSTING',
    'POSTED',
    'REVERSED'
);


--
-- Name: processing_status; Type: TYPE; Schema: integration; Owner: -
--

CREATE TYPE integration.processing_status AS ENUM (
    'PENDING',
    'PROCESSED',
    'FAILED',
    'IGNORED'
);


--
-- Name: provider_event_processing_status; Type: TYPE; Schema: integration; Owner: -
--

CREATE TYPE integration.provider_event_processing_status AS ENUM (
    'PENDING',
    'PROCESSING',
    'PROCESSED',
    'FAILED',
    'DEAD_LETTER'
);


--
-- Name: prevent_scan_mutation(); Type: FUNCTION; Schema: events; Owner: -
--

CREATE FUNCTION events.prevent_scan_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE EXCEPTION 'FATAL: Ticket scan attempts are immutable audit logs.';
END;
$$;


--
-- Name: prevent_ledger_mutation(); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.prevent_ledger_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    RAISE EXCEPTION 'FATAL: Ledger entries are immutable. Post a reversal transaction instead.';
END;
$$;


--
-- Name: post_ledger_transaction(character varying, character varying, character varying, character varying, character varying, finance.ledger_entry_input[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.post_ledger_transaction(p_tx_type character varying, p_ref_type character varying, p_ref_id character varying, p_idempotency_key character varying, p_currency character varying, p_entries finance.ledger_entry_input[]) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_tx_id UUID;
    v_entry finance.ledger_entry_input;
    v_total_debit NUMERIC := 0;
    v_total_credit NUMERIC := 0;
BEGIN
    -- Idempotency: Silently return the ID if already processed
    SELECT id INTO v_tx_id FROM finance.ledger_transactions WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
        RETURN v_tx_id;
    END IF;

    -- Validate Zero-Sum Math (Debits MUST equal Credits)
    FOREACH v_entry IN ARRAY p_entries LOOP
        IF v_entry.direction = 'DEBIT' THEN
            v_total_debit := v_total_debit + v_entry.amount;
        ELSIF v_entry.direction = 'CREDIT' THEN
            v_total_credit := v_total_credit + v_entry.amount;
        END IF;
    END LOOP;

    IF v_total_debit != v_total_credit THEN
        RAISE EXCEPTION 'Ledger imbalance: Debits (%) != Credits (%)', v_total_debit, v_total_credit;
    END IF;

    -- Insert Transaction Header
    INSERT INTO finance.ledger_transactions (transaction_type, reference_type, reference_id, idempotency_key, currency)
    VALUES (p_tx_type, p_ref_type, p_ref_id, p_idempotency_key, p_currency)
    RETURNING id INTO v_tx_id;

    -- Insert Individual Entries
    FOREACH v_entry IN ARRAY p_entries LOOP
        INSERT INTO finance.ledger_entries (transaction_id, account_id, direction, amount)
        VALUES (v_tx_id, v_entry.account_id, v_entry.direction, v_entry.amount);
    END LOOP;

    RETURN v_tx_id;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: merchants; Type: TABLE; Schema: commerce; Owner: -
--

CREATE TABLE commerce.merchants (
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: orders; Type: TABLE; Schema: commerce; Owner: -
--

CREATE TABLE commerce.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: media_items; Type: TABLE; Schema: content; Owner: -
--

CREATE TABLE content.media_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider character varying(50) NOT NULL,
    external_id character varying(100) NOT NULL,
    media_type character varying(20) NOT NULL,
    title_romaji character varying(500),
    title_english character varying(500),
    title_native character varying(500),
    synopsis text,
    status character varying(50) DEFAULT 'UNKNOWN'::character varying NOT NULL,
    season character varying(20),
    season_year integer,
    cover_image_url text,
    banner_image_url text,
    color_hex character varying(20),
    episodes integer,
    chapters integer,
    volumes integer,
    genres text[] DEFAULT '{}'::text[] NOT NULL,
    average_score numeric(5,2),
    source_updated_at timestamp with time zone,
    last_synced_at timestamp with time zone,
    provider_metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: events; Type: TABLE; Schema: events; Owner: -
--

CREATE TABLE events.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: ticket_scan_attempts; Type: TABLE; Schema: events; Owner: -
--

CREATE TABLE events.ticket_scan_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    event_id uuid NOT NULL,
    scanner_id uuid NOT NULL,
    device_id character varying(255),
    result events.scan_result NOT NULL,
    attempted_at timestamp with time zone DEFAULT now()
);


--
-- Name: tickets; Type: TABLE; Schema: events; Owner: -
--

CREATE TABLE events.tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    order_id uuid,
    state events.ticket_state DEFAULT 'AVAILABLE'::events.ticket_state,
    reserved_until timestamp with time zone,
    cryptographic_nonce character varying(64),
    issued_at timestamp with time zone
);


--
-- Name: accounts; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_code character varying(255) NOT NULL,
    account_type finance.account_type NOT NULL,
    currency character varying(3) DEFAULT 'KES'::character varying NOT NULL,
    owner_type character varying(50),
    owner_id uuid,
    status character varying(50) DEFAULT 'ACTIVE'::character varying,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: ledger_entries; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.ledger_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_id uuid NOT NULL,
    account_id uuid NOT NULL,
    direction finance.entry_direction NOT NULL,
    amount numeric(19,4) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ledger_entries_amount_check CHECK ((amount > (0)::numeric))
);


--
-- Name: ledger_transactions; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.ledger_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_type character varying(100) NOT NULL,
    reference_type character varying(100) NOT NULL,
    reference_id character varying(255) NOT NULL,
    idempotency_key character varying(255) NOT NULL,
    currency character varying(3) DEFAULT 'KES'::character varying NOT NULL,
    status finance.transaction_status DEFAULT 'POSTED'::finance.transaction_status,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: users; Type: TABLE; Schema: identity; Owner: -
--

CREATE TABLE identity.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: provider_event_processing; Type: TABLE; Schema: integration; Owner: -
--

CREATE TABLE integration.provider_event_processing (
    provider_event_id uuid NOT NULL,
    status integration.provider_event_processing_status DEFAULT 'PENDING'::integration.provider_event_processing_status NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    started_at timestamp with time zone,
    processed_at timestamp with time zone,
    last_error text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT provider_event_processing_attempt_count_check CHECK ((attempt_count >= 0))
);


--
-- Name: provider_events; Type: TABLE; Schema: integration; Owner: -
--

CREATE TABLE integration.provider_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider character varying(50) NOT NULL,
    provider_event_id character varying(255) NOT NULL,
    provider_transaction_id character varying(255),
    event_type character varying(100) NOT NULL,
    raw_payload jsonb NOT NULL,
    signature_verified boolean DEFAULT false,
    status integration.processing_status DEFAULT 'PENDING'::integration.processing_status,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: outbox_events; Type: TABLE; Schema: system; Owner: -
--

CREATE TABLE system.outbox_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    aggregate_type character varying(100) NOT NULL,
    aggregate_id uuid NOT NULL,
    event_type character varying(100) NOT NULL,
    payload jsonb NOT NULL,
    published boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: merchants merchants_pkey; Type: CONSTRAINT; Schema: commerce; Owner: -
--

ALTER TABLE ONLY commerce.merchants
    ADD CONSTRAINT merchants_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: commerce; Owner: -
--

ALTER TABLE ONLY commerce.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: media_items media_items_pkey; Type: CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.media_items
    ADD CONSTRAINT media_items_pkey PRIMARY KEY (id);


--
-- Name: media_items media_items_provider_external_id_key; Type: CONSTRAINT; Schema: content; Owner: -
--

ALTER TABLE ONLY content.media_items
    ADD CONSTRAINT media_items_provider_external_id_key UNIQUE (provider, external_id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: events; Owner: -
--

ALTER TABLE ONLY events.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: ticket_scan_attempts ticket_scan_attempts_pkey; Type: CONSTRAINT; Schema: events; Owner: -
--

ALTER TABLE ONLY events.ticket_scan_attempts
    ADD CONSTRAINT ticket_scan_attempts_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_cryptographic_nonce_key; Type: CONSTRAINT; Schema: events; Owner: -
--

ALTER TABLE ONLY events.tickets
    ADD CONSTRAINT tickets_cryptographic_nonce_key UNIQUE (cryptographic_nonce);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: events; Owner: -
--

ALTER TABLE ONLY events.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: accounts accounts_account_code_key; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.accounts
    ADD CONSTRAINT accounts_account_code_key UNIQUE (account_code);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: ledger_entries ledger_entries_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.ledger_entries
    ADD CONSTRAINT ledger_entries_pkey PRIMARY KEY (id);


--
-- Name: ledger_transactions ledger_transactions_idempotency_key_key; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.ledger_transactions
    ADD CONSTRAINT ledger_transactions_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: ledger_transactions ledger_transactions_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.ledger_transactions
    ADD CONSTRAINT ledger_transactions_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: identity; Owner: -
--

ALTER TABLE ONLY identity.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: provider_event_processing provider_event_processing_pkey; Type: CONSTRAINT; Schema: integration; Owner: -
--

ALTER TABLE ONLY integration.provider_event_processing
    ADD CONSTRAINT provider_event_processing_pkey PRIMARY KEY (provider_event_id);


--
-- Name: provider_events provider_events_pkey; Type: CONSTRAINT; Schema: integration; Owner: -
--

ALTER TABLE ONLY integration.provider_events
    ADD CONSTRAINT provider_events_pkey PRIMARY KEY (id);


--
-- Name: provider_events uq_provider_event; Type: CONSTRAINT; Schema: integration; Owner: -
--

ALTER TABLE ONLY integration.provider_events
    ADD CONSTRAINT uq_provider_event UNIQUE (provider, provider_event_id);


--
-- Name: outbox_events outbox_events_pkey; Type: CONSTRAINT; Schema: system; Owner: -
--

ALTER TABLE ONLY system.outbox_events
    ADD CONSTRAINT outbox_events_pkey PRIMARY KEY (id);


--
-- Name: ticket_scan_attempts enforce_scan_immutability; Type: TRIGGER; Schema: events; Owner: -
--

CREATE TRIGGER enforce_scan_immutability BEFORE DELETE OR UPDATE ON events.ticket_scan_attempts FOR EACH ROW EXECUTE FUNCTION events.prevent_scan_mutation();


--
-- Name: ledger_entries enforce_ledger_immutability; Type: TRIGGER; Schema: finance; Owner: -
--

CREATE TRIGGER enforce_ledger_immutability BEFORE DELETE OR UPDATE ON finance.ledger_entries FOR EACH ROW EXECUTE FUNCTION finance.prevent_ledger_mutation();


--
-- Name: ticket_scan_attempts ticket_scan_attempts_event_id_fkey; Type: FK CONSTRAINT; Schema: events; Owner: -
--

ALTER TABLE ONLY events.ticket_scan_attempts
    ADD CONSTRAINT ticket_scan_attempts_event_id_fkey FOREIGN KEY (event_id) REFERENCES events.events(id);


--
-- Name: ticket_scan_attempts ticket_scan_attempts_scanner_id_fkey; Type: FK CONSTRAINT; Schema: events; Owner: -
--

ALTER TABLE ONLY events.ticket_scan_attempts
    ADD CONSTRAINT ticket_scan_attempts_scanner_id_fkey FOREIGN KEY (scanner_id) REFERENCES identity.users(id);


--
-- Name: ticket_scan_attempts ticket_scan_attempts_ticket_id_fkey; Type: FK CONSTRAINT; Schema: events; Owner: -
--

ALTER TABLE ONLY events.ticket_scan_attempts
    ADD CONSTRAINT ticket_scan_attempts_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES events.tickets(id);


--
-- Name: tickets tickets_event_id_fkey; Type: FK CONSTRAINT; Schema: events; Owner: -
--

ALTER TABLE ONLY events.tickets
    ADD CONSTRAINT tickets_event_id_fkey FOREIGN KEY (event_id) REFERENCES events.events(id);


--
-- Name: tickets tickets_order_id_fkey; Type: FK CONSTRAINT; Schema: events; Owner: -
--

ALTER TABLE ONLY events.tickets
    ADD CONSTRAINT tickets_order_id_fkey FOREIGN KEY (order_id) REFERENCES commerce.orders(id);


--
-- Name: ledger_entries ledger_entries_account_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.ledger_entries
    ADD CONSTRAINT ledger_entries_account_id_fkey FOREIGN KEY (account_id) REFERENCES finance.accounts(id) ON DELETE RESTRICT;


--
-- Name: ledger_entries ledger_entries_transaction_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.ledger_entries
    ADD CONSTRAINT ledger_entries_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES finance.ledger_transactions(id) ON DELETE RESTRICT;


--
-- Name: provider_event_processing provider_event_processing_provider_event_id_fkey; Type: FK CONSTRAINT; Schema: integration; Owner: -
--

ALTER TABLE ONLY integration.provider_event_processing
    ADD CONSTRAINT provider_event_processing_provider_event_id_fkey FOREIGN KEY (provider_event_id) REFERENCES integration.provider_events(id) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict 2sO9ArFIx52WEpig9dIeClS1LTmrkOrQdWgpRDMX5ez8oEQSpPBOubLNYZBJg32

