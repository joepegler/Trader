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

--
-- Name: positions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: lootuser
--

SELECT pg_catalog.setval('public.positions_id_seq', 129, true);


--
-- Name: signals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: lootuser
--

SELECT pg_catalog.setval('public.signals_id_seq', 263, true);

--
-- Name: trades_id_seq; Type: SEQUENCE SET; Schema: public; Owner: lootuser
--

SELECT pg_catalog.setval('public.trades_id_seq', 1, false);


--
-- PostgreSQL database dump complete
--

