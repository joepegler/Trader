--
-- PostgreSQL database dump
--

-- Dumped from database version 9.5.13
-- Dumped by pg_dump version 9.5.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE ONLY public.trades DROP CONSTRAINT trades_signal_fkey;
ALTER TABLE ONLY public.orders DROP CONSTRAINT position_fk;
ALTER TABLE ONLY public.trades DROP CONSTRAINT trades_pkey;
ALTER TABLE ONLY public.orders DROP CONSTRAINT signals_pkey;
ALTER TABLE ONLY public.positions DROP CONSTRAINT positions_pkey;
ALTER TABLE public.trades ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.positions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.orders ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE public.trades_id_seq;
DROP TABLE public.trades;
DROP SEQUENCE public.signals_id_seq;
DROP SEQUENCE public.positions_id_seq;
DROP TABLE public.positions;
DROP TABLE public.orders;
DROP EXTENSION plpgsql;
DROP SCHEMA public;
--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: 
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: lootuser
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    side text NOT NULL,
    amount real NOT NULL,
    ts timestamp without time zone DEFAULT now() NOT NULL,
    pair text NOT NULL,
    done boolean DEFAULT false,
    position_id integer
);


ALTER TABLE public.orders OWNER TO lootuser;

--
-- Name: positions; Type: TABLE; Schema: public; Owner: lootuser
--

CREATE TABLE public.positions (
    id integer NOT NULL,
    installments integer NOT NULL,
    size real,
    ts timestamp without time zone DEFAULT now() NOT NULL,
    pair text,
    done boolean,
    side text
);


ALTER TABLE public.positions OWNER TO lootuser;

--
-- Name: positions_id_seq; Type: SEQUENCE; Schema: public; Owner: lootuser
--

CREATE SEQUENCE public.positions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.positions_id_seq OWNER TO lootuser;

--
-- Name: positions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: lootuser
--

ALTER SEQUENCE public.positions_id_seq OWNED BY public.positions.id;


--
-- Name: signals_id_seq; Type: SEQUENCE; Schema: public; Owner: lootuser
--

CREATE SEQUENCE public.signals_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.signals_id_seq OWNER TO lootuser;

--
-- Name: signals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: lootuser
--

ALTER SEQUENCE public.signals_id_seq OWNED BY public.orders.id;


--
-- Name: trades; Type: TABLE; Schema: public; Owner: lootuser
--

CREATE TABLE public.trades (
    id bigint NOT NULL,
    order_id integer NOT NULL,
    side text NOT NULL,
    amount real NOT NULL,
    ts timestamp without time zone DEFAULT now() NOT NULL,
    pair text NOT NULL
);


ALTER TABLE public.trades OWNER TO lootuser;

--
-- Name: trades_id_seq; Type: SEQUENCE; Schema: public; Owner: lootuser
--

CREATE SEQUENCE public.trades_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.trades_id_seq OWNER TO lootuser;

--
-- Name: trades_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: lootuser
--

ALTER SEQUENCE public.trades_id_seq OWNED BY public.trades.id;


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: lootuser
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.signals_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: lootuser
--

ALTER TABLE ONLY public.positions ALTER COLUMN id SET DEFAULT nextval('public.positions_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: lootuser
--

ALTER TABLE ONLY public.trades ALTER COLUMN id SET DEFAULT nextval('public.trades_id_seq'::regclass);


--
-- Name: positions_pkey; Type: CONSTRAINT; Schema: public; Owner: lootuser
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_pkey PRIMARY KEY (id);


--
-- Name: signals_pkey; Type: CONSTRAINT; Schema: public; Owner: lootuser
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT signals_pkey PRIMARY KEY (id);


--
-- Name: trades_pkey; Type: CONSTRAINT; Schema: public; Owner: lootuser
--

ALTER TABLE ONLY public.trades
    ADD CONSTRAINT trades_pkey PRIMARY KEY (id);


--
-- Name: position_fk; Type: FK CONSTRAINT; Schema: public; Owner: lootuser
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT position_fk FOREIGN KEY (position_id) REFERENCES public.positions(id);


--
-- Name: trades_signal_fkey; Type: FK CONSTRAINT; Schema: public; Owner: lootuser
--

ALTER TABLE ONLY public.trades
    ADD CONSTRAINT trades_signal_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM postgres;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- PostgreSQL database dump complete
--

