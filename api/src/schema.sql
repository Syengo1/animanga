


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


CREATE SCHEMA IF NOT EXISTS "commerce";


ALTER SCHEMA "commerce" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "content";


ALTER SCHEMA "content" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "events";


ALTER SCHEMA "events" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "finance";


ALTER SCHEMA "finance" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "identity";


ALTER SCHEMA "identity" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "integration";


ALTER SCHEMA "integration" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "citext" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "commerce"."merchants_status_enum" AS ENUM (
    'PENDING',
    'ACTIVE',
    'SUSPENDED',
    'CLOSED'
);


ALTER TYPE "commerce"."merchants_status_enum" OWNER TO "postgres";


CREATE TYPE "commerce"."order_items_item_type_enum" AS ENUM (
    'TICKET',
    'MERCH'
);


ALTER TYPE "commerce"."order_items_item_type_enum" OWNER TO "postgres";


CREATE TYPE "commerce"."orders_fulfillment_status_enum" AS ENUM (
    'UNFULFILLED',
    'PARTIALLY_FULFILLED',
    'FULFILLED',
    'CANCELLED'
);


ALTER TYPE "commerce"."orders_fulfillment_status_enum" OWNER TO "postgres";


CREATE TYPE "commerce"."orders_payment_status_enum" AS ENUM (
    'UNPAID',
    'PARTIALLY_PAID',
    'PAID'
);


ALTER TYPE "commerce"."orders_payment_status_enum" OWNER TO "postgres";


CREATE TYPE "commerce"."orders_refund_status_enum" AS ENUM (
    'NOT_REFUNDED',
    'PARTIALLY_REFUNDED',
    'FULLY_REFUNDED'
);


ALTER TYPE "commerce"."orders_refund_status_enum" OWNER TO "postgres";


CREATE TYPE "commerce"."payments_payment_method_enum" AS ENUM (
    'MPESA_STK',
    'MPESA_C2B',
    'CARD'
);


ALTER TYPE "commerce"."payments_payment_method_enum" OWNER TO "postgres";


CREATE TYPE "commerce"."payments_status_enum" AS ENUM (
    'PENDING',
    'AUTHORIZED',
    'COMPLETED',
    'FAILED',
    'REVERSED'
);


ALTER TYPE "commerce"."payments_status_enum" OWNER TO "postgres";


CREATE TYPE "commerce"."payout_requests_status_enum" AS ENUM (
    'REQUESTED',
    'APPROVED',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'CANCELLED'
);


ALTER TYPE "commerce"."payout_requests_status_enum" OWNER TO "postgres";


CREATE TYPE "commerce"."refunds_status_enum" AS ENUM (
    'REQUESTED',
    'UNDER_REVIEW',
    'APPROVED',
    'REJECTED',
    'PROCESSING',
    'COMPLETED',
    'FAILED'
);


ALTER TYPE "commerce"."refunds_status_enum" OWNER TO "postgres";


CREATE TYPE "content"."media_items_media_type_enum" AS ENUM (
    'ANIME',
    'MANGA'
);


ALTER TYPE "content"."media_items_media_type_enum" OWNER TO "postgres";


CREATE TYPE "content"."media_items_season_enum" AS ENUM (
    'WINTER',
    'SPRING',
    'SUMMER',
    'FALL'
);


ALTER TYPE "content"."media_items_season_enum" OWNER TO "postgres";


CREATE TYPE "content"."media_items_status_enum" AS ENUM (
    'FINISHED',
    'RELEASING',
    'NOT_YET_RELEASED',
    'CANCELLED',
    'HIATUS',
    'UNKNOWN'
);


ALTER TYPE "content"."media_items_status_enum" OWNER TO "postgres";


CREATE TYPE "events"."events_status_enum" AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'ON_SALE',
    'SOLD_OUT',
    'CANCELLED',
    'COMPLETED'
);


ALTER TYPE "events"."events_status_enum" OWNER TO "postgres";


CREATE TYPE "events"."signing_keys_status_enum" AS ENUM (
    'ACTIVE',
    'RETIRED',
    'REVOKED'
);


ALTER TYPE "events"."signing_keys_status_enum" OWNER TO "postgres";


CREATE TYPE "events"."ticket_deliveries_channel_enum" AS ENUM (
    'EMAIL',
    'SMS'
);


ALTER TYPE "events"."ticket_deliveries_channel_enum" OWNER TO "postgres";


CREATE TYPE "events"."ticket_deliveries_status_enum" AS ENUM (
    'PENDING',
    'PROCESSING',
    'SENT',
    'FAILED',
    'DEAD_LETTER'
);


ALTER TYPE "events"."ticket_deliveries_status_enum" OWNER TO "postgres";


CREATE TYPE "events"."ticket_reservations_status_enum" AS ENUM (
    'RESERVED',
    'SOLD',
    'EXPIRED',
    'RELEASED'
);


ALTER TYPE "events"."ticket_reservations_status_enum" OWNER TO "postgres";


CREATE TYPE "events"."ticket_scan_attempts_result_enum" AS ENUM (
    'VALID',
    'DUPLICATE',
    'REVOKED',
    'INVALID_SIGNATURE',
    'WRONG_EVENT',
    'EXPIRED',
    'INVALID_PAYLOAD',
    'KEY_REVOKED',
    'NOT_FOUND'
);


ALTER TYPE "events"."ticket_scan_attempts_result_enum" OWNER TO "postgres";


CREATE TYPE "events"."tickets_status_enum" AS ENUM (
    'ISSUED',
    'SCANNED',
    'REVOKED'
);


ALTER TYPE "events"."tickets_status_enum" OWNER TO "postgres";


CREATE TYPE "finance"."entry_direction" AS ENUM (
    'DEBIT',
    'CREDIT'
);


ALTER TYPE "finance"."entry_direction" OWNER TO "postgres";


CREATE TYPE "finance"."ledger_entries_direction_enum" AS ENUM (
    'DEBIT',
    'CREDIT'
);


ALTER TYPE "finance"."ledger_entries_direction_enum" OWNER TO "postgres";


CREATE TYPE "finance"."ledger_entry_input" AS (
	"account_id" "uuid",
	"direction" "finance"."entry_direction",
	"amount" numeric(19,4)
);


ALTER TYPE "finance"."ledger_entry_input" OWNER TO "postgres";


CREATE TYPE "identity"."external_identities_provider_enum" AS ENUM (
    'GOOGLE',
    'APPLE'
);


ALTER TYPE "identity"."external_identities_provider_enum" OWNER TO "postgres";


CREATE TYPE "identity"."kyc_profiles_verification_status_enum" AS ENUM (
    'UNVERIFIED',
    'VERIFIED',
    'SUSPENDED'
);


ALTER TYPE "identity"."kyc_profiles_verification_status_enum" OWNER TO "postgres";


CREATE TYPE "identity"."kyc_verification_cases_status_enum" AS ENUM (
    'OPEN',
    'UNDER_REVIEW',
    'APPROVED',
    'REJECTED',
    'CLOSED'
);


ALTER TYPE "identity"."kyc_verification_cases_status_enum" OWNER TO "postgres";


CREATE TYPE "identity"."role_assignments_scope_type_enum" AS ENUM (
    'GLOBAL',
    'MERCHANT',
    'EVENT'
);


ALTER TYPE "identity"."role_assignments_scope_type_enum" OWNER TO "postgres";


CREATE TYPE "identity"."users_status_enum" AS ENUM (
    'PENDING_EMAIL_VERIFICATION',
    'ACTIVE',
    'SUSPENDED',
    'DISABLED'
);


ALTER TYPE "identity"."users_status_enum" OWNER TO "postgres";


CREATE TYPE "integration"."outbox_messages_status_enum" AS ENUM (
    'PENDING',
    'PROCESSING',
    'PUBLISHED',
    'FAILED',
    'DEAD_LETTER'
);


ALTER TYPE "integration"."outbox_messages_status_enum" OWNER TO "postgres";


CREATE TYPE "integration"."provider_event_processing_status_enum" AS ENUM (
    'PENDING',
    'PROCESSING',
    'PROCESSED',
    'FAILED',
    'DEAD_LETTER'
);


ALTER TYPE "integration"."provider_event_processing_status_enum" OWNER TO "postgres";


CREATE TYPE "integration"."provider_transactions_status_enum" AS ENUM (
    'INITIATED',
    'PENDING',
    'COMPLETED',
    'FAILED',
    'REVERSED'
);


ALTER TYPE "integration"."provider_transactions_status_enum" OWNER TO "postgres";


CREATE TYPE "integration"."reconciliation_cases_exception_category_enum" AS ENUM (
    'AMOUNT_MISMATCH',
    'MISSING_INTERNAL_TRANSACTION',
    'MISSING_PROVIDER_TRANSACTION',
    'STATUS_MISMATCH',
    'UNEXPECTED_FEE'
);


ALTER TYPE "integration"."reconciliation_cases_exception_category_enum" OWNER TO "postgres";


CREATE TYPE "integration"."reconciliation_cases_status_enum" AS ENUM (
    'DISCOVERED',
    'MATCHING',
    'MATCHED',
    'EXCEPTION',
    'RESOLVED'
);


ALTER TYPE "integration"."reconciliation_cases_status_enum" OWNER TO "postgres";


CREATE TYPE "integration"."statement_imports_status_enum" AS ENUM (
    'PROCESSING',
    'COMPLETED',
    'FAILED'
);


ALTER TYPE "integration"."statement_imports_status_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "finance"."post_ledger_transaction"("p_tx_type" character varying, "p_ref_type" character varying, "p_ref_id" character varying, "p_idempotency_key" character varying, "p_currency" character varying, "p_entries" "finance"."ledger_entry_input"[], "p_request_hash" character DEFAULT '0000000000000000000000000000000000000000000000000000000000000000'::"bpchar", "p_reverses_tx_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'finance', 'public', 'pg_catalog'
    AS $$
DECLARE
    v_tx_id UUID;
    v_existing_hash CHAR(64);
    v_entry finance.ledger_entry_input;
    v_acct_currency VARCHAR(3);
    v_total_debit NUMERIC := 0;
    v_total_credit NUMERIC := 0;
BEGIN
    SELECT id, request_hash INTO v_tx_id, v_existing_hash
    FROM finance.ledger_transactions
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
        IF v_existing_hash != p_request_hash THEN
            RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT: Key reused with mismatched payload';
        END IF;
        RETURN v_tx_id;
    END IF;

    FOREACH v_entry IN ARRAY p_entries LOOP
        SELECT currency INTO v_acct_currency FROM finance.accounts WHERE id = v_entry.account_id;
        IF v_acct_currency != p_currency THEN
            RAISE EXCEPTION 'CURRENCY_MISMATCH: Cannot post % transaction to % account', p_currency, v_acct_currency;
        END IF;
        IF v_entry.direction = 'DEBIT' THEN
            v_total_debit := v_total_debit + v_entry.amount;
        ELSIF v_entry.direction = 'CREDIT' THEN
            v_total_credit := v_total_credit + v_entry.amount;
        END IF;
    END LOOP;

    IF v_total_debit != v_total_credit THEN
        RAISE EXCEPTION 'Ledger imbalance: Debits (%) != Credits (%)', v_total_debit, v_total_credit;
    END IF;

    INSERT INTO finance.ledger_transactions (
        transaction_type, reference_type, reference_id, idempotency_key, request_hash, currency, reverses_transaction_id
    ) VALUES (
        p_tx_type, p_ref_type, p_ref_id, p_idempotency_key, p_request_hash, p_currency, p_reverses_tx_id
    ) RETURNING id INTO v_tx_id;

    FOREACH v_entry IN ARRAY p_entries LOOP
        INSERT INTO finance.ledger_entries (transaction_id, account_id, direction, amount)
        VALUES (v_tx_id, v_entry.account_id, v_entry.direction::text::finance.ledger_entries_direction_enum, v_entry.amount);
    END LOOP;

    RETURN v_tx_id;
END;
$$;


ALTER FUNCTION "finance"."post_ledger_transaction"("p_tx_type" character varying, "p_ref_type" character varying, "p_ref_id" character varying, "p_idempotency_key" character varying, "p_currency" character varying, "p_entries" "finance"."ledger_entry_input"[], "p_request_hash" character, "p_reverses_tx_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "finance"."prevent_update_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RAISE EXCEPTION 'Record in %.% is strictly immutable (append-only)', TG_TABLE_SCHEMA, TG_TABLE_NAME;
END;
$$;


ALTER FUNCTION "finance"."prevent_update_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."uuid_generate_v4"() RETURNS "uuid"
    LANGUAGE "sql" IMMUTABLE PARALLEL SAFE
    AS $$
  SELECT gen_random_uuid();
$$;


ALTER FUNCTION "public"."uuid_generate_v4"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "commerce"."merchants" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "business_name" character varying(255) NOT NULL,
    "operating_currency" character(3) DEFAULT 'KES'::"bpchar" NOT NULL,
    "status" "commerce"."merchants_status_enum" DEFAULT 'PENDING'::"commerce"."merchants_status_enum" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp without time zone,
    "owner_user_id" "uuid"
);


ALTER TABLE "commerce"."merchants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "commerce"."order_items" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "item_type" "commerce"."order_items_item_type_enum" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "quantity" integer NOT NULL,
    "price_per_unit" numeric(19,4) NOT NULL,
    "currency" character(3) NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "order_id" "uuid"
);


ALTER TABLE "commerce"."order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "commerce"."orders" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "order_number" character varying(50) NOT NULL,
    "gross_amount" numeric(19,4) NOT NULL,
    "currency" character(3) NOT NULL,
    "payment_status" "commerce"."orders_payment_status_enum" DEFAULT 'UNPAID'::"commerce"."orders_payment_status_enum" NOT NULL,
    "fulfillment_status" "commerce"."orders_fulfillment_status_enum" DEFAULT 'UNFULFILLED'::"commerce"."orders_fulfillment_status_enum" NOT NULL,
    "refund_status" "commerce"."orders_refund_status_enum" DEFAULT 'NOT_REFUNDED'::"commerce"."orders_refund_status_enum" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "customer_id" "uuid",
    "merchant_id" "uuid"
);


ALTER TABLE "commerce"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "commerce"."payments" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "amount" numeric(19,4) NOT NULL,
    "currency" character(3) NOT NULL,
    "status" "commerce"."payments_status_enum" DEFAULT 'PENDING'::"commerce"."payments_status_enum" NOT NULL,
    "payment_method" "commerce"."payments_payment_method_enum" NOT NULL,
    "provider" character varying(50) NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "order_id" "uuid"
);


ALTER TABLE "commerce"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "commerce"."payout_requests" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "payout_number" character varying(50) NOT NULL,
    "amount" numeric(19,4) NOT NULL,
    "currency" character(3) NOT NULL,
    "destination_reference" "text" NOT NULL,
    "status" "commerce"."payout_requests_status_enum" DEFAULT 'REQUESTED'::"commerce"."payout_requests_status_enum" NOT NULL,
    "approved_at" timestamp with time zone,
    "payout_ledger_tx_id" "uuid",
    "provider_transaction_id" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "merchant_id" "uuid",
    "requested_by" "uuid",
    "approved_by" "uuid"
);


ALTER TABLE "commerce"."payout_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "commerce"."refunds" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "refund_number" character varying(50) NOT NULL,
    "amount" numeric(19,4) NOT NULL,
    "currency" character(3) NOT NULL,
    "status" "commerce"."refunds_status_enum" DEFAULT 'REQUESTED'::"commerce"."refunds_status_enum" NOT NULL,
    "reason" "text",
    "original_payment_ledger_tx_id" "uuid",
    "reversal_ledger_tx_id" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "order_id" "uuid",
    "requested_by" "uuid",
    "approved_by" "uuid"
);


ALTER TABLE "commerce"."refunds" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "content"."media_discovery_scores" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "feed_key" character varying(50) NOT NULL,
    "algorithm_version" character varying(50) NOT NULL,
    "raw_popularity" integer DEFAULT 0 NOT NULL,
    "popularity_score" numeric(5,4) DEFAULT '0'::numeric NOT NULL,
    "urgency_score" numeric(5,4) DEFAULT '0'::numeric NOT NULL,
    "recency_score" numeric(5,4) DEFAULT '0'::numeric NOT NULL,
    "trend_score" numeric(5,4) DEFAULT '0'::numeric NOT NULL,
    "editorial_score" numeric(5,4) DEFAULT '0'::numeric NOT NULL,
    "final_score" numeric(8,4) DEFAULT '0'::numeric NOT NULL,
    "rank" integer,
    "calculated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "valid_until" timestamp with time zone,
    "media_id" "uuid"
);


ALTER TABLE "content"."media_discovery_scores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "content"."media_editorial_overrides" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "feed_key" character varying(50) NOT NULL,
    "weight" integer DEFAULT 0 NOT NULL,
    "multiplier" numeric(5,2) DEFAULT '1'::numeric NOT NULL,
    "reason" "text",
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "media_id" "uuid"
);


ALTER TABLE "content"."media_editorial_overrides" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "content"."media_items" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "provider" character varying(50) NOT NULL,
    "external_id" character varying(100) NOT NULL,
    "media_type" "content"."media_items_media_type_enum" NOT NULL,
    "title_romaji" character varying(500),
    "title_english" character varying(500),
    "title_native" character varying(500),
    "synopsis" "text",
    "status" "content"."media_items_status_enum" DEFAULT 'UNKNOWN'::"content"."media_items_status_enum" NOT NULL,
    "season" "content"."media_items_season_enum",
    "season_year" integer,
    "cover_image_url" "text",
    "banner_image_url" "text",
    "color_hex" character varying(20),
    "episodes" integer,
    "chapters" integer,
    "volumes" integer,
    "genres" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "average_score" numeric(5,2),
    "popularity" integer DEFAULT 0,
    "is_adult" boolean DEFAULT false NOT NULL,
    "start_date" timestamp with time zone,
    "end_date" timestamp with time zone,
    "format" character varying(50),
    "duration" integer,
    "source_updated_at" timestamp with time zone,
    "last_synced_at" timestamp with time zone,
    "provider_metadata" "jsonb",
    "next_airing_at" timestamp with time zone,
    "next_airing_episode" integer,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "content"."media_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "content"."media_trend_snapshots" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "provider" character varying(50) NOT NULL,
    "snapshot_date" "date" NOT NULL,
    "trending" integer DEFAULT 0 NOT NULL,
    "popularity" integer DEFAULT 0 NOT NULL,
    "average_score" numeric(5,2),
    "in_progress" integer DEFAULT 0 NOT NULL,
    "releasing" integer DEFAULT 0 NOT NULL,
    "episode" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "media_id" "uuid"
);


ALTER TABLE "content"."media_trend_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "events"."events" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "title" character varying(255) NOT NULL,
    "description" "text",
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "currency" character(3) NOT NULL,
    "status" "events"."events_status_enum" DEFAULT 'DRAFT'::"events"."events_status_enum" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp without time zone,
    "merchant_id" "uuid"
);


ALTER TABLE "events"."events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "events"."signing_keys" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "algorithm" character varying(50) DEFAULT 'Ed25519'::character varying NOT NULL,
    "public_key" "text" NOT NULL,
    "status" "events"."signing_keys_status_enum" DEFAULT 'ACTIVE'::"events"."signing_keys_status_enum" NOT NULL,
    "valid_from" timestamp with time zone DEFAULT "now"() NOT NULL,
    "valid_to" timestamp with time zone,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "events"."signing_keys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "events"."ticket_deliveries" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "channel" "events"."ticket_deliveries_channel_enum" NOT NULL,
    "destination" character varying NOT NULL,
    "status" "events"."ticket_deliveries_status_enum" DEFAULT 'PENDING'::"events"."ticket_deliveries_status_enum" NOT NULL,
    "attempt_count" integer DEFAULT 0 NOT NULL,
    "provider_message_id" character varying,
    "last_error" "text",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "events"."ticket_deliveries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "events"."ticket_inventory" (
    "ticket_type_id" "uuid" NOT NULL,
    "capacity" integer NOT NULL,
    "available_quantity" integer NOT NULL,
    "reserved_quantity" integer DEFAULT 0 NOT NULL,
    "sold_quantity" integer DEFAULT 0 NOT NULL,
    "version" integer NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ticket_inventory_capacity_math_check" CHECK ((("capacity" >= 0) AND ("available_quantity" >= 0) AND ("reserved_quantity" >= 0) AND ("sold_quantity" >= 0) AND ((("available_quantity" + "reserved_quantity") + "sold_quantity") = "capacity")))
);


ALTER TABLE "events"."ticket_inventory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "events"."ticket_reservations" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "checkout_session_id" "uuid" NOT NULL,
    "quantity" integer NOT NULL,
    "status" "events"."ticket_reservations_status_enum" DEFAULT 'RESERVED'::"events"."ticket_reservations_status_enum" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "released_at" timestamp with time zone,
    "ticket_type_id" "uuid",
    "order_id" "uuid"
);


ALTER TABLE "events"."ticket_reservations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "events"."ticket_scan_attempts" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "ticket_id" "uuid",
    "event_id" "uuid" NOT NULL,
    "scanner_user_id" "uuid",
    "result" "events"."ticket_scan_attempts_result_enum" NOT NULL,
    "gate_id" character varying(100),
    "raw_payload" "jsonb",
    "raw_signature" "text",
    "latitude" numeric(10,7),
    "longitude" numeric(10,7),
    "device_id" "text",
    "app_version" character varying(50),
    "network_status" character varying(20),
    "sync_sequence" bigint,
    "scanned_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "events"."ticket_scan_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "events"."ticket_types" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "name" character varying(150) NOT NULL,
    "price" numeric(19,4) NOT NULL,
    "currency" character(3) NOT NULL,
    "capacity" integer NOT NULL,
    "sales_cutoff" timestamp with time zone,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp without time zone,
    "event_id" "uuid"
);


ALTER TABLE "events"."ticket_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "events"."tickets" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "order_item_id" "uuid" NOT NULL,
    "event_id" "uuid" NOT NULL,
    "sequence_number" integer NOT NULL,
    "status" "events"."tickets_status_enum" DEFAULT 'ISSUED'::"events"."tickets_status_enum" NOT NULL,
    "qr_payload" "jsonb" NOT NULL,
    "signature" "text" NOT NULL,
    "signing_key_id" "uuid" NOT NULL,
    "issued_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "ticket_type_id" "uuid"
);


ALTER TABLE "events"."tickets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "finance"."accounts" (
    "id" "uuid" NOT NULL,
    "account_code" character varying(50) NOT NULL,
    "account_type" character varying(50) NOT NULL,
    "classification" character varying(50) NOT NULL,
    "currency" character varying(3) NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "finance"."accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "finance"."ledger_entries" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "direction" "finance"."ledger_entries_direction_enum" NOT NULL,
    "amount" numeric(19,4) NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "transaction_id" "uuid",
    "account_id" "uuid",
    CONSTRAINT "ledger_entries_positive_amount_check" CHECK (("amount" > (0)::numeric))
);


ALTER TABLE "finance"."ledger_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "finance"."ledger_transactions" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "transaction_type" character varying NOT NULL,
    "reference_type" character varying NOT NULL,
    "reference_id" character varying NOT NULL,
    "idempotency_key" character varying NOT NULL,
    "request_hash" character(64) NOT NULL,
    "currency" character varying DEFAULT 'KES'::character varying NOT NULL,
    "reverses_transaction_id" "uuid",
    "status" character varying DEFAULT 'POSTED'::character varying NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "finance"."ledger_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "identity"."audit_log" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "action" character varying(150) NOT NULL,
    "entity_type" character varying(100),
    "entity_id" "uuid",
    "metadata" "jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "actor_user_id" "uuid"
);


ALTER TABLE "identity"."audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "identity"."email_verification_tokens" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "token_hash" character(64) NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used_at" timestamp with time zone,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid"
);


ALTER TABLE "identity"."email_verification_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "identity"."external_identities" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "provider" "identity"."external_identities_provider_enum" NOT NULL,
    "provider_subject" character varying NOT NULL,
    "provider_email" "public"."citext",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid"
);


ALTER TABLE "identity"."external_identities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "identity"."kyc_documents" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "document_type" character varying(100) NOT NULL,
    "document_storage_key" "text" NOT NULL,
    "document_sha256" character(64) NOT NULL,
    "uploaded_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "kyc_profile_id" "uuid"
);


ALTER TABLE "identity"."kyc_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "identity"."kyc_profiles" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "legal_name" character varying(255) NOT NULL,
    "kra_pin_hash" "text",
    "verification_status" "identity"."kyc_profiles_verification_status_enum" DEFAULT 'UNVERIFIED'::"identity"."kyc_profiles_verification_status_enum" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid"
);


ALTER TABLE "identity"."kyc_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "identity"."kyc_verification_cases" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "status" "identity"."kyc_verification_cases_status_enum" NOT NULL,
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "kyc_profile_id" "uuid",
    "reviewer_id" "uuid"
);


ALTER TABLE "identity"."kyc_verification_cases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "identity"."password_credentials" (
    "user_id" "uuid" NOT NULL,
    "password_hash" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "identity"."password_credentials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "identity"."permissions" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "code" character varying(150) NOT NULL,
    "name" character varying(200) NOT NULL,
    "description" "text",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "identity"."permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "identity"."role_assignments" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "scope_type" "identity"."role_assignments_scope_type_enum" NOT NULL,
    "scope_id" "uuid",
    "assigned_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid",
    "role_id" "uuid",
    "assigned_by" "uuid"
);


ALTER TABLE "identity"."role_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "identity"."role_permissions" (
    "role_id" "uuid" NOT NULL,
    "permission_id" "uuid" NOT NULL
);


ALTER TABLE "identity"."role_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "identity"."roles" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "code" character varying(100) NOT NULL,
    "name" character varying(150) NOT NULL,
    "description" "text",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "identity"."roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "identity"."sessions" (
    "id" character(64) NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "ip_address" "inet",
    "user_agent" "text",
    "is_revoked" boolean DEFAULT false NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid"
);


ALTER TABLE "identity"."sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "identity"."users" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "username" character varying(50) NOT NULL,
    "email" "public"."citext" NOT NULL,
    "first_name" character varying(100),
    "last_name" character varying(100),
    "phone" character varying(30),
    "status" "identity"."users_status_enum" DEFAULT 'PENDING_EMAIL_VERIFICATION'::"identity"."users_status_enum" NOT NULL,
    "email_verified_at" timestamp with time zone,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "identity"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "integration"."outbox_messages" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "aggregate_type" character varying(100) NOT NULL,
    "aggregate_id" "uuid" NOT NULL,
    "event_type" character varying(150) NOT NULL,
    "payload" "jsonb" NOT NULL,
    "status" "integration"."outbox_messages_status_enum" DEFAULT 'PENDING'::"integration"."outbox_messages_status_enum" NOT NULL,
    "deduplication_key" character varying(255) NOT NULL,
    "attempt_count" integer DEFAULT 0 NOT NULL,
    "next_attempt_at" timestamp with time zone NOT NULL,
    "published_at" timestamp with time zone,
    "last_error" "text",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "integration"."outbox_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "integration"."provider_event_processing" (
    "provider_event_id" "uuid" NOT NULL,
    "status" "integration"."provider_event_processing_status_enum" DEFAULT 'PENDING'::"integration"."provider_event_processing_status_enum" NOT NULL,
    "attempt_count" integer DEFAULT 0 NOT NULL,
    "started_at" timestamp with time zone,
    "processed_at" timestamp with time zone,
    "last_error" "text",
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "integration"."provider_event_processing" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "integration"."provider_events" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "provider" character varying(50) NOT NULL,
    "provider_event_id" character varying(255) NOT NULL,
    "event_type" character varying(100) NOT NULL,
    "idempotency_key" character varying(500) NOT NULL,
    "payload_hash" character(64) NOT NULL,
    "raw_payload" "jsonb" NOT NULL,
    "received_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "provider_transaction_id" "uuid"
);


ALTER TABLE "integration"."provider_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "integration"."provider_transactions" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "provider" character varying(50) NOT NULL,
    "provider_transaction_id" character varying(255) NOT NULL,
    "amount" numeric(19,4) NOT NULL,
    "currency" character(3) NOT NULL,
    "status" "integration"."provider_transactions_status_enum" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "internal_payment_id" "uuid"
);


ALTER TABLE "integration"."provider_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "integration"."reconciliation_cases" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "status" "integration"."reconciliation_cases_status_enum" DEFAULT 'DISCOVERED'::"integration"."reconciliation_cases_status_enum" NOT NULL,
    "exception_category" "integration"."reconciliation_cases_exception_category_enum",
    "notes" "text",
    "resolved_at" timestamp with time zone,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "resolved_by" "uuid"
);


ALTER TABLE "integration"."reconciliation_cases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "integration"."reconciliation_matches" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "ledger_transaction_id" "uuid",
    "matched_amount" numeric(19,4) NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "reconciliation_case_id" "uuid",
    "statement_line_id" "uuid"
);


ALTER TABLE "integration"."reconciliation_matches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "integration"."statement_imports" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "provider" character varying(50) NOT NULL,
    "provider_account" character varying(255),
    "period_start" timestamp with time zone,
    "period_end" timestamp with time zone,
    "file_hash" character(64) NOT NULL,
    "imported_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "status" "integration"."statement_imports_status_enum" DEFAULT 'PROCESSING'::"integration"."statement_imports_status_enum" NOT NULL,
    "imported_by" "uuid"
);


ALTER TABLE "integration"."statement_imports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "integration"."statement_lines" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "provider" character varying(50) NOT NULL,
    "provider_statement_id" character varying(255) NOT NULL,
    "provider_transaction_id" character varying(255) NOT NULL,
    "reference" character varying(255),
    "amount" numeric(19,4) NOT NULL,
    "currency" character(3) NOT NULL,
    "transaction_type" character varying(100),
    "occurred_at" timestamp with time zone,
    "settled_at" timestamp with time zone,
    "statement_hash" character(64) NOT NULL,
    "raw_payload" "jsonb",
    "imported_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "statement_import_id" "uuid"
);


ALTER TABLE "integration"."statement_lines" OWNER TO "postgres";


ALTER TABLE ONLY "commerce"."order_items"
    ADD CONSTRAINT "PK_005269d8574e6fac0493715c308" PRIMARY KEY ("id");



ALTER TABLE ONLY "commerce"."payments"
    ADD CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id");



ALTER TABLE ONLY "commerce"."payout_requests"
    ADD CONSTRAINT "PK_3a6acb302f56ad7dadda35c86b8" PRIMARY KEY ("id");



ALTER TABLE ONLY "commerce"."merchants"
    ADD CONSTRAINT "PK_4fd312ef25f8e05ad47bfe7ed25" PRIMARY KEY ("id");



ALTER TABLE ONLY "commerce"."refunds"
    ADD CONSTRAINT "PK_5106efb01eeda7e49a78b869738" PRIMARY KEY ("id");



ALTER TABLE ONLY "commerce"."orders"
    ADD CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id");



ALTER TABLE ONLY "commerce"."payout_requests"
    ADD CONSTRAINT "UQ_598a659a7c426a2f57701711421" UNIQUE ("payout_number");



ALTER TABLE ONLY "commerce"."orders"
    ADD CONSTRAINT "UQ_75eba1c6b1a66b09f2a97e6927b" UNIQUE ("order_number");



ALTER TABLE ONLY "commerce"."refunds"
    ADD CONSTRAINT "UQ_fc141a23aa0c9ec7671d4b7ac15" UNIQUE ("refund_number");



ALTER TABLE ONLY "content"."media_discovery_scores"
    ADD CONSTRAINT "PK_070554fbcb15551259c0c59a216" PRIMARY KEY ("id");



ALTER TABLE ONLY "content"."media_editorial_overrides"
    ADD CONSTRAINT "PK_2e84584016ad0d4c41a9a51213e" PRIMARY KEY ("id");



ALTER TABLE ONLY "content"."media_items"
    ADD CONSTRAINT "PK_c23c721eba990b8d9c28c48592c" PRIMARY KEY ("id");



ALTER TABLE ONLY "content"."media_trend_snapshots"
    ADD CONSTRAINT "PK_de0919a5b80338218372d50bdc2" PRIMARY KEY ("id");



ALTER TABLE ONLY "content"."media_discovery_scores"
    ADD CONSTRAINT "uq_media_feed" UNIQUE ("media_id", "feed_key");



ALTER TABLE ONLY "content"."media_trend_snapshots"
    ADD CONSTRAINT "uq_provider_media_date" UNIQUE ("provider", "media_id", "snapshot_date");



ALTER TABLE ONLY "events"."tickets"
    ADD CONSTRAINT "PK_343bc942ae261cf7a1377f48fd0" PRIMARY KEY ("id");



ALTER TABLE ONLY "events"."ticket_deliveries"
    ADD CONSTRAINT "PK_358943f6b12ba6aeeb51f07a13c" PRIMARY KEY ("id");



ALTER TABLE ONLY "events"."ticket_scan_attempts"
    ADD CONSTRAINT "PK_359cd2da9b28648faf840af5e24" PRIMARY KEY ("id");



ALTER TABLE ONLY "events"."events"
    ADD CONSTRAINT "PK_40731c7151fe4be3116e45ddf73" PRIMARY KEY ("id");



ALTER TABLE ONLY "events"."ticket_types"
    ADD CONSTRAINT "PK_5510ce7e18a4edc648c9fbfc283" PRIMARY KEY ("id");



ALTER TABLE ONLY "events"."signing_keys"
    ADD CONSTRAINT "PK_ab7d78cf6e61dc3904133b4cd55" PRIMARY KEY ("id");



ALTER TABLE ONLY "events"."ticket_inventory"
    ADD CONSTRAINT "PK_edf963f535eea8f46e6eae132e3" PRIMARY KEY ("ticket_type_id");



ALTER TABLE ONLY "events"."ticket_reservations"
    ADD CONSTRAINT "PK_f2ba95022c4304afa7891fdd3e9" PRIMARY KEY ("id");



ALTER TABLE ONLY "events"."ticket_deliveries"
    ADD CONSTRAINT "UQ_a7332b026796234b9b161deff33" UNIQUE ("ticket_id", "channel");



ALTER TABLE ONLY "events"."tickets"
    ADD CONSTRAINT "UQ_ad5a220d4d44ac4851c1a2c1574" UNIQUE ("order_item_id", "sequence_number");



ALTER TABLE ONLY "events"."ticket_reservations"
    ADD CONSTRAINT "UQ_bf222bfd6e0688e02f68723cc22" UNIQUE ("checkout_session_id");



ALTER TABLE ONLY "finance"."accounts"
    ADD CONSTRAINT "PK_5a7a02c20412299d198e097a8fe" PRIMARY KEY ("id");



ALTER TABLE ONLY "finance"."ledger_transactions"
    ADD CONSTRAINT "PK_633d103c9e415d615aacf9b1929" PRIMARY KEY ("id");



ALTER TABLE ONLY "finance"."ledger_entries"
    ADD CONSTRAINT "PK_6efcb84411d3f08b08450ae75d5" PRIMARY KEY ("id");



ALTER TABLE ONLY "finance"."ledger_transactions"
    ADD CONSTRAINT "UQ_01ff7d3a76be6b7ca5fd33761d4" UNIQUE ("idempotency_key");



ALTER TABLE ONLY "finance"."accounts"
    ADD CONSTRAINT "UQ_ea1a16a9d7f135b0b67c0c8fede" UNIQUE ("account_code");



ALTER TABLE ONLY "identity"."kyc_documents"
    ADD CONSTRAINT "PK_02e49877f1578e6285f84e57ab6" PRIMARY KEY ("id");



ALTER TABLE ONLY "identity"."audit_log"
    ADD CONSTRAINT "PK_07fefa57f7f5ab8fc3f52b3ed0b" PRIMARY KEY ("id");



ALTER TABLE ONLY "identity"."role_permissions"
    ADD CONSTRAINT "PK_25d24010f53bb80b78e412c9656" PRIMARY KEY ("role_id", "permission_id");



ALTER TABLE ONLY "identity"."sessions"
    ADD CONSTRAINT "PK_3238ef96f18b355b671619111bc" PRIMARY KEY ("id");



ALTER TABLE ONLY "identity"."email_verification_tokens"
    ADD CONSTRAINT "PK_417a095bbed21c2369a6a01ab9a" PRIMARY KEY ("id");



ALTER TABLE ONLY "identity"."kyc_verification_cases"
    ADD CONSTRAINT "PK_550f89baa4a44064856dcd814b3" PRIMARY KEY ("id");



ALTER TABLE ONLY "identity"."external_identities"
    ADD CONSTRAINT "PK_85d174f9b82602686b4b3846fc4" PRIMARY KEY ("id");



ALTER TABLE ONLY "identity"."permissions"
    ADD CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY ("id");



ALTER TABLE ONLY "identity"."kyc_profiles"
    ADD CONSTRAINT "PK_94a340b98061b0cd7542d98e4b1" PRIMARY KEY ("id");



ALTER TABLE ONLY "identity"."password_credentials"
    ADD CONSTRAINT "PK_9b6358b8110bfd9267608e85e0d" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "identity"."users"
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id");



ALTER TABLE ONLY "identity"."roles"
    ADD CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id");



ALTER TABLE ONLY "identity"."role_assignments"
    ADD CONSTRAINT "PK_fc2df9835ac1d2a34839f113783" PRIMARY KEY ("id");



ALTER TABLE ONLY "identity"."kyc_profiles"
    ADD CONSTRAINT "REL_7e386a6324a0e96ca89a27afec" UNIQUE ("user_id");



ALTER TABLE ONLY "identity"."external_identities"
    ADD CONSTRAINT "UQ_24f065e9bb57382ca3c8a3c935b" UNIQUE ("provider", "provider_subject");



ALTER TABLE ONLY "identity"."permissions"
    ADD CONSTRAINT "UQ_8dad765629e83229da6feda1c1d" UNIQUE ("code");



ALTER TABLE ONLY "identity"."users"
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email");



ALTER TABLE ONLY "identity"."email_verification_tokens"
    ADD CONSTRAINT "UQ_c20ed35f3d31d486aabcd0564da" UNIQUE ("token_hash");



ALTER TABLE ONLY "identity"."roles"
    ADD CONSTRAINT "UQ_f6d54f95c31b73fb1bdd8e91d0c" UNIQUE ("code");



ALTER TABLE ONLY "identity"."users"
    ADD CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username");



ALTER TABLE ONLY "integration"."outbox_messages"
    ADD CONSTRAINT "PK_0171348f527c64b137e4d4f5b66" PRIMARY KEY ("id");



ALTER TABLE ONLY "integration"."reconciliation_cases"
    ADD CONSTRAINT "PK_093a79938779c84eee70bda7f66" PRIMARY KEY ("id");



ALTER TABLE ONLY "integration"."reconciliation_matches"
    ADD CONSTRAINT "PK_2ab553fffe4b51b1bc568397cec" PRIMARY KEY ("id");



ALTER TABLE ONLY "integration"."provider_transactions"
    ADD CONSTRAINT "PK_2d64b08550452a96fccc7905e48" PRIMARY KEY ("id");



ALTER TABLE ONLY "integration"."statement_lines"
    ADD CONSTRAINT "PK_56ba8ab3b9e455e5a732c60a543" PRIMARY KEY ("id");



ALTER TABLE ONLY "integration"."provider_event_processing"
    ADD CONSTRAINT "PK_946176b4ba68704ec2b2780876c" PRIMARY KEY ("provider_event_id");



ALTER TABLE ONLY "integration"."provider_events"
    ADD CONSTRAINT "PK_d882a90f8c8180b9bdae9af62eb" PRIMARY KEY ("id");



ALTER TABLE ONLY "integration"."statement_imports"
    ADD CONSTRAINT "PK_e883b7cf21565d3df9baf3c2550" PRIMARY KEY ("id");



ALTER TABLE ONLY "integration"."outbox_messages"
    ADD CONSTRAINT "UQ_803aace7de3adf374430240ff13" UNIQUE ("deduplication_key");



CREATE INDEX "idx_orders_customer" ON "commerce"."orders" USING "btree" ("customer_id");



CREATE INDEX "idx_orders_merchant" ON "commerce"."orders" USING "btree" ("merchant_id");



CREATE UNIQUE INDEX "IDX_c3ce53c41c47f61cc90d2a7840" ON "content"."media_items" USING "btree" ("provider", "external_id");



CREATE INDEX "idx_discovery_scores_feed_rank" ON "content"."media_discovery_scores" USING "btree" ("feed_key", "rank");



CREATE INDEX "idx_media_catalog_type_pop" ON "content"."media_items" USING "btree" ("media_type", "is_adult", "status", "popularity" DESC);



CREATE INDEX "idx_media_genres_gin" ON "content"."media_items" USING "gin" ("genres");



CREATE INDEX "idx_media_seasonal" ON "content"."media_items" USING "btree" ("media_type", "season", "season_year", "status", "popularity" DESC);



CREATE INDEX "idx_media_upcoming" ON "content"."media_items" USING "btree" ("media_type", "status", "start_date", "popularity" DESC);



CREATE INDEX "idx_ticket_reservations_expiry" ON "events"."ticket_reservations" USING "btree" ("status", "expires_at") WHERE ("status" = 'RESERVED'::"events"."ticket_reservations_status_enum");



CREATE INDEX "idx_tickets_order_id" ON "events"."tickets" USING "btree" ("order_id");



CREATE UNIQUE INDEX "uq_ledger_single_payment" ON "finance"."ledger_transactions" USING "btree" ("reference_type", "reference_id") WHERE ((("transaction_type")::"text" = 'CUSTOMER_PAYMENT'::"text") AND (("status")::"text" = 'POSTED'::"text"));



CREATE INDEX "IDX_17022daf3f885f7d35423e9971" ON "identity"."role_permissions" USING "btree" ("permission_id");



CREATE INDEX "IDX_178199805b901ccd220ab7740e" ON "identity"."role_permissions" USING "btree" ("role_id");



CREATE INDEX "idx_sessions_user_id" ON "identity"."sessions" USING "btree" ("user_id") WHERE ("is_revoked" = false);



CREATE UNIQUE INDEX "uq_role_assignment_global" ON "identity"."role_assignments" USING "btree" ("user_id", "role_id", "scope_type") WHERE ("scope_type" = 'GLOBAL'::"identity"."role_assignments_scope_type_enum");



CREATE UNIQUE INDEX "uq_role_assignment_scoped" ON "identity"."role_assignments" USING "btree" ("user_id", "role_id", "scope_type", "scope_id") WHERE ("scope_type" = ANY (ARRAY['MERCHANT'::"identity"."role_assignments_scope_type_enum", 'EVENT'::"identity"."role_assignments_scope_type_enum"]));



CREATE INDEX "idx_outbox_dispatch" ON "integration"."outbox_messages" USING "btree" ("status", "next_attempt_at", "created_at") WHERE ("status" = ANY (ARRAY['PENDING'::"integration"."outbox_messages_status_enum", 'FAILED'::"integration"."outbox_messages_status_enum", 'PROCESSING'::"integration"."outbox_messages_status_enum"]));



CREATE OR REPLACE TRIGGER "enforce_scans_immutability" BEFORE DELETE OR UPDATE ON "events"."ticket_scan_attempts" FOR EACH ROW EXECUTE FUNCTION "finance"."prevent_update_delete"();



CREATE OR REPLACE TRIGGER "enforce_entry_immutability" BEFORE DELETE OR UPDATE ON "finance"."ledger_entries" FOR EACH ROW EXECUTE FUNCTION "finance"."prevent_update_delete"();



CREATE OR REPLACE TRIGGER "enforce_tx_immutability" BEFORE DELETE OR UPDATE ON "finance"."ledger_transactions" FOR EACH ROW EXECUTE FUNCTION "finance"."prevent_update_delete"();



CREATE OR REPLACE TRIGGER "enforce_audit_log_immutability" BEFORE DELETE OR UPDATE ON "identity"."audit_log" FOR EACH ROW EXECUTE FUNCTION "finance"."prevent_update_delete"();



CREATE OR REPLACE TRIGGER "enforce_provider_events_immutability" BEFORE DELETE OR UPDATE ON "integration"."provider_events" FOR EACH ROW EXECUTE FUNCTION "finance"."prevent_update_delete"();



ALTER TABLE ONLY "commerce"."order_items"
    ADD CONSTRAINT "FK_145532db85752b29c57d2b7b1f1" FOREIGN KEY ("order_id") REFERENCES "commerce"."orders"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "commerce"."orders"
    ADD CONSTRAINT "FK_2474866c8f8e9196ff227a7cbbd" FOREIGN KEY ("merchant_id") REFERENCES "commerce"."merchants"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "commerce"."payout_requests"
    ADD CONSTRAINT "FK_3179eb6a30c74ca38fbd4e8e47a" FOREIGN KEY ("merchant_id") REFERENCES "commerce"."merchants"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "commerce"."payout_requests"
    ADD CONSTRAINT "FK_3fc79db0df1b12f6de641eef380" FOREIGN KEY ("approved_by") REFERENCES "identity"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "commerce"."merchants"
    ADD CONSTRAINT "FK_601b7984c109a454f72d1f1029f" FOREIGN KEY ("owner_user_id") REFERENCES "identity"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "commerce"."orders"
    ADD CONSTRAINT "FK_772d0ce0473ac2ccfa26060dbe9" FOREIGN KEY ("customer_id") REFERENCES "identity"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "commerce"."refunds"
    ADD CONSTRAINT "FK_82ec9e8f74e6d5fe919be143a03" FOREIGN KEY ("requested_by") REFERENCES "identity"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "commerce"."refunds"
    ADD CONSTRAINT "FK_a42db6369017df60549539f5567" FOREIGN KEY ("order_id") REFERENCES "commerce"."orders"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "commerce"."payments"
    ADD CONSTRAINT "FK_b2f7b823a21562eeca20e72b006" FOREIGN KEY ("order_id") REFERENCES "commerce"."orders"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "commerce"."payout_requests"
    ADD CONSTRAINT "FK_f7d1dfbc8ee96ebf75d853e76ea" FOREIGN KEY ("requested_by") REFERENCES "identity"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "commerce"."refunds"
    ADD CONSTRAINT "FK_ff3564f0e4925cec019b1a60144" FOREIGN KEY ("approved_by") REFERENCES "identity"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "content"."media_trend_snapshots"
    ADD CONSTRAINT "FK_8ebee2d7f756cfd4b524be9fdb0" FOREIGN KEY ("media_id") REFERENCES "content"."media_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "content"."media_discovery_scores"
    ADD CONSTRAINT "FK_d6b73f86a7dc5b38e071af72c4f" FOREIGN KEY ("media_id") REFERENCES "content"."media_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "content"."media_editorial_overrides"
    ADD CONSTRAINT "FK_dbbce664d21b332a25a3ccd89ba" FOREIGN KEY ("media_id") REFERENCES "content"."media_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "events"."ticket_reservations"
    ADD CONSTRAINT "FK_5feb5ab8fe7d36c2119507df71c" FOREIGN KEY ("order_id") REFERENCES "commerce"."orders"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "events"."ticket_types"
    ADD CONSTRAINT "FK_9dfa62b35548ea1e0b7e4675b20" FOREIGN KEY ("event_id") REFERENCES "events"."events"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "events"."tickets"
    ADD CONSTRAINT "FK_a95369aeea12da7fde110e95e00" FOREIGN KEY ("ticket_type_id") REFERENCES "events"."ticket_types"("id");



ALTER TABLE ONLY "events"."ticket_reservations"
    ADD CONSTRAINT "FK_be4fd23b4325aff88b9e9accc46" FOREIGN KEY ("ticket_type_id") REFERENCES "events"."ticket_types"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "events"."events"
    ADD CONSTRAINT "FK_ed32c7f36fa1493873a5d20351c" FOREIGN KEY ("merchant_id") REFERENCES "commerce"."merchants"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "events"."ticket_inventory"
    ADD CONSTRAINT "FK_edf963f535eea8f46e6eae132e3" FOREIGN KEY ("ticket_type_id") REFERENCES "events"."ticket_types"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "finance"."ledger_entries"
    ADD CONSTRAINT "FK_b26c5ef5853fd6e0a8680427f60" FOREIGN KEY ("transaction_id") REFERENCES "finance"."ledger_transactions"("id");



ALTER TABLE ONLY "finance"."ledger_entries"
    ADD CONSTRAINT "FK_e4440167e470be69f9622c1ceab" FOREIGN KEY ("account_id") REFERENCES "finance"."accounts"("id");



ALTER TABLE ONLY "identity"."kyc_verification_cases"
    ADD CONSTRAINT "FK_0109a111c6dee21f1aea3ef5fca" FOREIGN KEY ("reviewer_id") REFERENCES "identity"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "identity"."sessions"
    ADD CONSTRAINT "FK_085d540d9f418cfbdc7bd55bb19" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "identity"."role_permissions"
    ADD CONSTRAINT "FK_17022daf3f885f7d35423e9971e" FOREIGN KEY ("permission_id") REFERENCES "identity"."permissions"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "identity"."role_permissions"
    ADD CONSTRAINT "FK_178199805b901ccd220ab7740ec" FOREIGN KEY ("role_id") REFERENCES "identity"."roles"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "identity"."audit_log"
    ADD CONSTRAINT "FK_1c4c8c76598008ea972a84e7834" FOREIGN KEY ("actor_user_id") REFERENCES "identity"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "identity"."kyc_documents"
    ADD CONSTRAINT "FK_35e697711162cee6a6a2f6f4b05" FOREIGN KEY ("kyc_profile_id") REFERENCES "identity"."kyc_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "identity"."kyc_verification_cases"
    ADD CONSTRAINT "FK_682c58b3197b6be9af3e1751e59" FOREIGN KEY ("kyc_profile_id") REFERENCES "identity"."kyc_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "identity"."kyc_profiles"
    ADD CONSTRAINT "FK_7e386a6324a0e96ca89a27afecb" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "identity"."external_identities"
    ADD CONSTRAINT "FK_8320cffd2d6ca86003e23981668" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "identity"."password_credentials"
    ADD CONSTRAINT "FK_9b6358b8110bfd9267608e85e0d" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "identity"."role_assignments"
    ADD CONSTRAINT "FK_a0268fc16c3777758f7683a4401" FOREIGN KEY ("role_id") REFERENCES "identity"."roles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "identity"."role_assignments"
    ADD CONSTRAINT "FK_ad49d2bdb228b7f760564b9e2d2" FOREIGN KEY ("assigned_by") REFERENCES "identity"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "identity"."role_assignments"
    ADD CONSTRAINT "FK_d91c8ac0c10fd8c6acdcc5ee946" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "identity"."email_verification_tokens"
    ADD CONSTRAINT "FK_fdcb77f72f529bf65c95d72a147" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "integration"."statement_lines"
    ADD CONSTRAINT "FK_03ea696e5acd501166c970ea4e0" FOREIGN KEY ("statement_import_id") REFERENCES "integration"."statement_imports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "integration"."statement_imports"
    ADD CONSTRAINT "FK_05438b80077d269354262ae2d75" FOREIGN KEY ("imported_by") REFERENCES "identity"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "integration"."reconciliation_cases"
    ADD CONSTRAINT "FK_0b5c58c1e74eaca560f1a8ec530" FOREIGN KEY ("resolved_by") REFERENCES "identity"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "integration"."reconciliation_matches"
    ADD CONSTRAINT "FK_552ade5fd5a8d3fa2d0aefccca3" FOREIGN KEY ("statement_line_id") REFERENCES "integration"."statement_lines"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "integration"."provider_events"
    ADD CONSTRAINT "FK_55ac883369d24b19ab74a89f1ce" FOREIGN KEY ("provider_transaction_id") REFERENCES "integration"."provider_transactions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "integration"."reconciliation_matches"
    ADD CONSTRAINT "FK_7baa74f900fca22d6bd1def6f0c" FOREIGN KEY ("reconciliation_case_id") REFERENCES "integration"."reconciliation_cases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "integration"."provider_event_processing"
    ADD CONSTRAINT "FK_946176b4ba68704ec2b2780876c" FOREIGN KEY ("provider_event_id") REFERENCES "integration"."provider_events"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "integration"."provider_transactions"
    ADD CONSTRAINT "FK_9c3f0b2f6c405398ce02199be5c" FOREIGN KEY ("internal_payment_id") REFERENCES "commerce"."payments"("id") ON DELETE SET NULL;





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."citext"(character) TO "postgres";
GRANT ALL ON FUNCTION "public"."citext"(character) TO "anon";
GRANT ALL ON FUNCTION "public"."citext"(character) TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext"(character) TO "service_role";



GRANT ALL ON FUNCTION "public"."citext"("inet") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext"("inet") TO "anon";
GRANT ALL ON FUNCTION "public"."citext"("inet") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext"("inet") TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "service_role";












GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "service_role";















ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "service_role";































