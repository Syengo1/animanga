import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1789710665177 implements MigrationInterface {
  name = 'InitialSchema1789710665177';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Inject schema creation commands here
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "identity"`);
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "commerce"`);
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "content"`);
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "events"`);
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "finance"`);
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "integration"`);

    await queryRunner.query(
      `CREATE TABLE "identity"."users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" citext NOT NULL, "password_hash" text NOT NULL, "first_name" character varying(100), "last_name" character varying(100), "phone" character varying(30), "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "commerce"."merchants_status_enum" AS ENUM('PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "commerce"."merchants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "business_name" character varying(255) NOT NULL, "operating_currency" character(3) NOT NULL DEFAULT 'KES', "status" "commerce"."merchants_status_enum" NOT NULL DEFAULT 'PENDING', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "owner_user_id" uuid, CONSTRAINT "PK_4fd312ef25f8e05ad47bfe7ed25" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "commerce"."orders_payment_status_enum" AS ENUM('UNPAID', 'PARTIALLY_PAID', 'PAID')`,
    );
    await queryRunner.query(
      `CREATE TYPE "commerce"."orders_fulfillment_status_enum" AS ENUM('UNFULFILLED', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "commerce"."orders_refund_status_enum" AS ENUM('NOT_REFUNDED', 'PARTIALLY_REFUNDED', 'FULLY_REFUNDED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "commerce"."orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order_number" character varying(50) NOT NULL, "gross_amount" numeric(19,4) NOT NULL, "currency" character(3) NOT NULL, "payment_status" "commerce"."orders_payment_status_enum" NOT NULL DEFAULT 'UNPAID', "fulfillment_status" "commerce"."orders_fulfillment_status_enum" NOT NULL DEFAULT 'UNFULFILLED', "refund_status" "commerce"."orders_refund_status_enum" NOT NULL DEFAULT 'NOT_REFUNDED', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "customer_id" uuid, "merchant_id" uuid, CONSTRAINT "UQ_75eba1c6b1a66b09f2a97e6927b" UNIQUE ("order_number"), CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "commerce"."order_items_item_type_enum" AS ENUM('TICKET', 'MERCH')`,
    );
    await queryRunner.query(
      `CREATE TABLE "commerce"."order_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "item_type" "commerce"."order_items_item_type_enum" NOT NULL, "item_id" uuid NOT NULL, "quantity" integer NOT NULL, "price_per_unit" numeric(19,4) NOT NULL, "currency" character(3) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "order_id" uuid, CONSTRAINT "PK_005269d8574e6fac0493715c308" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "commerce"."payments_status_enum" AS ENUM('PENDING', 'AUTHORIZED', 'COMPLETED', 'FAILED', 'REVERSED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "commerce"."payments_payment_method_enum" AS ENUM('MPESA_STK', 'MPESA_C2B', 'CARD')`,
    );
    await queryRunner.query(
      `CREATE TABLE "commerce"."payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "amount" numeric(19,4) NOT NULL, "currency" character(3) NOT NULL, "status" "commerce"."payments_status_enum" NOT NULL DEFAULT 'PENDING', "payment_method" "commerce"."payments_payment_method_enum" NOT NULL, "provider" character varying(50) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "order_id" uuid, CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "commerce"."payout_requests_status_enum" AS ENUM('REQUESTED', 'APPROVED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "commerce"."payout_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "payout_number" character varying(50) NOT NULL, "amount" numeric(19,4) NOT NULL, "currency" character(3) NOT NULL, "destination_reference" text NOT NULL, "status" "commerce"."payout_requests_status_enum" NOT NULL DEFAULT 'REQUESTED', "approved_at" TIMESTAMP WITH TIME ZONE, "payout_ledger_tx_id" uuid, "provider_transaction_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "merchant_id" uuid, "requested_by" uuid, "approved_by" uuid, CONSTRAINT "UQ_598a659a7c426a2f57701711421" UNIQUE ("payout_number"), CONSTRAINT "PK_3a6acb302f56ad7dadda35c86b8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "commerce"."refunds_status_enum" AS ENUM('REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'FAILED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "commerce"."refunds" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "refund_number" character varying(50) NOT NULL, "amount" numeric(19,4) NOT NULL, "currency" character(3) NOT NULL, "status" "commerce"."refunds_status_enum" NOT NULL DEFAULT 'REQUESTED', "reason" text, "original_payment_ledger_tx_id" uuid, "reversal_ledger_tx_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "order_id" uuid, "requested_by" uuid, "approved_by" uuid, CONSTRAINT "UQ_fc141a23aa0c9ec7671d4b7ac15" UNIQUE ("refund_number"), CONSTRAINT "PK_5106efb01eeda7e49a78b869738" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "content"."media_items_media_type_enum" AS ENUM('ANIME', 'MANGA')`,
    );
    await queryRunner.query(
      `CREATE TYPE "content"."media_items_status_enum" AS ENUM('FINISHED', 'RELEASING', 'NOT_YET_RELEASED', 'CANCELLED', 'HIATUS', 'UNKNOWN')`,
    );
    await queryRunner.query(
      `CREATE TYPE "content"."media_items_season_enum" AS ENUM('WINTER', 'SPRING', 'SUMMER', 'FALL')`,
    );
    await queryRunner.query(
      `CREATE TABLE "content"."media_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "provider" character varying(50) NOT NULL, "external_id" character varying(100) NOT NULL, "media_type" "content"."media_items_media_type_enum" NOT NULL, "title_romaji" character varying(500), "title_english" character varying(500), "title_native" character varying(500), "synopsis" text, "status" "content"."media_items_status_enum" NOT NULL DEFAULT 'UNKNOWN', "season" "content"."media_items_season_enum", "season_year" integer, "cover_image_url" text, "banner_image_url" text, "color_hex" character varying(20), "episodes" integer, "chapters" integer, "volumes" integer, "genres" text array NOT NULL DEFAULT '{}', "average_score" numeric(5,2), "popularity" integer DEFAULT '0', "is_adult" boolean NOT NULL DEFAULT false, "start_date" TIMESTAMP WITH TIME ZONE, "end_date" TIMESTAMP WITH TIME ZONE, "format" character varying(50), "duration" integer, "source_updated_at" TIMESTAMP WITH TIME ZONE, "last_synced_at" TIMESTAMP WITH TIME ZONE, "provider_metadata" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c23c721eba990b8d9c28c48592c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_c3ce53c41c47f61cc90d2a7840" ON "content"."media_items"  ("provider", "external_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "content"."media_discovery_scores" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "feed_key" character varying(50) NOT NULL, "algorithm_version" character varying(50) NOT NULL, "raw_popularity" integer NOT NULL DEFAULT '0', "popularity_score" numeric(5,4) NOT NULL DEFAULT '0', "urgency_score" numeric(5,4) NOT NULL DEFAULT '0', "recency_score" numeric(5,4) NOT NULL DEFAULT '0', "trend_score" numeric(5,4) NOT NULL DEFAULT '0', "editorial_score" numeric(5,4) NOT NULL DEFAULT '0', "final_score" numeric(8,4) NOT NULL DEFAULT '0', "rank" integer, "calculated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "valid_until" TIMESTAMP WITH TIME ZONE, "media_id" uuid, CONSTRAINT "uq_media_feed" UNIQUE ("media_id", "feed_key"), CONSTRAINT "PK_070554fbcb15551259c0c59a216" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "content"."media_editorial_overrides" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "feed_key" character varying(50) NOT NULL, "weight" integer NOT NULL DEFAULT '0', "multiplier" numeric(5,2) NOT NULL DEFAULT '1', "reason" text, "starts_at" TIMESTAMP WITH TIME ZONE, "ends_at" TIMESTAMP WITH TIME ZONE, "created_by" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "media_id" uuid, CONSTRAINT "PK_2e84584016ad0d4c41a9a51213e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "content"."media_trend_snapshots" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "provider" character varying(50) NOT NULL, "snapshot_date" date NOT NULL, "trending" integer NOT NULL DEFAULT '0', "popularity" integer NOT NULL DEFAULT '0', "average_score" numeric(5,2), "in_progress" integer NOT NULL DEFAULT '0', "releasing" integer NOT NULL DEFAULT '0', "episode" integer, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "media_id" uuid, CONSTRAINT "uq_provider_media_date" UNIQUE ("provider", "media_id", "snapshot_date"), CONSTRAINT "PK_de0919a5b80338218372d50bdc2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "events"."events_status_enum" AS ENUM('DRAFT', 'PUBLISHED', 'ON_SALE', 'SOLD_OUT', 'CANCELLED', 'COMPLETED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "events"."events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(255) NOT NULL, "description" text, "start_time" TIMESTAMP WITH TIME ZONE NOT NULL, "end_time" TIMESTAMP WITH TIME ZONE NOT NULL, "currency" character(3) NOT NULL, "status" "events"."events_status_enum" NOT NULL DEFAULT 'DRAFT', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "merchant_id" uuid, CONSTRAINT "PK_40731c7151fe4be3116e45ddf73" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "events"."ticket_deliveries_channel_enum" AS ENUM('EMAIL', 'SMS')`,
    );
    await queryRunner.query(
      `CREATE TYPE "events"."ticket_deliveries_status_enum" AS ENUM('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'DEAD_LETTER')`,
    );
    await queryRunner.query(
      `CREATE TABLE "events"."ticket_deliveries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ticket_id" uuid NOT NULL, "channel" "events"."ticket_deliveries_channel_enum" NOT NULL, "destination" character varying NOT NULL, "status" "events"."ticket_deliveries_status_enum" NOT NULL DEFAULT 'PENDING', "attempt_count" integer NOT NULL DEFAULT '0', "provider_message_id" character varying, "last_error" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_a7332b026796234b9b161deff33" UNIQUE ("ticket_id", "channel"), CONSTRAINT "PK_358943f6b12ba6aeeb51f07a13c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "events"."signing_keys_status_enum" AS ENUM('ACTIVE', 'RETIRED', 'REVOKED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "events"."signing_keys" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "algorithm" character varying(50) NOT NULL DEFAULT 'Ed25519', "public_key" text NOT NULL, "status" "events"."signing_keys_status_enum" NOT NULL DEFAULT 'ACTIVE', "valid_from" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "valid_to" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ab7d78cf6e61dc3904133b4cd55" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "events"."ticket_types" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(150) NOT NULL, "price" numeric(19,4) NOT NULL, "currency" character(3) NOT NULL, "capacity" integer NOT NULL, "sales_cutoff" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "event_id" uuid, CONSTRAINT "PK_5510ce7e18a4edc648c9fbfc283" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "events"."ticket_inventory" ("ticket_type_id" uuid NOT NULL, "capacity" integer NOT NULL, "available_quantity" integer NOT NULL, "reserved_quantity" integer NOT NULL DEFAULT '0', "sold_quantity" integer NOT NULL DEFAULT '0', "version" integer NOT NULL, "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_edf963f535eea8f46e6eae132e3" PRIMARY KEY ("ticket_type_id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "events"."ticket_reservations_status_enum" AS ENUM('RESERVED', 'SOLD', 'EXPIRED', 'RELEASED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "events"."ticket_reservations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "checkout_session_id" uuid NOT NULL, "quantity" integer NOT NULL, "status" "events"."ticket_reservations_status_enum" NOT NULL DEFAULT 'RESERVED', "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "released_at" TIMESTAMP WITH TIME ZONE, "ticket_type_id" uuid, "order_id" uuid, CONSTRAINT "UQ_bf222bfd6e0688e02f68723cc22" UNIQUE ("checkout_session_id"), CONSTRAINT "PK_f2ba95022c4304afa7891fdd3e9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "events"."ticket_scan_attempts_result_enum" AS ENUM('VALID', 'DUPLICATE', 'REVOKED', 'INVALID_SIGNATURE', 'WRONG_EVENT', 'EXPIRED', 'INVALID_PAYLOAD', 'KEY_REVOKED', 'NOT_FOUND')`,
    );
    await queryRunner.query(
      `CREATE TABLE "events"."ticket_scan_attempts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ticket_id" uuid, "event_id" uuid NOT NULL, "scanner_user_id" uuid, "result" "events"."ticket_scan_attempts_result_enum" NOT NULL, "gate_id" character varying(100), "raw_payload" jsonb, "raw_signature" text, "latitude" numeric(10,7), "longitude" numeric(10,7), "device_id" text, "app_version" character varying(50), "network_status" character varying(20), "sync_sequence" bigint, "scanned_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_359cd2da9b28648faf840af5e24" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "events"."tickets_status_enum" AS ENUM('ISSUED', 'SCANNED', 'REVOKED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "events"."tickets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order_id" uuid NOT NULL, "order_item_id" uuid NOT NULL, "event_id" uuid NOT NULL, "sequence_number" integer NOT NULL, "status" "events"."tickets_status_enum" NOT NULL DEFAULT 'ISSUED', "qr_payload" jsonb NOT NULL, "signature" text NOT NULL, "signing_key_id" uuid NOT NULL, "issued_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "ticket_type_id" uuid, CONSTRAINT "UQ_ad5a220d4d44ac4851c1a2c1574" UNIQUE ("order_item_id", "sequence_number"), CONSTRAINT "PK_343bc942ae261cf7a1377f48fd0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "finance"."ledger_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "transaction_type" character varying NOT NULL, "reference_type" character varying NOT NULL, "reference_id" character varying NOT NULL, "idempotency_key" character varying NOT NULL, "request_hash" character(64) NOT NULL, "currency" character varying NOT NULL DEFAULT 'KES', "reverses_transaction_id" uuid, "status" character varying NOT NULL DEFAULT 'POSTED', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_01ff7d3a76be6b7ca5fd33761d4" UNIQUE ("idempotency_key"), CONSTRAINT "PK_633d103c9e415d615aacf9b1929" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "finance"."accounts" ("id" uuid NOT NULL, "account_code" character varying(50) NOT NULL, "account_type" character varying(50) NOT NULL, "classification" character varying(50) NOT NULL, "currency" character varying(3) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_ea1a16a9d7f135b0b67c0c8fede" UNIQUE ("account_code"), CONSTRAINT "PK_5a7a02c20412299d198e097a8fe" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "finance"."ledger_entries_direction_enum" AS ENUM('DEBIT', 'CREDIT')`,
    );
    await queryRunner.query(
      `CREATE TABLE "finance"."ledger_entries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "direction" "finance"."ledger_entries_direction_enum" NOT NULL, "amount" numeric(19,4) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "transaction_id" uuid, "account_id" uuid, CONSTRAINT "PK_6efcb84411d3f08b08450ae75d5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "identity"."audit_log" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "action" character varying(150) NOT NULL, "entity_type" character varying(100), "entity_id" uuid, "metadata" jsonb, "ip_address" inet, "user_agent" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "actor_user_id" uuid, CONSTRAINT "PK_07fefa57f7f5ab8fc3f52b3ed0b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "identity"."kyc_profiles_verification_status_enum" AS ENUM('UNVERIFIED', 'VERIFIED', 'SUSPENDED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "identity"."kyc_profiles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "legal_name" character varying(255) NOT NULL, "kra_pin_hash" text, "verification_status" "identity"."kyc_profiles_verification_status_enum" NOT NULL DEFAULT 'UNVERIFIED', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid, CONSTRAINT "REL_7e386a6324a0e96ca89a27afec" UNIQUE ("user_id"), CONSTRAINT "PK_94a340b98061b0cd7542d98e4b1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "identity"."kyc_verification_cases_status_enum" AS ENUM('OPEN', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CLOSED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "identity"."kyc_verification_cases" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "status" "identity"."kyc_verification_cases_status_enum" NOT NULL, "notes" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "kyc_profile_id" uuid, "reviewer_id" uuid, CONSTRAINT "PK_550f89baa4a44064856dcd814b3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "identity"."kyc_documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "document_type" character varying(100) NOT NULL, "document_storage_key" text NOT NULL, "document_sha256" character(64) NOT NULL, "uploaded_at" TIMESTAMP NOT NULL DEFAULT now(), "kyc_profile_id" uuid, CONSTRAINT "PK_02e49877f1578e6285f84e57ab6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "identity"."permissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(150) NOT NULL, "name" character varying(200) NOT NULL, "description" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8dad765629e83229da6feda1c1d" UNIQUE ("code"), CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "identity"."roles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(100) NOT NULL, "name" character varying(150) NOT NULL, "description" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_f6d54f95c31b73fb1bdd8e91d0c" UNIQUE ("code"), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "identity"."role_assignments_scope_type_enum" AS ENUM('GLOBAL', 'MERCHANT', 'EVENT')`,
    );
    await queryRunner.query(
      `CREATE TABLE "identity"."role_assignments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "scope_type" "identity"."role_assignments_scope_type_enum" NOT NULL, "scope_id" uuid, "assigned_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid, "role_id" uuid, "assigned_by" uuid, CONSTRAINT "PK_fc2df9835ac1d2a34839f113783" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "integration"."outbox_messages_status_enum" AS ENUM('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED', 'DEAD_LETTER')`,
    );
    await queryRunner.query(
      `CREATE TABLE "integration"."outbox_messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "aggregate_type" character varying(100) NOT NULL, "aggregate_id" uuid NOT NULL, "event_type" character varying(150) NOT NULL, "payload" jsonb NOT NULL, "status" "integration"."outbox_messages_status_enum" NOT NULL DEFAULT 'PENDING', "deduplication_key" character varying(255) NOT NULL, "attempt_count" integer NOT NULL DEFAULT '0', "next_attempt_at" TIMESTAMP WITH TIME ZONE NOT NULL, "published_at" TIMESTAMP WITH TIME ZONE, "last_error" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_803aace7de3adf374430240ff13" UNIQUE ("deduplication_key"), CONSTRAINT "PK_0171348f527c64b137e4d4f5b66" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "integration"."provider_transactions_status_enum" AS ENUM('INITIATED', 'PENDING', 'COMPLETED', 'FAILED', 'REVERSED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "integration"."provider_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "provider" character varying(50) NOT NULL, "provider_transaction_id" character varying(255) NOT NULL, "amount" numeric(19,4) NOT NULL, "currency" character(3) NOT NULL, "status" "integration"."provider_transactions_status_enum" NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "internal_payment_id" uuid, CONSTRAINT "PK_2d64b08550452a96fccc7905e48" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "integration"."provider_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "provider" character varying(50) NOT NULL, "provider_event_id" character varying(255) NOT NULL, "event_type" character varying(100) NOT NULL, "idempotency_key" character varying(500) NOT NULL, "payload_hash" character(64) NOT NULL, "raw_payload" jsonb NOT NULL, "received_at" TIMESTAMP NOT NULL DEFAULT now(), "provider_transaction_id" uuid, CONSTRAINT "PK_d882a90f8c8180b9bdae9af62eb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "integration"."provider_event_processing_status_enum" AS ENUM('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'DEAD_LETTER')`,
    );
    await queryRunner.query(
      `CREATE TABLE "integration"."provider_event_processing" ("provider_event_id" uuid NOT NULL, "status" "integration"."provider_event_processing_status_enum" NOT NULL DEFAULT 'PENDING', "attempt_count" integer NOT NULL DEFAULT '0', "started_at" TIMESTAMP WITH TIME ZONE, "processed_at" TIMESTAMP WITH TIME ZONE, "last_error" text, "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_946176b4ba68704ec2b2780876c" PRIMARY KEY ("provider_event_id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "integration"."reconciliation_cases_status_enum" AS ENUM('DISCOVERED', 'MATCHING', 'MATCHED', 'EXCEPTION', 'RESOLVED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "integration"."reconciliation_cases_exception_category_enum" AS ENUM('AMOUNT_MISMATCH', 'MISSING_INTERNAL_TRANSACTION', 'MISSING_PROVIDER_TRANSACTION', 'STATUS_MISMATCH', 'UNEXPECTED_FEE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "integration"."reconciliation_cases" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "status" "integration"."reconciliation_cases_status_enum" NOT NULL DEFAULT 'DISCOVERED', "exception_category" "integration"."reconciliation_cases_exception_category_enum", "notes" text, "resolved_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "resolved_by" uuid, CONSTRAINT "PK_093a79938779c84eee70bda7f66" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "integration"."statement_imports_status_enum" AS ENUM('PROCESSING', 'COMPLETED', 'FAILED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "integration"."statement_imports" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "provider" character varying(50) NOT NULL, "provider_account" character varying(255), "period_start" TIMESTAMP WITH TIME ZONE, "period_end" TIMESTAMP WITH TIME ZONE, "file_hash" character(64) NOT NULL, "imported_at" TIMESTAMP NOT NULL DEFAULT now(), "status" "integration"."statement_imports_status_enum" NOT NULL DEFAULT 'PROCESSING', "imported_by" uuid, CONSTRAINT "PK_e883b7cf21565d3df9baf3c2550" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "integration"."statement_lines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "provider" character varying(50) NOT NULL, "provider_statement_id" character varying(255) NOT NULL, "provider_transaction_id" character varying(255) NOT NULL, "reference" character varying(255), "amount" numeric(19,4) NOT NULL, "currency" character(3) NOT NULL, "transaction_type" character varying(100), "occurred_at" TIMESTAMP WITH TIME ZONE, "settled_at" TIMESTAMP WITH TIME ZONE, "statement_hash" character(64) NOT NULL, "raw_payload" jsonb, "imported_at" TIMESTAMP NOT NULL DEFAULT now(), "statement_import_id" uuid, CONSTRAINT "PK_56ba8ab3b9e455e5a732c60a543" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "integration"."reconciliation_matches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ledger_transaction_id" uuid, "matched_amount" numeric(19,4) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "reconciliation_case_id" uuid, "statement_line_id" uuid, CONSTRAINT "PK_2ab553fffe4b51b1bc568397cec" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "commerce"."merchants" ADD CONSTRAINT "FK_601b7984c109a454f72d1f1029f" FOREIGN KEY ("owner_user_id") REFERENCES "identity"."users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "commerce"."orders" ADD CONSTRAINT "FK_772d0ce0473ac2ccfa26060dbe9" FOREIGN KEY ("customer_id") REFERENCES "identity"."users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "commerce"."orders" ADD CONSTRAINT "FK_2474866c8f8e9196ff227a7cbbd" FOREIGN KEY ("merchant_id") REFERENCES "commerce"."merchants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "commerce"."order_items" ADD CONSTRAINT "FK_145532db85752b29c57d2b7b1f1" FOREIGN KEY ("order_id") REFERENCES "commerce"."orders"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "commerce"."payments" ADD CONSTRAINT "FK_b2f7b823a21562eeca20e72b006" FOREIGN KEY ("order_id") REFERENCES "commerce"."orders"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "commerce"."payout_requests" ADD CONSTRAINT "FK_3179eb6a30c74ca38fbd4e8e47a" FOREIGN KEY ("merchant_id") REFERENCES "commerce"."merchants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "commerce"."payout_requests" ADD CONSTRAINT "FK_f7d1dfbc8ee96ebf75d853e76ea" FOREIGN KEY ("requested_by") REFERENCES "identity"."users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "commerce"."payout_requests" ADD CONSTRAINT "FK_3fc79db0df1b12f6de641eef380" FOREIGN KEY ("approved_by") REFERENCES "identity"."users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "commerce"."refunds" ADD CONSTRAINT "FK_a42db6369017df60549539f5567" FOREIGN KEY ("order_id") REFERENCES "commerce"."orders"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "commerce"."refunds" ADD CONSTRAINT "FK_82ec9e8f74e6d5fe919be143a03" FOREIGN KEY ("requested_by") REFERENCES "identity"."users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "commerce"."refunds" ADD CONSTRAINT "FK_ff3564f0e4925cec019b1a60144" FOREIGN KEY ("approved_by") REFERENCES "identity"."users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "content"."media_discovery_scores" ADD CONSTRAINT "FK_d6b73f86a7dc5b38e071af72c4f" FOREIGN KEY ("media_id") REFERENCES "content"."media_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "content"."media_editorial_overrides" ADD CONSTRAINT "FK_dbbce664d21b332a25a3ccd89ba" FOREIGN KEY ("media_id") REFERENCES "content"."media_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "content"."media_trend_snapshots" ADD CONSTRAINT "FK_8ebee2d7f756cfd4b524be9fdb0" FOREIGN KEY ("media_id") REFERENCES "content"."media_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "events"."events" ADD CONSTRAINT "FK_ed32c7f36fa1493873a5d20351c" FOREIGN KEY ("merchant_id") REFERENCES "commerce"."merchants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "events"."ticket_types" ADD CONSTRAINT "FK_9dfa62b35548ea1e0b7e4675b20" FOREIGN KEY ("event_id") REFERENCES "events"."events"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "events"."ticket_inventory" ADD CONSTRAINT "FK_edf963f535eea8f46e6eae132e3" FOREIGN KEY ("ticket_type_id") REFERENCES "events"."ticket_types"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "events"."ticket_reservations" ADD CONSTRAINT "FK_be4fd23b4325aff88b9e9accc46" FOREIGN KEY ("ticket_type_id") REFERENCES "events"."ticket_types"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "events"."ticket_reservations" ADD CONSTRAINT "FK_5feb5ab8fe7d36c2119507df71c" FOREIGN KEY ("order_id") REFERENCES "commerce"."orders"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "events"."tickets" ADD CONSTRAINT "FK_a95369aeea12da7fde110e95e00" FOREIGN KEY ("ticket_type_id") REFERENCES "events"."ticket_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "finance"."ledger_entries" ADD CONSTRAINT "FK_b26c5ef5853fd6e0a8680427f60" FOREIGN KEY ("transaction_id") REFERENCES "finance"."ledger_transactions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "finance"."ledger_entries" ADD CONSTRAINT "FK_e4440167e470be69f9622c1ceab" FOREIGN KEY ("account_id") REFERENCES "finance"."accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "identity"."audit_log" ADD CONSTRAINT "FK_1c4c8c76598008ea972a84e7834" FOREIGN KEY ("actor_user_id") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "identity"."kyc_profiles" ADD CONSTRAINT "FK_7e386a6324a0e96ca89a27afecb" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "identity"."kyc_verification_cases" ADD CONSTRAINT "FK_682c58b3197b6be9af3e1751e59" FOREIGN KEY ("kyc_profile_id") REFERENCES "identity"."kyc_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "identity"."kyc_verification_cases" ADD CONSTRAINT "FK_0109a111c6dee21f1aea3ef5fca" FOREIGN KEY ("reviewer_id") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "identity"."kyc_documents" ADD CONSTRAINT "FK_35e697711162cee6a6a2f6f4b05" FOREIGN KEY ("kyc_profile_id") REFERENCES "identity"."kyc_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "identity"."role_assignments" ADD CONSTRAINT "FK_d91c8ac0c10fd8c6acdcc5ee946" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "identity"."role_assignments" ADD CONSTRAINT "FK_a0268fc16c3777758f7683a4401" FOREIGN KEY ("role_id") REFERENCES "identity"."roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "identity"."role_assignments" ADD CONSTRAINT "FK_ad49d2bdb228b7f760564b9e2d2" FOREIGN KEY ("assigned_by") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "integration"."provider_transactions" ADD CONSTRAINT "FK_9c3f0b2f6c405398ce02199be5c" FOREIGN KEY ("internal_payment_id") REFERENCES "commerce"."payments"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "integration"."provider_events" ADD CONSTRAINT "FK_55ac883369d24b19ab74a89f1ce" FOREIGN KEY ("provider_transaction_id") REFERENCES "integration"."provider_transactions"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "integration"."provider_event_processing" ADD CONSTRAINT "FK_946176b4ba68704ec2b2780876c" FOREIGN KEY ("provider_event_id") REFERENCES "integration"."provider_events"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "integration"."reconciliation_cases" ADD CONSTRAINT "FK_0b5c58c1e74eaca560f1a8ec530" FOREIGN KEY ("resolved_by") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "integration"."statement_imports" ADD CONSTRAINT "FK_05438b80077d269354262ae2d75" FOREIGN KEY ("imported_by") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "integration"."statement_lines" ADD CONSTRAINT "FK_03ea696e5acd501166c970ea4e0" FOREIGN KEY ("statement_import_id") REFERENCES "integration"."statement_imports"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "integration"."reconciliation_matches" ADD CONSTRAINT "FK_7baa74f900fca22d6bd1def6f0c" FOREIGN KEY ("reconciliation_case_id") REFERENCES "integration"."reconciliation_cases"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "integration"."reconciliation_matches" ADD CONSTRAINT "FK_552ade5fd5a8d3fa2d0aefccca3" FOREIGN KEY ("statement_line_id") REFERENCES "integration"."statement_lines"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "integration"."reconciliation_matches" DROP CONSTRAINT "FK_552ade5fd5a8d3fa2d0aefccca3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "integration"."reconciliation_matches" DROP CONSTRAINT "FK_7baa74f900fca22d6bd1def6f0c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "integration"."statement_lines" DROP CONSTRAINT "FK_03ea696e5acd501166c970ea4e0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "integration"."statement_imports" DROP CONSTRAINT "FK_05438b80077d269354262ae2d75"`,
    );
    await queryRunner.query(
      `ALTER TABLE "integration"."reconciliation_cases" DROP CONSTRAINT "FK_0b5c58c1e74eaca560f1a8ec530"`,
    );
    await queryRunner.query(
      `ALTER TABLE "integration"."provider_event_processing" DROP CONSTRAINT "FK_946176b4ba68704ec2b2780876c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "integration"."provider_events" DROP CONSTRAINT "FK_55ac883369d24b19ab74a89f1ce"`,
    );
    await queryRunner.query(
      `ALTER TABLE "integration"."provider_transactions" DROP CONSTRAINT "FK_9c3f0b2f6c405398ce02199be5c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "identity"."role_assignments" DROP CONSTRAINT "FK_ad49d2bdb228b7f760564b9e2d2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "identity"."role_assignments" DROP CONSTRAINT "FK_a0268fc16c3777758f7683a4401"`,
    );
    await queryRunner.query(
      `ALTER TABLE "identity"."role_assignments" DROP CONSTRAINT "FK_d91c8ac0c10fd8c6acdcc5ee946"`,
    );
    await queryRunner.query(
      `ALTER TABLE "identity"."kyc_documents" DROP CONSTRAINT "FK_35e697711162cee6a6a2f6f4b05"`,
    );
    await queryRunner.query(
      `ALTER TABLE "identity"."kyc_verification_cases" DROP CONSTRAINT "FK_0109a111c6dee21f1aea3ef5fca"`,
    );
    await queryRunner.query(
      `ALTER TABLE "identity"."kyc_verification_cases" DROP CONSTRAINT "FK_682c58b3197b6be9af3e1751e59"`,
    );
    await queryRunner.query(
      `ALTER TABLE "identity"."kyc_profiles" DROP CONSTRAINT "FK_7e386a6324a0e96ca89a27afecb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "identity"."audit_log" DROP CONSTRAINT "FK_1c4c8c76598008ea972a84e7834"`,
    );
    await queryRunner.query(
      `ALTER TABLE "finance"."ledger_entries" DROP CONSTRAINT "FK_e4440167e470be69f9622c1ceab"`,
    );
    await queryRunner.query(
      `ALTER TABLE "finance"."ledger_entries" DROP CONSTRAINT "FK_b26c5ef5853fd6e0a8680427f60"`,
    );
    await queryRunner.query(
      `ALTER TABLE "events"."tickets" DROP CONSTRAINT "FK_a95369aeea12da7fde110e95e00"`,
    );
    await queryRunner.query(
      `ALTER TABLE "events"."ticket_reservations" DROP CONSTRAINT "FK_5feb5ab8fe7d36c2119507df71c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "events"."ticket_reservations" DROP CONSTRAINT "FK_be4fd23b4325aff88b9e9accc46"`,
    );
    await queryRunner.query(
      `ALTER TABLE "events"."ticket_inventory" DROP CONSTRAINT "FK_edf963f535eea8f46e6eae132e3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "events"."ticket_types" DROP CONSTRAINT "FK_9dfa62b35548ea1e0b7e4675b20"`,
    );
    await queryRunner.query(
      `ALTER TABLE "events"."events" DROP CONSTRAINT "FK_ed32c7f36fa1493873a5d20351c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "content"."media_trend_snapshots" DROP CONSTRAINT "FK_8ebee2d7f756cfd4b524be9fdb0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "content"."media_editorial_overrides" DROP CONSTRAINT "FK_dbbce664d21b332a25a3ccd89ba"`,
    );
    await queryRunner.query(
      `ALTER TABLE "content"."media_discovery_scores" DROP CONSTRAINT "FK_d6b73f86a7dc5b38e071af72c4f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commerce"."refunds" DROP CONSTRAINT "FK_ff3564f0e4925cec019b1a60144"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commerce"."refunds" DROP CONSTRAINT "FK_82ec9e8f74e6d5fe919be143a03"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commerce"."refunds" DROP CONSTRAINT "FK_a42db6369017df60549539f5567"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commerce"."payout_requests" DROP CONSTRAINT "FK_3fc79db0df1b12f6de641eef380"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commerce"."payout_requests" DROP CONSTRAINT "FK_f7d1dfbc8ee96ebf75d853e76ea"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commerce"."payout_requests" DROP CONSTRAINT "FK_3179eb6a30c74ca38fbd4e8e47a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commerce"."payments" DROP CONSTRAINT "FK_b2f7b823a21562eeca20e72b006"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commerce"."order_items" DROP CONSTRAINT "FK_145532db85752b29c57d2b7b1f1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commerce"."orders" DROP CONSTRAINT "FK_2474866c8f8e9196ff227a7cbbd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commerce"."orders" DROP CONSTRAINT "FK_772d0ce0473ac2ccfa26060dbe9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commerce"."merchants" DROP CONSTRAINT "FK_601b7984c109a454f72d1f1029f"`,
    );
    await queryRunner.query(
      `DROP TABLE "integration"."reconciliation_matches"`,
    );
    await queryRunner.query(`DROP TABLE "integration"."statement_lines"`);
    await queryRunner.query(`DROP TABLE "integration"."statement_imports"`);
    await queryRunner.query(
      `DROP TYPE "integration"."statement_imports_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "integration"."reconciliation_cases"`);
    await queryRunner.query(
      `DROP TYPE "integration"."reconciliation_cases_exception_category_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "integration"."reconciliation_cases_status_enum"`,
    );
    await queryRunner.query(
      `DROP TABLE "integration"."provider_event_processing"`,
    );
    await queryRunner.query(
      `DROP TYPE "integration"."provider_event_processing_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "integration"."provider_events"`);
    await queryRunner.query(`DROP TABLE "integration"."provider_transactions"`);
    await queryRunner.query(
      `DROP TYPE "integration"."provider_transactions_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "integration"."outbox_messages"`);
    await queryRunner.query(
      `DROP TYPE "integration"."outbox_messages_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "identity"."role_assignments"`);
    await queryRunner.query(
      `DROP TYPE "identity"."role_assignments_scope_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "identity"."roles"`);
    await queryRunner.query(`DROP TABLE "identity"."permissions"`);
    await queryRunner.query(`DROP TABLE "identity"."kyc_documents"`);
    await queryRunner.query(`DROP TABLE "identity"."kyc_verification_cases"`);
    await queryRunner.query(
      `DROP TYPE "identity"."kyc_verification_cases_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "identity"."kyc_profiles"`);
    await queryRunner.query(
      `DROP TYPE "identity"."kyc_profiles_verification_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "identity"."audit_log"`);
    await queryRunner.query(`DROP TABLE "finance"."ledger_entries"`);
    await queryRunner.query(
      `DROP TYPE "finance"."ledger_entries_direction_enum"`,
    );
    await queryRunner.query(`DROP TABLE "finance"."accounts"`);
    await queryRunner.query(`DROP TABLE "finance"."ledger_transactions"`);
    await queryRunner.query(`DROP TABLE "events"."tickets"`);
    await queryRunner.query(`DROP TYPE "events"."tickets_status_enum"`);
    await queryRunner.query(`DROP TABLE "events"."ticket_scan_attempts"`);
    await queryRunner.query(
      `DROP TYPE "events"."ticket_scan_attempts_result_enum"`,
    );
    await queryRunner.query(`DROP TABLE "events"."ticket_reservations"`);
    await queryRunner.query(
      `DROP TYPE "events"."ticket_reservations_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "events"."ticket_inventory"`);
    await queryRunner.query(`DROP TABLE "events"."ticket_types"`);
    await queryRunner.query(`DROP TABLE "events"."signing_keys"`);
    await queryRunner.query(`DROP TYPE "events"."signing_keys_status_enum"`);
    await queryRunner.query(`DROP TABLE "events"."ticket_deliveries"`);
    await queryRunner.query(
      `DROP TYPE "events"."ticket_deliveries_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "events"."ticket_deliveries_channel_enum"`,
    );
    await queryRunner.query(`DROP TABLE "events"."events"`);
    await queryRunner.query(`DROP TYPE "events"."events_status_enum"`);
    await queryRunner.query(`DROP TABLE "content"."media_trend_snapshots"`);
    await queryRunner.query(`DROP TABLE "content"."media_editorial_overrides"`);
    await queryRunner.query(`DROP TABLE "content"."media_discovery_scores"`);
    await queryRunner.query(
      `DROP INDEX "content"."IDX_c3ce53c41c47f61cc90d2a7840"`,
    );
    await queryRunner.query(`DROP TABLE "content"."media_items"`);
    await queryRunner.query(`DROP TYPE "content"."media_items_season_enum"`);
    await queryRunner.query(`DROP TYPE "content"."media_items_status_enum"`);
    await queryRunner.query(
      `DROP TYPE "content"."media_items_media_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "commerce"."refunds"`);
    await queryRunner.query(`DROP TYPE "commerce"."refunds_status_enum"`);
    await queryRunner.query(`DROP TABLE "commerce"."payout_requests"`);
    await queryRunner.query(
      `DROP TYPE "commerce"."payout_requests_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "commerce"."payments"`);
    await queryRunner.query(
      `DROP TYPE "commerce"."payments_payment_method_enum"`,
    );
    await queryRunner.query(`DROP TYPE "commerce"."payments_status_enum"`);
    await queryRunner.query(`DROP TABLE "commerce"."order_items"`);
    await queryRunner.query(
      `DROP TYPE "commerce"."order_items_item_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "commerce"."orders"`);
    await queryRunner.query(`DROP TYPE "commerce"."orders_refund_status_enum"`);
    await queryRunner.query(
      `DROP TYPE "commerce"."orders_fulfillment_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "commerce"."orders_payment_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "commerce"."merchants"`);
    await queryRunner.query(`DROP TYPE "commerce"."merchants_status_enum"`);
    await queryRunner.query(`DROP TABLE "identity"."users"`);
  }
}
