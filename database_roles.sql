--
-- PostgreSQL database cluster dump
--

\restrict GTLY97hf19pm6xnxr3vfIfoLEt4kG3iXfOFky8eYl9b2jocuPD8fLYz8aTaQ0To

SET default_transaction_read_only = off;

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

--
-- Roles
--

CREATE ROLE animanga_admin;
ALTER ROLE animanga_admin WITH SUPERUSER INHERIT CREATEROLE CREATEDB LOGIN REPLICATION BYPASSRLS;

--
-- User Configurations
--








\unrestrict GTLY97hf19pm6xnxr3vfIfoLEt4kG3iXfOFky8eYl9b2jocuPD8fLYz8aTaQ0To

--
-- PostgreSQL database cluster dump complete
--

