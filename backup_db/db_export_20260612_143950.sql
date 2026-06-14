--
-- PostgreSQL database dump
--

\restrict 9nINoNLv0syXv6dZXmxxKt2tsSZKMPNCDJBIqOViGoW06Lp8tso9VNrZP7SPA45

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

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
-- Name: AssetStatus; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public."AssetStatus" AS ENUM (
    'IN_STOCK',
    'DEPLOYED',
    'MAINTENANCE',
    'FAULTY',
    'DISPOSED',
    'RENTED',
    'INSTALLED',
    'RESERVED'
);


ALTER TYPE public."AssetStatus" OWNER TO admin;

--
-- Name: MoveType; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public."MoveType" AS ENUM (
    'IMPORT',
    'EXPORT',
    'TRANSFER',
    'ASSEMBLE',
    'DISASSEMBLE',
    'DELETE',
    'RESTORE',
    'HARD_DELETE',
    'RENT',
    'RETURN',
    'CREATE_USER',
    'UPDATE_USER',
    'DISABLE_USER',
    'ENABLE_USER',
    'DELETE_USER',
    'RESET_PASSWORD',
    'CREATE_PRODUCT',
    'UPDATE_PRODUCT',
    'DELETE_PRODUCT',
    'CREATE_WAREHOUSE',
    'UPDATE_WAREHOUSE',
    'DELETE_WAREHOUSE',
    'CREATE_RACK',
    'UPDATE_RACK',
    'DELETE_RACK',
    'CREATE_RENTAL',
    'UPDATE_RENTAL',
    'RETURN_RENTAL',
    'DELETE_RENTAL'
);


ALTER TYPE public."MoveType" OWNER TO admin;

--
-- Name: ProductCategory; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public."ProductCategory" AS ENUM (
    'SERVER',
    'MEMORY',
    'STORAGE',
    'CPU',
    'GPU',
    'NETWORK',
    'ACCESSORY'
);


ALTER TYPE public."ProductCategory" OWNER TO admin;

--
-- Name: RackType; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public."RackType" AS ENUM (
    'DATACENTER',
    'STORAGE'
);


ALTER TYPE public."RackType" OWNER TO admin;

--
-- Name: RentalStatus; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public."RentalStatus" AS ENUM (
    'ACTIVE',
    'EXPIRED',
    'RETURNED',
    'CANCELLED'
);


ALTER TYPE public."RentalStatus" OWNER TO admin;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public."Role" AS ENUM (
    'ADMIN',
    'USER'
);


ALTER TYPE public."Role" OWNER TO admin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Asset; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Asset" (
    id text NOT NULL,
    "serialNumber" text NOT NULL,
    status public."AssetStatus" DEFAULT 'IN_STOCK'::public."AssetStatus" NOT NULL,
    "productId" text NOT NULL,
    "warehouseId" text NOT NULL,
    "rackId" text,
    "rackUnit" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "parentId" text,
    notes text,
    "uHeight" integer DEFAULT 1 NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "deletedById" text,
    owner text
);


ALTER TABLE public."Asset" OWNER TO admin;

--
-- Name: Product; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Product" (
    id text NOT NULL,
    name text NOT NULL,
    "modelNumber" text NOT NULL,
    category public."ProductCategory" NOT NULL,
    vendor text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    description text,
    attributes jsonb,
    type text
);


ALTER TABLE public."Product" OWNER TO admin;

--
-- Name: Rack; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Rack" (
    id text NOT NULL,
    name text NOT NULL,
    "totalUnits" integer,
    "warehouseId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    type public."RackType" DEFAULT 'DATACENTER'::public."RackType" NOT NULL
);


ALTER TABLE public."Rack" OWNER TO admin;

--
-- Name: RentalContract; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."RentalContract" (
    id text NOT NULL,
    "customerName" text NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    status public."RentalStatus" DEFAULT 'ACTIVE'::public."RentalStatus" NOT NULL,
    "assetId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "alert14Sent" boolean DEFAULT false NOT NULL,
    "alert1Sent" boolean DEFAULT false NOT NULL,
    "alert3Sent" boolean DEFAULT false NOT NULL,
    "alert7Sent" boolean DEFAULT false NOT NULL,
    "alertExpiredSent" boolean DEFAULT false NOT NULL
);


ALTER TABLE public."RentalContract" OWNER TO admin;

--
-- Name: StockMovement; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."StockMovement" (
    id text NOT NULL,
    "assetId" text,
    type public."MoveType" NOT NULL,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "userId" text NOT NULL,
    "targetUserId" text
);


ALTER TABLE public."StockMovement" OWNER TO admin;

--
-- Name: User; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."User" (
    id text NOT NULL,
    username text NOT NULL,
    "passwordHash" text NOT NULL,
    name text NOT NULL,
    role public."Role" DEFAULT 'USER'::public."Role" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL
);


ALTER TABLE public."User" OWNER TO admin;

--
-- Name: Warehouse; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public."Warehouse" (
    id text NOT NULL,
    name text NOT NULL,
    location text
);


ALTER TABLE public."Warehouse" OWNER TO admin;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO admin;

--
-- Data for Name: Asset; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Asset" (id, "serialNumber", status, "productId", "warehouseId", "rackId", "rackUnit", "createdAt", "updatedAt", "parentId", notes, "uHeight", "deletedAt", "deletedById", owner) FROM stdin;
cmmoniz6v0055nr01eogxg2rs	2212369ABE06	DEPLOYED	cmmlkghcz00125b9ef3p80b8x	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 08:45:26.311	2026-03-13 08:45:26.311	\N	Trong Server cho GTEL mượn	1	\N	\N	STEP
cmmoniz740057nr018wxjru07	S45PNA1N120181	IN_STOCK	cmmlkghcz00125b9ef3p80b8x	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 08:45:26.318	2026-03-13 08:45:26.318	\N		1	\N	\N	STEP
cmmokw4ow002vnr011pw7pmva	WRE0NJ5M MODEL DELLEMC Exos 7E10	IN_STOCK	cmmlkcd4t000t5b9ef58jx0qr	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 07:31:41.121	2026-03-13 07:31:41.121	\N		1	\N	\N	STEP
cmmoll4g5003jnr01z7nnm7ch	1Q7H264	IN_STOCK	cmmol1dza0039nr01t97jside	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 07:51:07.205	2026-03-13 07:51:07.205	\N		1	\N	\N	STEP
cmmoll4im003pnr013f502o9e	BBJ8YM2	IN_STOCK	cmmol3q09003cnr018l4eyoof	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 07:51:07.294	2026-03-13 07:51:07.294	\N		1	\N	\N	STEP
cmmoniz7a0058nr017szdg37r	S45PNA1N120181-1	IN_STOCK	cmmlkikbb00185b9e8320qw8z	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 08:45:26.326	2026-03-13 08:45:26.326	\N		1	\N	\N	STEP
cmmolon19004anr019o14uzdo	FXGG0R2	DEPLOYED	cmmoky55k0031nr01gfipomz7	cmmog1iem0026nr01em9mkkb1	cmmoln2mc0047nr01o7w9ii0f	33	2026-03-13 07:53:51.261	2026-03-13 08:17:32.618	\N	Server mr.Sạ	2	\N	\N	STEP
cmmoniyzh004fnr013e2l9h7i	BTHV72910BVB200MGN	IN_STOCK	cmmlke631000w5b9ekcxj4j0g	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 08:45:26.045	2026-03-13 08:45:26.045	\N		1	\N	\N	STEP
cmmoniyzl004gnr0112rzsx2r	S2HTNX0H408580	DEPLOYED	cmmlkhlhp00155b9ehh53gpb7	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 08:45:26.049	2026-03-13 08:45:26.049	\N	Server backup Pal	1	\N	\N	STEP
cmmoniyzg004enr0187x3rbfw	BTHV72910BZQ200MGN	IN_STOCK	cmmlke631000w5b9ekcxj4j0g	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 08:45:26.044	2026-03-13 08:45:26.044	\N		1	\N	\N	STEP
cmmoniz1r004jnr01zq1nrz17	S662NE0T309225	IN_STOCK	cmmlkhlhp00155b9ehh53gpb7	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 08:45:26.127	2026-03-13 08:45:26.127	\N		1	\N	\N	STEP
cmmoniz30004lnr01nddc7iyu	S662NE0T309218	IN_STOCK	cmmlkhlhp00155b9ehh53gpb7	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 08:45:26.172	2026-03-13 08:45:26.172	\N		1	\N	\N	STEP
cmmoniz3v004pnr01t32e8sj3	S6MTNA0T701184	DEPLOYED	cmmlkikbb00185b9e8320qw8z	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 08:45:26.204	2026-03-13 08:45:26.204	\N	VETC thuê	1	\N	\N	STEP
cmmoniz40004qnr01pg0i5w0j	S5KXNE0N200452	IN_STOCK	cmmlkj9cl001b5b9e8euxbuiv	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 08:45:26.209	2026-03-13 08:45:26.209	\N		1	\N	\N	STEP
cmmoniz4a004snr012nwv3npa	S455NW0R901531	DEPLOYED	cmmlkikbb00185b9e8320qw8z	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 08:45:26.218	2026-03-13 08:45:26.218	\N	VETC thuê	1	\N	\N	STEP
cmmoniz4p004unr01r8xejqqn	S5KXNE0N201190	IN_STOCK	cmmlkj9cl001b5b9e8euxbuiv	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 08:45:26.231	2026-03-13 08:45:26.231	\N		1	\N	\N	STEP
cmmoniz3t004onr01db81w5ng	BTHV72910CM1200MGN	IN_STOCK	cmmlke631000w5b9ekcxj4j0g	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 08:45:26.202	2026-03-13 08:45:26.202	\N		1	\N	\N	STEP
cmmoniz5o004znr01bkwayo6y	S45RNA0NB06296	DEPLOYED	cmmlkfda9000z5b9efulumke5	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 08:45:26.268	2026-03-13 08:45:26.268	\N	Cho anh Thắng mượn 05/03/2026	1	\N	\N	STEP
cmmoniz80005dnr01qck2o72d	S45PNA1N120150	DEPLOYED	cmmlkghcz00125b9ef3p80b8x	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 08:45:26.352	2026-03-13 08:45:26.352	cmmolon19004anr019o14uzdo		1	\N	\N	STEP
cmmoniz7x005cnr0113rrvpey	2212369AC0DC	IN_STOCK	cmmlkghcz00125b9ef3p80b8x	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 08:45:26.349	2026-03-13 08:45:26.349	\N		1	\N	\N	STEP
cmmoniz8a005enr01qvsv5r28	S36HNX0K201352	DEPLOYED	cmmlkghcz00125b9ef3p80b8x	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 08:45:26.362	2026-03-13 08:45:26.362	cmmolon19004anr019o14uzdo		1	\N	\N	STEP
cmmoniz8m005hnr01lbtl79j6	S2HTNX0H406737	DEPLOYED	cmmlkhlhp00155b9ehh53gpb7	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 08:45:26.374	2026-03-13 08:45:26.374	\N	Server backup Pal	1	\N	\N	STEP
cmmokw4o4002tnr01cz3hwxsi	97U0A0QWF74E	DEPLOYED	cmmlkbmr9000q5b9ezfokfmjk	cmmog1iem0026nr01em9mkkb1	cmmoln2mc0047nr01o7w9ii0f	33	2026-03-13 07:31:41.092	2026-03-13 08:48:49.998	cmmolon19004anr019o14uzdo		1	\N	\N	STEP
cmmoll4jj003snr01go5l4yp3	SGH001SWPT	DEPLOYED	cmmokzw780034nr012fk4y49k	cmmog1iem0026nr01em9mkkb1	cmmoln2mc0047nr01o7w9ii0f	\N	2026-03-13 07:51:07.327	2026-03-13 10:03:44.714	\N		1	\N	\N	PAL
cmmoll4fp003inr01ficn1ias	6HWFBD2	RENTED	cmmol3q09003cnr018l4eyoof	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 07:51:07.189	2026-04-02 14:31:18.457	\N		1	\N	\N	STEP
cmmoll4jh003rnr016hbk4xmf	SGH929YWQZ	IN_STOCK	cmmokzw780034nr012fk4y49k	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 07:51:07.326	2026-03-16 10:01:01.225	\N	Trong kho - Trên bàn\n\nIP ILO: 192.168.1.219\nIP Ubuntu: 192.168.1.222\nusername: step3\npassword: 1\n	1	\N	\N	PAL
cmmol7az3003fnr01ct64az1k	7RS49X2	IN_STOCK	cmmoky55k0031nr01gfipomz7	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 07:40:22.479	2026-03-18 09:43:32.125	\N	6 thanh ram của 7V1HH93\n\niRAC:192.168.1.231\nip Proxmox: \nUsername:\nPassword:\n	1	\N	\N	STEP
cmmoll4kq0040nr017gpxgnbt	2MRRJB3	IN_STOCK	cmmoky55k0031nr01gfipomz7	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 07:51:07.37	2026-03-13 10:06:06.125	\N	Trong kho -> cất riêng -> Thùng dưới bàn	1	\N	\N	PAL
cmmoll4kv0041nr01j8uozl91	SGH014X6H6	IN_STOCK	cmmokzw780034nr012fk4y49k	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 07:51:07.376	2026-03-13 10:06:23.447	\N	Trong kho -> cất riêng -> Thùng ASUS\n	1	\N	\N	PAL
cmmoll4kj003znr014bnc1kh8	SGH929YWR1	IN_STOCK	cmmokzw780034nr012fk4y49k	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 07:51:07.364	2026-03-16 10:01:59.816	\N	Trong kho - Trên bàn\n\nIP ILO: 192.168.1.218\nIP Ubuntu: 192.168.1.221\nusername: step2\npassword: 1\n	1	\N	\N	PAL
cmmoll4i7003nnr01sco09soq	SGH014X6HP	IN_STOCK	cmmokzw780034nr012fk4y49k	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 07:51:07.276	2026-03-13 10:06:52.78	\N	Trong kho -> cất riêng -> Thùng dưới bàn\n	1	\N	\N	PAL
cmmoll4jo003tnr01d8zgbeae	SGH014X6HB	IN_STOCK	cmmokzw780034nr012fk4y49k	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 07:51:07.332	2026-03-13 10:08:36.15	\N	Trong kho -> cất riêng -> Thùng dưới bàn	1	\N	\N	PAL
cmmoll4i2003mnr01kbr9mo2d	7V1HH93	IN_STOCK	cmmoky55k0031nr01gfipomz7	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 07:51:07.274	2026-03-13 10:59:04.385	\N		1	\N	\N	STEP
cmmoniz58004wnr017c8ijcpb	S455NC0NB18319	DEPLOYED	cmmlkikbb00185b9e8320qw8z	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 08:45:26.252	2026-05-30 02:19:50.004	cmmoll4kj003znr014bnc1kh8		1	\N	\N	STEP
cmmoll4fn003hnr01jgjfkq3y	BV1HH93	IN_STOCK	cmmoky55k0031nr01gfipomz7	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 07:51:07.187	2026-03-13 10:59:34.219	\N		1	\N	\N	STEP
cmmoniz6j0054nr01feovasyy	S4EGNX0KC03833	IN_STOCK	cmmlkfda9000z5b9efulumke5	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 08:45:26.3	2026-05-30 01:39:15.827	\N	Không tìm thấy trong kho. khả năng ở GTEL	1	\N	\N	STEP
cmmoll4lt0045nr01orh7hath	SGH943Y0J2	IN_STOCK	cmmokzw780034nr012fk4y49k	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 07:51:07.401	2026-03-16 09:25:34.787	\N	Trong kho - Trên bàn\n\nIP ILO: 192.168.1.217\nIP Ubuntu: 192.168.1.220\nusername:step1\npassword:1	1	\N	\N	PAL
cmmoniz5j004ynr01ee2utxvo	BTHV72910BFW200MGN	DEPLOYED	cmmlke631000w5b9ekcxj4j0g	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 08:45:26.263	2026-03-16 09:25:34.795	cmmoll4lt0045nr01orh7hath	Trong Server cho GTEL mượn	1	\N	\N	STEP
cmmokw4ma002pnr0110zzr2m8	WS20B09F MODEL DELLEMC Exos 7E8	DEPLOYED	cmmlkbmr9000q5b9ezfokfmjk	cmmog1iem0026nr01em9mkkb1	cmmoln2mc0047nr01o7w9ii0f	33	2026-03-13 07:31:41.026	2026-03-13 08:48:49.998	cmmolon19004anr019o14uzdo		1	\N	\N	STEP
cmmokw4m6002onr016bzane2w	X5R0A1STFVL8	DEPLOYED	cmmlkbmr9000q5b9ezfokfmjk	cmmog1iem0026nr01em9mkkb1	cmmoln2mc0047nr01o7w9ii0f	33	2026-03-13 07:31:41.022	2026-03-13 08:48:49.998	cmmolon19004anr019o14uzdo		1	\N	\N	STEP
cmmokw4m2002nnr016d0qh65q	X7H0A0B4F74E	DEPLOYED	cmmlkbmr9000q5b9ezfokfmjk	cmmog1iem0026nr01em9mkkb1	cmmoln2mc0047nr01o7w9ii0f	33	2026-03-13 07:31:41.018	2026-03-13 08:48:49.998	cmmolon19004anr019o14uzdo		1	\N	\N	STEP
cmmohabdn002lnr01csstspnh	X7H0A07CF74E	DEPLOYED	cmmlkbmr9000q5b9ezfokfmjk	cmmog1iem0026nr01em9mkkb1	cmmoln2mc0047nr01o7w9ii0f	33	2026-03-13 05:50:44.505	2026-03-13 08:48:49.998	cmmolon19004anr019o14uzdo		1	\N	\N	STEP
cmmog5i4b002enr01f0z835cq	Y8S0A02KF6QE	DEPLOYED	cmmlkbmr9000q5b9ezfokfmjk	cmmog1iem0026nr01em9mkkb1	cmmoln2mc0047nr01o7w9ii0f	33	2026-03-13 05:19:00.347	2026-03-13 08:48:49.998	cmmolon19004anr019o14uzdo		1	\N	\N	STEP
cmmokw4p6002wnr01vri8547m	48E0A15UF6QE	DEPLOYED	cmmlkbmr9000q5b9ezfokfmjk	cmmog1iem0026nr01em9mkkb1	cmmoln2mc0047nr01o7w9ii0f	33	2026-03-13 07:31:41.131	2026-03-13 08:48:49.998	cmmolon19004anr019o14uzdo		1	\N	\N	STEP
cmmokw4om002unr01mki9qf2s	99D0A0J3F6QE	DEPLOYED	cmmlkbmr9000q5b9ezfokfmjk	cmmog1iem0026nr01em9mkkb1	cmmoln2mc0047nr01o7w9ii0f	33	2026-03-13 07:31:41.11	2026-03-13 08:48:49.998	cmmolon19004anr019o14uzdo		1	\N	\N	STEP
cmmoo9jks0061nr01l90q0odw	C29SA1072035BA9564	IN_STOCK	cmmlkn0i4001e5b9etafz9yi4	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:05.788	2026-03-13 09:06:05.788	\N		1	\N	\N	STEP
cmmoo9jki0060nr01j4msp753	U0WG00063774DAA3D0	IN_STOCK	cmmlkn0i4001e5b9etafz9yi4	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:05.778	2026-03-13 09:06:05.778	\N		1	\N	\N	STEP
cmmoo9jkx0062nr01jxam2vss	RVYEC86XNBLOEO	IN_STOCK	cmmlkqlys001k5b9es8qpcyei	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:05.793	2026-03-13 09:06:05.793	\N	SERVER PAL - CHUYEN DU LIEU	1	\N	\N	STEP
cmmoo9jp40068nr01vumrlo5s	RVYEC86XNBLOEB	IN_STOCK	cmmlkqlys001k5b9es8qpcyei	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:05.944	2026-03-13 09:06:05.944	\N	SERVER PAL - CHUYEN DU LIEU	1	\N	\N	STEP
cmmoo9jo60065nr01p0xla45l	RVYEC86XNBLOED	IN_STOCK	cmmlkqlys001k5b9es8qpcyei	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:05.908	2026-03-13 09:06:05.908	\N	SERVER PAL - CHUYEN DU LIEU	1	\N	\N	STEP
cmmoo9jpe0069nr01aocmzyeg	STBPA10730364716CA	IN_STOCK	cmmlkn0i4001e5b9etafz9yi4	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:05.954	2026-03-13 09:06:05.954	\N		1	\N	\N	STEP
cmmoo9joc0066nr01etfmc6vh	SM10A107123539830A	IN_STOCK	cmmlkn0i4001e5b9etafz9yi4	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:05.916	2026-03-13 09:06:05.916	\N		1	\N	\N	STEP
cmmoo9jpy006cnr01miavd9po	RVYEC86XNBLOH1	IN_STOCK	cmmlkqlys001k5b9es8qpcyei	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:05.974	2026-03-13 09:06:05.974	\N	SERVER PAL - CHUYEN DU LIEU	1	\N	\N	STEP
cmmoo9jq7006enr01yjl8xnlu	00LZ00063274B95380	IN_STOCK	cmmlkn0i4001e5b9etafz9yi4	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:05.983	2026-03-13 09:06:05.983	\N		1	\N	\N	STEP
cmmoo9jqe006hnr01e4lxrwx3	Y0AV2U041385465067	IN_STOCK	cmmlkrzrg001n5b9e5361zazr	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:05.99	2026-03-13 09:06:05.99	\N	RAM Của Thịnh Cường	1	\N	\N	Thịnh Cường
cmmoo9jr3006knr010baly989	00LZ00063274B9554F	IN_STOCK	cmmlkn0i4001e5b9etafz9yi4	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:06.015	2026-03-13 09:06:06.015	\N		1	\N	\N	STEP
cmmoo9jrb006lnr017dqismrw	Y12D000919231321D5	DEPLOYED	cmmlktcog001q5b9e6omw3ki5	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:06.023	2026-03-13 09:06:06.023	\N	Cắm vào server Cho Gtel thuê	1	\N	\N	STEP
cmmoo9jre006nnr01h834j296	Y12D000919231321A8	DEPLOYED	cmmlktcog001q5b9e6omw3ki5	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:06.027	2026-03-13 09:06:06.027	\N	Cắm vào server Cho Gtel thuê	1	\N	\N	STEP
cmmoo9jrr006onr013o8f5vyq	Y12D0009192313214F	DEPLOYED	cmmlktcog001q5b9e6omw3ki5	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:06.04	2026-03-13 09:06:06.04	\N	Cắm vào server Cho Gtel thuê	1	\N	\N	STEP
cmmoo9js4006snr01ek2x9azq	Y12D00091923132195	DEPLOYED	cmmlktcog001q5b9e6omw3ki5	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:06.053	2026-03-13 09:06:06.053	\N	Cắm vào server Cho Gtel thuê	1	\N	\N	STEP
cmmoo9js1006rnr01c4cb8fj9	K1B700091125422753	DEPLOYED	cmmlktcog001q5b9e6omw3ki5	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:06.049	2026-03-13 09:06:06.049	\N	Cắm vào server Cho Gtel thuê	1	\N	\N	STEP
cmmoo9jsk006unr01w4guqylu	Y12D000919231321AD	DEPLOYED	cmmlktcog001q5b9e6omw3ki5	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:06.068	2026-03-13 09:06:06.068	\N	Cắm vào server Cho Gtel thuê	1	\N	\N	STEP
cmmoo9jsq006wnr019poednqo	M393A4K40BB2	DEPLOYED	cmmlktcog001q5b9e6omw3ki5	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:06.074	2026-03-13 09:06:06.074	\N	Cắm vào server Cho Gtel thuê	1	\N	\N	STEP
cmmoo9jt1006znr01s6ti7tfc	Y0AV2U04138546CADD	IN_STOCK	cmmlkrzrg001n5b9e5361zazr	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:06.085	2026-03-13 09:06:06.085	\N	RAM Của Thịnh Cường	1	\N	\N	Thịnh Cường
cmmoo9jta0071nr01wdb8fcw3	C13XA1071935A7046D	IN_STOCK	cmmlkn0i4001e5b9etafz9yi4	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:06.095	2026-03-13 09:06:06.095	\N		1	\N	\N	STEP
cmmoo9jtd0072nr012prg50x7	M393A4K40BB2-CTD6Y	DEPLOYED	cmmlktcog001q5b9e6omw3ki5	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:06.097	2026-03-13 09:06:06.097	\N	Cắm vào server Cho Gtel thuê	1	\N	\N	STEP
cmmoo9jte0073nr01h9y5g0v2	SM10A107123539921D	IN_STOCK	cmmlkn0i4001e5b9etafz9yi4	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:06.099	2026-03-13 09:06:06.099	\N		1	\N	\N	STEP
cmmoo9jtz0078nr01tsen3jf0	M393A4K40BB2-CTD	DEPLOYED	cmmlktcog001q5b9e6omw3ki5	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:06.119	2026-03-13 09:06:06.119	\N	Cắm vào server Cho Gtel thuê	1	\N	\N	STEP
cmmoo9ju30079nr01v0rs0mcn	HMA84GR7CJR4N-VKTN	DEPLOYED	cmmlktcog001q5b9e6omw3ki5	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:06.122	2026-03-13 09:06:06.122	\N	Cắm vào server Cho Gtel thuê	1	\N	\N	STEP
cmmoo9ju5007anr01bo300141	DPAH1DA001	IN_STOCK	cmmlkuj0h001t5b9e44f0npid	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:06.125	2026-03-13 09:06:06.125	\N	kho - rút từ dell r630	1	\N	\N	STEP
cmmoo9juf007cnr01l779bz25	DPAH1DA002	IN_STOCK	cmmlkuj0h001t5b9e44f0npid	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:06.136	2026-03-13 09:06:06.136	\N	kho - rút từ dell r630	1	\N	\N	STEP
cmmoo9juo007gnr01zido84zk	SLTCA108294005D7EE	DEPLOYED	cmmlktcog001q5b9e6omw3ki5	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:06.145	2026-03-13 09:06:06.145	\N	Cắm vào server Cho Gtel thuê	1	\N	\N	STEP
cmmoo9jui007enr01xok6t856	HMA84GR7CJR4N-VKTF	DEPLOYED	cmmlktcog001q5b9e6omw3ki5	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:06.139	2026-03-13 09:06:06.139	\N	Cắm vào server Cho Gtel thuê	1	\N	\N	STEP
cmmoo9jv0007inr01z2l9gsjb	HMA84GR7CJR4N-VKTNAA	IN_STOCK	cmmlktcog001q5b9e6omw3ki5	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:06.156	2026-03-13 09:06:06.156	\N	kho - rút từ HPE-SGH001SWPT	1	\N	\N	STEP
cmmoo9jv8007lnr01ieugu1qx	M393A4K40BB2-CTD6QM	IN_STOCK	cmmlktcog001q5b9e6omw3ki5	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:06.164	2026-03-13 09:06:06.164	\N	kho - rút từ HPE-SGH001SWPT	1	\N	\N	STEP
cmmoo9jvf007mnr01z5bkuzqn	00LZ00063274B95384	IN_STOCK	cmmlkn0i4001e5b9etafz9yi4	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:06.171	2026-03-13 09:06:06.171	\N		1	\N	\N	STEP
cmmoo9jvs007qnr010b6fc6ks	STAUA107303649000C	IN_STOCK	cmmlkn0i4001e5b9etafz9yi4	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:06.184	2026-03-13 09:06:06.184	\N		1	\N	\N	STEP
cmmoo9jvw007rnr01oaess5g0	SM10A1071235398419	DEPLOYED	cmmlkn0i4001e5b9etafz9yi4	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:06.188	2026-03-13 09:06:06.188	\N	cắm vào máy chủ cho gtel thuê - mua măy chủ của mcsg	1	\N	\N	STEP
cmmoo9jw8007unr01s95wgkek	RVYEC86XNBLOFY	IN_STOCK	cmmlkqlys001k5b9es8qpcyei	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:06.198	2026-03-13 09:06:06.198	\N	SERVER PAL - CHUYEN DU LIEU	1	\N	\N	STEP
cmmoo9jw1007snr01eupojud6	SM10A1071235398629	DEPLOYED	cmmlkn0i4001e5b9etafz9yi4	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:06.193	2026-03-13 09:06:06.193	\N	cắm vào máy chủ cho gtel thuê - mua măy chủ của mcsg	1	\N	\N	STEP
cmmoo9jx60082nr01nfqgg6kl	RVYEC86XNBLOCW	IN_STOCK	cmmlkqlys001k5b9es8qpcyei	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:06.235	2026-03-13 09:06:06.235	\N	SERVER PAL - CHUYEN DU LIEU	1	\N	\N	STEP
cmmoo9jwd007vnr01e904qil9	RVYEC86XNBLOEI	IN_STOCK	cmmlkqlys001k5b9es8qpcyei	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:06.204	2026-03-13 09:06:06.204	\N	SERVER PAL - CHUYEN DU LIEU	1	\N	\N	STEP
cmmoo9jxp0087nr01teilgqpv	RVYEC86XNBLOGY	IN_STOCK	cmmlkqlys001k5b9es8qpcyei	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:06.253	2026-03-13 09:06:06.253	\N	SERVER PAL - CHUYEN DU LIEU	1	\N	\N	STEP
cmmoo9jwu007znr01tqo5y9r0	RVYEC86XNBLOFO	IN_STOCK	cmmlkqlys001k5b9es8qpcyei	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:06.223	2026-03-13 09:06:06.223	\N	SERVER PAL - CHUYEN DU LIEU	1	\N	\N	STEP
cmmoo9jx10081nr012qggfwsh	RVYEC86XNBLODN	IN_STOCK	cmmlkqlys001k5b9es8qpcyei	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:06.229	2026-03-13 09:06:06.229	\N	SERVER PAL - CHUYEN DU LIEU	1	\N	\N	STEP
cmmoo9jxc0084nr013ldm15dq	RVYEC86XNBLOFV	IN_STOCK	cmmlkqlys001k5b9es8qpcyei	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:06.24	2026-03-13 09:06:06.24	\N	SERVER PAL - CHUYEN DU LIEU	1	\N	\N	STEP
cmmoo9jxu0089nr017ae9rd54	RVYEC86XNBLOES	IN_STOCK	cmmlkqlys001k5b9es8qpcyei	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:06:06.259	2026-03-13 09:06:06.259	\N	SERVER PAL - CHUYEN DU LIEU	1	\N	\N	STEP
cmmooi6gs008dnr018d8d0ueq	L035F348	DEPLOYED	cmmlkvvue001w5b9e0hsl43q4	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:12:48.699	2026-03-13 09:12:48.699	\N	Gắn vào Server GTEL	1	\N	\N	STEP
cmmooi6gl008cnr017j7rtnqk	J944H348	DEPLOYED	cmmlkvvue001w5b9e0hsl43q4	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:12:48.693	2026-03-13 09:12:48.693	\N	Gắn vào Server GTEL	1	\N	\N	STEP
cmmooi6gu008enr016w4sehzf	L704C509-1	IN_STOCK	cmmlkwnsa001z5b9e75244e0q	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:12:48.7	2026-03-13 09:12:48.7	\N	Cần check lại SN	1	\N	\N	STEP
cmmooi6jf008knr01feg87j3s	L704C509	IN_STOCK	cmmlkwnsa001z5b9e75244e0q	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:12:48.795	2026-03-13 09:12:48.795	\N		1	\N	\N	STEP
cmmooi6iy008inr0110w8jbbn	J933J160	DEPLOYED	cmmlkvvue001w5b9e0hsl43q4	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:12:48.778	2026-03-13 09:12:48.778	\N	Gắn vào Server GTEL	1	\N	\N	STEP
cmmooi6im008fnr01djsj9bhn	3342F466	IN_STOCK	cmmlkxfw200225b9e5ir94aqo	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:12:48.767	2026-03-13 09:12:48.767	\N		1	\N	\N	STEP
cmmooouor008pnr01dijfgmbd	CN-OCDC7W-FCP00-971-00Q9-A00	IN_STOCK	cmmlkough001h5b9etmrc58nj	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:18:00.027	2026-03-13 09:18:00.027	\N		1	\N	\N	STEP
cmmooouon008onr01lbyc8uod	CN-OCDC7W-FCP00-98D-003J-A00	IN_STOCK	cmmlkough001h5b9etmrc58nj	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:18:00.024	2026-03-13 09:18:00.024	\N		1	\N	\N	STEP
cmmooouov008qnr01praeofad	CN-OCDC7W-FCP00-999-00FJ-A00	IN_STOCK	cmmlkough001h5b9etmrc58nj	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:18:00.032	2026-03-13 09:18:00.032	\N		1	\N	\N	STEP
cmmooq1cw008wnr01te1pmjrg	CN-0H56H0-5H56H	IN_STOCK	cmmlkzeul00285b9ey9txc0k8	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:18:55.328	2026-03-13 09:18:55.328	\N	GTEL mượn 1 tháng	1	\N	\N	STEP
cmmop0wkp008ynr01ydgckvew	2144037002133	IN_STOCK	cmmofg28n000fnr01ip7n9qfi	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:27:22.345	2026-03-13 09:27:22.345	\N	\N	1	\N	\N	STEP
cmmop20cg0090nr01szss42ck	RFE1818U45603	IN_STOCK	cmmlkym3900255b9e6iepbslr	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:28:13.888	2026-03-13 09:28:13.888	\N		1	\N	\N	STEP
cmmop20ck0091nr01li1xturu	RFE1818U44849	IN_STOCK	cmmlkym3900255b9e6iepbslr	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:28:13.891	2026-03-13 09:28:13.891	\N		1	\N	\N	STEP
cmmop20cp0092nr013knjk7dg	A0369FCB1970 272AD H47819-003	IN_STOCK	cmmlkym3900255b9e6iepbslr	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:28:13.897	2026-03-13 09:28:13.897	\N		1	\N	\N	STEP
cmmop20ew0096nr0175kq8q64	BFE1506K55517	IN_STOCK	cmmlkym3900255b9e6iepbslr	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:28:13.976	2026-03-13 09:28:13.976	\N	CÓ SẴN MODULE	1	\N	\N	STEP
cmmoq6tal009anr01czmj64nw	MXE12L2	IN_STOCK	cmmofj1i3000inr01gmz27neh	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:57.645	2026-03-13 09:59:57.645	\N		1	\N	\N	STEP
cmmoq6tag0099nr01c478k7ty	MXE0KYB	IN_STOCK	cmmofj1i3000inr01gmz27neh	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:57.638	2026-03-13 09:59:57.638	\N		1	\N	\N	STEP
cmmoq6ta90098nr01zv19guzv	MVJ1MN7	IN_STOCK	cmmofj1i3000inr01gmz27neh	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:57.634	2026-03-13 09:59:57.634	\N		1	\N	\N	STEP
cmmoq6tdg009gnr01ilw26lgi	MVJ1MY8	IN_STOCK	cmmofj1i3000inr01gmz27neh	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:57.748	2026-03-13 09:59:57.748	\N		1	\N	\N	STEP
cmmoq6tdl009hnr01zbetwdo0	MVJ1MN0	IN_STOCK	cmmofj1i3000inr01gmz27neh	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:57.752	2026-03-13 09:59:57.752	\N		1	\N	\N	STEP
cmmoq6tcj009dnr01ecyzvo76	MXE0JF5	IN_STOCK	cmmofj1i3000inr01gmz27neh	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:57.715	2026-03-13 09:59:57.715	\N	CMC	1	\N	\N	STEP
cmmoq6tct009fnr01jhpfb4oo	MXE15S9	IN_STOCK	cmmofj1i3000inr01gmz27neh	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:57.725	2026-03-13 09:59:57.725	\N		1	\N	\N	STEP
cmmoq6tef009knr01082vd932	MXE0PB4	IN_STOCK	cmmofj1i3000inr01gmz27neh	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:57.781	2026-03-13 09:59:57.781	\N		1	\N	\N	STEP
cmmoq6teu009lnr017j8xyane	MX80MBX	IN_STOCK	cmmofj1i3000inr01gmz27neh	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:57.798	2026-03-13 09:59:57.798	\N		1	\N	\N	STEP
cmmoq6tf0009nnr018al8a7gq	MX80L57	IN_STOCK	cmmofj1i3000inr01gmz27neh	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:57.8	2026-03-13 09:59:57.8	\N	CMC	1	\N	\N	STEP
cmmoq6tg7009snr01t6oog10l	AD14163Z338	IN_STOCK	cmmofj1i3000inr01gmz27neh	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:57.848	2026-03-13 09:59:57.848	\N	CMC	1	\N	\N	STEP
cmmoq6tgi009tnr01b2cqx7zp	AD14163Z32X	IN_STOCK	cmmofj1i3000inr01gmz27neh	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:57.859	2026-03-13 09:59:57.859	\N		1	\N	\N	STEP
cmmoq6tgn009vnr01f61t2awj	S7268003703	IN_STOCK	cmmofkgiq000lnr01z7v4lpqc	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:57.864	2026-03-13 09:59:57.864	\N	HUAWEI 10GB 1 PORT QUANG	1	\N	\N	STEP
cmmoq6tgq009wnr01enpctkrh	AAF315350000F2V	IN_STOCK	cmmofqf5s000wnr019kvfmzrh	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:57.866	2026-03-13 09:59:57.866	\N		1	\N	\N	STEP
cmmoq6tgy009ynr01f4fatsvv	AAF315350000LGB	IN_STOCK	cmmofqf5s000wnr019kvfmzrh	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:57.875	2026-03-13 09:59:57.875	\N		1	\N	\N	STEP
cmmoq6thb00a0nr01e6lv3zke	263363A03802	IN_STOCK	cmmofltld000onr01mcpwoyah	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:57.888	2026-03-13 09:59:57.888	\N		1	\N	\N	STEP
cmmoq6thl00a3nr01niqvzqyq	JUR184305HH	IN_STOCK	cmmofrxbg0015nr01pwllb6ou	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:57.898	2026-03-13 09:59:57.898	\N	103 MƯỢN	1	\N	\N	STEP
cmmoq6thu00a5nr01svfwj2h6	S+85DLC03D	IN_STOCK	cmmofn1qf000tnr01cpnhkt4b	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:57.907	2026-03-13 09:59:57.907	\N		1	\N	\N	STEP
cmmoq6ti600a8nr01v9nonux1	AA15273RYB3	IN_STOCK	cmmofj1i3000inr01gmz27neh	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:57.918	2026-03-13 09:59:57.918	\N		1	\N	\N	STEP
cmmoq6ti100a7nr01qn9vst5c	AYE02YP	IN_STOCK	cmmofj1i3000inr01gmz27neh	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:57.913	2026-03-13 09:59:57.913	\N		1	\N	\N	STEP
cmmoq6til00acnr01hm9f0mbu	FNS21241WFS	IN_STOCK	cmmofrxbg0015nr01pwllb6ou	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:57.934	2026-03-13 09:59:57.934	\N	103 MƯỢN	1	\N	\N	STEP
cmmoq6tis00adnr015jxdua6l	AYE035R	IN_STOCK	cmmofj1i3000inr01gmz27neh	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:57.94	2026-03-13 09:59:57.94	\N		1	\N	\N	STEP
cmmoq6tj600aenr015e4yvpk6	AGD1633434P	IN_STOCK	cmmofrxbg0015nr01pwllb6ou	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:57.955	2026-03-13 09:59:57.955	\N	103 MƯỢN	1	\N	\N	STEP
cmmoq6tjj00ainr01wy0mjko4	FNS1808037R	IN_STOCK	cmmofrxbg0015nr01pwllb6ou	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:57.966	2026-03-13 09:59:57.966	\N	103 MƯỢN	1	\N	\N	STEP
cmmoq6tjg00ahnr01oeb2tnd3	AYE02YF	IN_STOCK	cmmofj1i3000inr01gmz27neh	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:57.964	2026-03-13 09:59:57.964	\N		1	\N	\N	STEP
cmmoq6tk400annr01ahd62ntg	FNS1808037U	IN_STOCK	cmmofrxbg0015nr01pwllb6ou	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:57.988	2026-03-13 09:59:57.988	\N		1	\N	\N	STEP
cmmoq6tjy00alnr01dchavoo9	AAF3160600006DK	IN_STOCK	cmmofqf5s000wnr019kvfmzrh	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:57.982	2026-03-13 09:59:57.982	\N		1	\N	\N	STEP
cmmoq6tka00aonr01vr7ydsjr	ECL174701BH	IN_STOCK	cmmofrxbg0015nr01pwllb6ou	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:57.994	2026-03-13 09:59:57.994	\N		1	\N	\N	STEP
cmmoq6tki00apnr019f8juqrr	FNS17081MKR	IN_STOCK	cmmofrxbg0015nr01pwllb6ou	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:58.002	2026-03-13 09:59:58.002	\N		1	\N	\N	STEP
cmmoq6tku00asnr012ya158oo	UVQ1ZBZ	IN_STOCK	cmmoft2ir0018nr01q04n8p3s	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:58.014	2026-03-13 09:59:58.014	\N		1	\N	\N	STEP
cmmoq6tmi00b4nr01g4pzsqoj	UAF4144600005Y3	IN_STOCK	cmmofvzsz001hnr01qqyjzijh	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:58.074	2026-03-13 09:59:58.074	\N		1	\N	\N	STEP
cmmoq6tnn00benr011dy46b7c	MY85030ALL	IN_STOCK	cmmofwpni001knr01dduhnmlz	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:58.115	2026-03-13 09:59:58.115	\N		1	\N	\N	STEP
cmmoq6tla00avnr01rhbvy6m7	AAF3154300007R5	IN_STOCK	cmmofqf5s000wnr019kvfmzrh	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:58.03	2026-03-13 09:59:58.03	\N		1	\N	\N	STEP
cmmoq6tmn00b5nr0107cc1oab	QF3003KW	IN_STOCK	cmmofv7x7001enr01wkvv8rbv	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:58.079	2026-03-13 09:59:58.079	\N		1	\N	\N	STEP
cmmoq6tnw00bfnr01hm830zzi	MY850307YP	IN_STOCK	cmmofwpni001knr01dduhnmlz	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:58.125	2026-03-13 10:22:31.544	\N		1	\N	\N	STEP
cmmoq6tlf00awnr01hwt1hdr1	AAF315430000EGU	IN_STOCK	cmmofqf5s000wnr019kvfmzrh	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:58.035	2026-03-13 09:59:58.035	\N		1	\N	\N	STEP
cmmoq6tmt00b6nr01vnzp9h46	AM81MCF	IN_STOCK	cmmoft2ir0018nr01q04n8p3s	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:58.086	2026-03-13 09:59:58.086	\N		1	\N	\N	STEP
cmmoq6tlp00aznr01y0z79dgp	UVQ1ZDA	IN_STOCK	cmmoft2ir0018nr01q04n8p3s	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:58.046	2026-03-13 09:59:58.046	\N		1	\N	\N	STEP
cmmoq6tmx00b7nr01coypu8jn	AM81MJG	IN_STOCK	cmmoft2ir0018nr01q04n8p3s	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:58.09	2026-03-13 09:59:58.09	\N		1	\N	\N	STEP
cmmoq6tlp00aynr018sd426kk	FNS17081BJH	IN_STOCK	cmmofrxbg0015nr01pwllb6ou	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:58.045	2026-03-13 09:59:58.045	\N		1	\N	\N	STEP
cmmoq6tn300b9nr01l91cehgk	SF48258001D9	IN_STOCK	cmmofu32z001bnr01g1qmatnx	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:59:58.095	2026-03-13 09:59:58.095	\N		1	\N	\N	STEP
cmmorno9a00cvnr01bd7ghxcj	HB1B00093742506ECF	DEPLOYED	cmmoraxgp00conr01ha35s1u4	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 10:41:03.886	2026-03-13 10:41:03.886	cmmoll4i7003nnr01sco09soq		1	\N	\N	PAL
cmmorno9m00cwnr01w4ofj5ll	HB1B00093742507052	DEPLOYED	cmmoraxgp00conr01ha35s1u4	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 10:41:03.893	2026-03-13 10:41:03.893	cmmoll4i7003nnr01sco09soq		1	\N	\N	PAL
cmmorno9600cunr01j45pghp1	W0G60009260389511C	DEPLOYED	cmmoraxgp00conr01ha35s1u4	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 10:41:03.882	2026-03-13 10:41:03.882	cmmoll4i7003nnr01sco09soq		1	\N	\N	PAL
cmmornobq00cynr015hm2vg92	W0G60009260389511M	DEPLOYED	cmmoraxgp00conr01ha35s1u4	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 10:41:03.974	2026-03-13 10:41:03.974	cmmoll4i7003nnr01sco09soq		1	\N	\N	PAL
cmmornod300d2nr01je5vuyms	S455NY0R608269	DEPLOYED	cmmlkikbb00185b9e8320qw8z	cmmog2jro002bnr01a7egv5ss	\N	\N	2026-03-13 10:41:04.024	2026-03-13 10:41:04.024	\N		1	\N	\N	PAL
cmmornobw00cznr01wlyw83gb	HB1B00093742506FC5	DEPLOYED	cmmoraxgp00conr01ha35s1u4	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 10:41:03.98	2026-03-13 10:41:03.98	cmmoll4i7003nnr01sco09soq		1	\N	\N	PAL
cmmornodx00d5nr01gq0935x0	HB1B00093742506DBD	DEPLOYED	cmmoraxgp00conr01ha35s1u4	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 10:41:04.054	2026-03-13 10:41:04.054	cmmoll4i7003nnr01sco09soq		1	\N	\N	PAL
cmmornoe500d6nr01hfzwo1j8	S455NY0R608697	DEPLOYED	cmmlkikbb00185b9e8320qw8z	cmmog2jro002bnr01a7egv5ss	\N	\N	2026-03-13 10:41:04.062	2026-03-13 10:41:04.062	\N		1	\N	\N	PAL
cmmornoe900d7nr01qwdqavhp	HB1B00093742506F89	DEPLOYED	cmmoraxgp00conr01ha35s1u4	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 10:41:04.065	2026-03-13 10:41:04.065	cmmoll4i7003nnr01sco09soq		1	\N	\N	PAL
cmmornofc00dcnr01f8iw14f8	S455NY0R608679	DEPLOYED	cmmlkikbb00185b9e8320qw8z	cmmog2jro002bnr01a7egv5ss	\N	\N	2026-03-13 10:41:04.102	2026-03-13 10:41:04.102	\N		1	\N	\N	PAL
cmmornog100dfnr01ljl3a68s	S455NY0R608243	DEPLOYED	cmmlkikbb00185b9e8320qw8z	cmmog2jro002bnr01a7egv5ss	\N	\N	2026-03-13 10:41:04.129	2026-03-13 10:41:04.129	\N		1	\N	\N	PAL
cmmornofu00ddnr010kwyy8og	W0G60009260389511R	DEPLOYED	cmmoraxgp00conr01ha35s1u4	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 10:41:04.122	2026-03-13 10:41:04.122	cmmoll4i7003nnr01sco09soq		1	\N	\N	PAL
cmmornog700dgnr01wnl38suv	S455NY0R608683	DEPLOYED	cmmlkikbb00185b9e8320qw8z	cmmog2jro002bnr01a7egv5ss	\N	\N	2026-03-13 10:41:04.135	2026-03-13 10:41:04.135	\N		1	\N	\N	PAL
cmmornogs00dknr01queid6xo	5CY7428OGU	DEPLOYED	cmmlke631000w5b9ekcxj4j0g	cmmog2jro002bnr01a7egv5ss	\N	\N	2026-03-13 10:41:04.156	2026-03-13 10:41:04.156	\N		1	\N	\N	PAL
cmmornohf00donr018qxujud2	WBM1ZM4M	IN_STOCK	cmmori45v00crnr01pstoxxlf	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 10:41:04.179	2026-03-13 10:41:04.179	\N		1	\N	\N	PAL
cmmornohc00dnnr01nthuclag	WBM1YX75	IN_STOCK	cmmori45v00crnr01pstoxxlf	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 10:41:04.176	2026-03-13 10:41:04.176	\N		1	\N	\N	PAL
cmmornohm00dqnr01lisy65ar	1CI742838F	DEPLOYED	cmmlke631000w5b9ekcxj4j0g	cmmog2jro002bnr01a7egv5ss	\N	\N	2026-03-13 10:41:04.186	2026-03-13 10:41:04.186	\N		1	\N	\N	PAL
cmmornoi400drnr01awptxhx1	S455NY0R608182	DEPLOYED	cmmlkikbb00185b9e8320qw8z	cmmog2jro002bnr01a7egv5ss	\N	\N	2026-03-13 10:41:04.205	2026-03-13 10:41:04.205	\N		1	\N	\N	PAL
cmmornoim00dwnr01x4kv6y1c	W0G60009260389511U	DEPLOYED	cmmoraxgp00conr01ha35s1u4	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 10:41:04.223	2026-03-13 10:41:04.223	cmmoll4i7003nnr01sco09soq		1	\N	\N	PAL
cmmornoir00dxnr01kc53aukt	4002000906032F9BEY	DEPLOYED	cmmoraxgp00conr01ha35s1u4	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 10:41:04.227	2026-03-13 10:41:04.227	cmmoll4i7003nnr01sco09soq		1	\N	\N	PAL
cmmornoix00dynr01rdqcj84e	4002000906032F9BFD	DEPLOYED	cmmoraxgp00conr01ha35s1u4	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 10:41:04.233	2026-03-13 10:41:04.233	cmmoll4i7003nnr01sco09soq		1	\N	\N	PAL
cmmornoje00e2nr01kefntig9	4002000906032F9BE9	DEPLOYED	cmmoraxgp00conr01ha35s1u4	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 10:41:04.25	2026-03-13 10:41:04.25	cmmoll4i7003nnr01sco09soq		1	\N	\N	PAL
cmmsv918f00f3nr01yet6mywv	S455NC0NB17181	DEPLOYED	cmmlkikbb00185b9e8320qw8z	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-16 07:32:44.032	2026-03-18 03:43:39.929	cmmoll4lt0045nr01orh7hath	\N	1	\N	\N	STEP
cmmsq260l00ennr01w0awe7ka	S3BPNX0J807421	DEPLOYED	cmmlkikbb00185b9e8320qw8z	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-16 05:07:25.557	2026-05-30 02:23:59.619	cmmoll4lt0045nr01orh7hath	\N	1	\N	\N	STEP
cmmvj3qng00fhnr01gqeuoioh	SERVER_DEMO	DEPLOYED	cmmol3q09003cnr018l4eyoof	cmmog2jro002bnr01a7egv5ss	\N	\N	2026-03-18 04:16:00.172	2026-03-18 04:16:09.537	\N		1	\N	\N	STEP
cmmvj4mx000fknr01f1syi0zl	RAM_DEMO	IN_STOCK	cmmlkqlys001k5b9es8qpcyei	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-18 04:16:41.988	2026-03-18 04:16:41.988	\N	\N	1	\N	\N	STEP
cmmvj53o700fmnr01wm2umk1o	STORAGE_DEMO	IN_STOCK	cmmlkbmr9000q5b9ezfokfmjk	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-18 04:17:03.703	2026-03-18 04:17:03.703	\N	\N	1	\N	\N	STEP
cmmsv8luc00f1nr0160uuo74y	BTHV73350BC6200MGN	DEPLOYED	cmmlke631000w5b9ekcxj4j0g	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-16 07:32:24.085	2026-05-30 02:22:18.671	cmmoll4jh003rnr016hbk4xmf	\N	1	\N	\N	STEP
cmmsumeu200eunr01gxkoxync	S3BPNX0J805949	RENTED	cmmlkikbb00185b9e8320qw8z	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-16 07:15:08.57	2026-03-29 15:43:46.872	\N	Nguyễn Duy Đại cầm đi 27/03/2026	1	\N	\N	STEP
cmmooouqi008unr01p6awfz5c	CN-OCDC7W-FCP00-97H-00H2-A00	IN_STOCK	cmmlkough001h5b9etmrc58nj	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 09:18:00.09	2026-03-18 07:16:57.314	\N		1	\N	\N	STEP
cmmornogf00dhnr01x1p10jtg	S47NNA0M701140	DEPLOYED	cmmlkhlhp00155b9ehh53gpb7	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 10:41:04.143	2026-04-01 14:05:21.776	cmmoll4fp003inr01ficn1ias		1	\N	\N	PAL
cmmornoj500dznr016mocst7n	S47NNA0MA12497	DEPLOYED	cmmlkhlhp00155b9ehh53gpb7	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-13 10:41:04.241	2026-04-01 14:05:21.776	cmmoll4fp003inr01ficn1ias		1	\N	\N	PAL
cmmvty5ny00g3nr0183omxefl	MTA36ASF4G72PZ-2G9E2VG1942-2	DEPLOYED	cmmoraxgp00conr01ha35s1u4	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-18 09:19:35.47	2026-03-18 09:43:32.137	cmmol7az3003fnr01ct64az1k		1	\N	\N	OBD
cmmspzhm200elnr0149d84hyi	S3BPNX0J807417	IN_STOCK	cmmlkikbb00185b9e8320qw8z	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-16 05:05:20.618	2026-05-30 01:31:35.462	\N		1	\N	\N	STEP
cmmsukn9q00esnr01dvkm535q	BTHV73210C4Q200MGN	IN_STOCK	cmmlke631000w5b9ekcxj4j0g	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-16 07:13:46.191	2026-05-30 01:41:12.589	\N	\N	1	\N	\N	STEP
cmmsuogrq00ewnr014kb49fjd	S3BPNX0J907770	RENTED	cmmlkikbb00185b9e8320qw8z	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-16 07:16:44.39	2026-05-30 01:35:29.189	\N	VETC đã giả ổ cứng 09/04/2026 và hiện tại đang trong kho\n	1	\N	\N	STEP
cmmvty5o700g5nr013vxmszfb	MTA36ASF4G72PZ-2G9E2VG2047	DEPLOYED	cmmoraxgp00conr01ha35s1u4	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-18 09:19:35.479	2026-03-18 09:43:32.137	cmmol7az3003fnr01ct64az1k		1	\N	\N	OBD
cmprplm6b00iznr0147x2i01r	M386A4G40DM0-CPB2QS1612-5	IN_STOCK	cmnfozila00gwnr01sdrpzz3m	cmmofz16h001nnr012j89r8sx	\N	\N	2026-05-30 02:05:54.179	2026-05-30 02:05:54.179	\N	\N	1	\N	\N	\N
cmnfqulcq00h3nr01lmreaql1	M386A4G40DM0-CPB0QE1524-1	IN_STOCK	cmnfozila00gwnr01sdrpzz3m	cmmofz16h001nnr012j89r8sx	\N	\N	2026-04-01 07:48:13.85	2026-05-30 02:10:17.028	\N		1	\N	\N	STEP
cmprpwxdw00j2nr01gthbs7ig	SYTUA1064133B3FF66	IN_STOCK	cmnfozila00gwnr01sdrpzz3m	cmmofz16h001nnr012j89r8sx	\N	\N	2026-05-30 02:14:41.924	2026-05-30 02:14:41.924	\N	\N	1	\N	\N	\N
cmmvty5ng00g0nr01nzejof2q	MTA36ASF4G72PZ-2G9E2UI1931	DEPLOYED	cmmoraxgp00conr01ha35s1u4	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-18 09:19:35.452	2026-03-18 09:43:32.137	cmmol7az3003fnr01ct64az1k		1	\N	\N	OBD
cmmvty5mc00fynr01zjd4urth	MTA36ASF4G72PZ-2G9E2TI2049	DEPLOYED	cmmoraxgp00conr01ha35s1u4	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-18 09:19:35.412	2026-03-18 09:43:32.137	cmmol7az3003fnr01ct64az1k		1	\N	\N	OBD
cmmvty5m900fxnr013nrm7nmd	MTA36ASF4G72PZ-2G9E2VG1942	DEPLOYED	cmmoraxgp00conr01ha35s1u4	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-18 09:19:35.41	2026-03-18 09:43:32.137	cmmol7az3003fnr01ct64az1k		1	\N	\N	OBD
cmmvty5m700fwnr01oxik8rjn	MTA36ASF4G72PZ-2G9E2UI2008	DEPLOYED	cmmoraxgp00conr01ha35s1u4	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-18 09:19:35.408	2026-03-18 09:43:32.137	cmmol7az3003fnr01ct64az1k		1	\N	\N	OBD
cmprpyog100j4nr015x7ml7j5	K0NX00092025E4DB4F	IN_STOCK	cmnfozila00gwnr01sdrpzz3m	cmmofz16h001nnr012j89r8sx	\N	\N	2026-05-30 02:16:03.649	2026-05-30 02:16:03.649	\N	\N	1	\N	\N	\N
cmprqevqo00janr01o955qohq	M393A4K40BB1-CRC0QS1620	DEPLOYED	cmmlkuj0h001t5b9e44f0npid	cmmofz16h001nnr012j89r8sx	\N	\N	2026-05-30 02:28:39.601	2026-05-30 02:32:54.15	cmmoll4lt0045nr01orh7hath		1	\N	\N	STEP
cmprquwc200jhnr018t0d8jtt	M393A4K40BB1-CRC0QS1620-1	DEPLOYED	cmmlkuj0h001t5b9e44f0npid	cmmofz16h001nnr012j89r8sx	\N	\N	2026-05-30 02:41:06.866	2026-05-30 02:41:06.866	cmmoll4lt0045nr01orh7hath		1	\N	\N	\N
cmprquwbx00jfnr01ksdofoc0	M393A4K40BB1-CRC0QS1622-0	DEPLOYED	cmmlkuj0h001t5b9e44f0npid	cmmofz16h001nnr012j89r8sx	\N	\N	2026-05-30 02:41:06.861	2026-05-30 02:41:06.861	cmmoll4lt0045nr01orh7hath		1	\N	\N	\N
cmnfqule500h9nr012mv1m489	M386A4G40DM0-CPB0QE1524-0	IN_STOCK	cmnfozila00gwnr01sdrpzz3m	cmmofz16h001nnr012j89r8sx	\N	\N	2026-04-01 07:48:13.901	2026-04-01 15:16:01.866	\N		1	\N	\N	STEP
cmprquwc000jgnr01w3dbz61b	M393A4K40BB1-CRC0QS1622-1	DEPLOYED	cmmlkuj0h001t5b9e44f0npid	cmmofz16h001nnr012j89r8sx	\N	\N	2026-05-30 02:41:06.864	2026-05-30 02:41:06.864	cmmoll4lt0045nr01orh7hath		1	\N	\N	\N
cmnfqulds00h7nr01squ4qj3j	M386A4G40DM0-CPB2QS1612-3	IN_STOCK	cmnfozila00gwnr01sdrpzz3m	cmmofz16h001nnr012j89r8sx	\N	\N	2026-04-01 07:48:13.887	2026-04-01 15:16:04.118	\N		1	\N	\N	STEP
cmprquwd700jlnr01ln6bbloa	M393A4K40BB1-CRC0QS1609	DEPLOYED	cmmlkuj0h001t5b9e44f0npid	cmmofz16h001nnr012j89r8sx	\N	\N	2026-05-30 02:41:06.908	2026-05-30 02:41:06.908	cmmoll4lt0045nr01orh7hath		1	\N	\N	\N
cmnfquldp00h6nr01g49v6fs1	M386A4G40DM0-CPB2QS1612-2	IN_STOCK	cmnfozila00gwnr01sdrpzz3m	cmmofz16h001nnr012j89r8sx	\N	\N	2026-04-01 07:48:13.885	2026-04-01 15:16:06.183	\N		1	\N	\N	STEP
cmprquwd500jknr015io8pt7q	MTA36ASF4G72PZ-2G3D1QI1825	DEPLOYED	cmmlkuj0h001t5b9e44f0npid	cmmofz16h001nnr012j89r8sx	\N	\N	2026-05-30 02:41:06.905	2026-05-30 02:41:06.905	cmmoll4lt0045nr01orh7hath		1	\N	\N	\N
cmprquwdt00jnnr01dcyh8w49	K059000646174F79BB1646	DEPLOYED	cmmlkuj0h001t5b9e44f0npid	cmmofz16h001nnr012j89r8sx	\N	\N	2026-05-30 02:41:06.929	2026-05-30 02:41:06.929	cmmoll4lt0045nr01orh7hath		1	\N	\N	\N
cmprquwdv00jonr01jl2eqyhg	M393A4K40BB1-CRC0QS1619	DEPLOYED	cmmlkuj0h001t5b9e44f0npid	cmmofz16h001nnr012j89r8sx	\N	\N	2026-05-30 02:41:06.932	2026-05-30 02:41:06.932	cmmoll4lt0045nr01orh7hath		1	\N	\N	\N
cmnfqulcm00h2nr01h9t5hojz	M386A4G40DM0-CPB0QM1541	IN_STOCK	cmnfozila00gwnr01sdrpzz3m	cmmofz16h001nnr012j89r8sx	\N	\N	2026-04-01 07:48:13.846	2026-04-01 15:16:11.102	\N		1	\N	\N	STEP
cmnfqulcj00h1nr01slqr3ir1	M386A4G40DM0-CPB2QS1541	IN_STOCK	cmnfozila00gwnr01sdrpzz3m	cmmofz16h001nnr012j89r8sx	\N	\N	2026-04-01 07:48:13.843	2026-04-01 15:16:13.272	\N		1	\N	\N	STEP
cmmvv31hb00glnr01d0uhrjhv	B118A3004G0	IN_STOCK	cmmvv0pjb00ghnr01oeysb4vk	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-18 09:51:22.943	2026-05-30 01:36:21.869	\N		1	\N	\N	OBD
cmmvv31hd00gmnr019q4ayw3l	2C5849H1SB	IN_STOCK	cmmvv0pjb00ghnr01oeysb4vk	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-18 09:51:22.946	2026-05-30 01:36:59.677	\N		1	\N	\N	OBD
cmmvv31i100gqnr01al4hbnz1	2C5849H1T4	IN_STOCK	cmmvv0pjb00ghnr01oeysb4vk	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-18 09:51:22.969	2026-05-30 01:37:20.55	\N		1	\N	\N	OBD
cmmvv31h500gknr01xkn65apz	B118A30076B	IN_STOCK	cmmvv0pjb00ghnr01oeysb4vk	cmmofz16h001nnr012j89r8sx	\N	\N	2026-03-18 09:51:22.937	2026-05-30 01:37:47.446	\N		1	\N	\N	OBD
cmprp08a700itnr01w0o30ktj	MTA18ASF2G72PDZ-3G2R1UI	IN_STOCK	cmprozi2200iqnr01ib6n7bd5	cmmofz16h001nnr012j89r8sx	cmmofzgsy001qnr01gb1h35hs	\N	2026-05-30 01:49:16.399	2026-05-30 01:49:16.399	\N	\N	1	\N	\N	\N
cmnfqulem00hdnr014n35bux3	M386A4G40DM0-CPB2QS1612-0	IN_STOCK	cmnfozila00gwnr01sdrpzz3m	cmmofz16h001nnr012j89r8sx	\N	\N	2026-04-01 07:48:13.918	2026-05-30 02:03:40.901	\N		1	\N	\N	STEP
cmnfquleb00hanr011shkzagu	M386A4G40DM0-CPB2QS1612-1	IN_STOCK	cmnfozila00gwnr01sdrpzz3m	cmmofz16h001nnr012j89r8sx	\N	\N	2026-04-01 07:48:13.907	2026-05-30 02:03:42.974	\N		1	\N	\N	STEP
cmprplakj00ixnr013painsq5	M386A4G40DM0-CPB2QS1612-4	IN_STOCK	cmnfozila00gwnr01sdrpzz3m	cmmofz16h001nnr012j89r8sx	\N	\N	2026-05-30 02:05:39.139	2026-05-30 02:05:39.139	\N	\N	1	\N	\N	STEP
\.


--
-- Data for Name: Product; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Product" (id, name, "modelNumber", category, vendor, "createdAt", description, attributes, type) FROM stdin;
cmmlkbmr9000q5b9ezfokfmjk	HDD 4TB DELL	HDD-4TB-DELL	STORAGE	DELL	2026-03-11 04:52:26.23		{"type": "HDD", "capacity": "4TB"}	\N
cmmlkcd4t000t5b9ef58jx0qr	HDD 2TB DELL	HDD-2TB-DELL	STORAGE	DELL	2026-03-11 04:53:00.413		{"type": "HDD", "capacity": "2TB"}	\N
cmmlke631000w5b9ekcxj4j0g	SSD 200GB INTEL	SSD-200GB-INTEL	STORAGE	INTEL	2026-03-11 04:54:24.589		{"type": "SSD", "capacity": "200GB", "interface": "SATA", "formFactor": "2.5\\""}	\N
cmmlkfda9000z5b9efulumke5	SSD 240GB SAMSUNG	SSD-240GB-SAMSUNG	STORAGE	SAMSUNG	2026-03-11 04:55:20.578		{"type": "SSD", "capacity": "240GB", "interface": "SATA", "formFactor": "2.5\\""}	\N
cmmlkghcz00125b9ef3p80b8x	SSD 480GB SAMSUNG	SSD-480GB-SAMSUNG	STORAGE	SAMSUNG	2026-03-11 04:56:12.516		{"type": "SSD", "capacity": "480GB", "interface": "SATA", "formFactor": "2.5\\""}	\N
cmmlkhlhp00155b9ehh53gpb7	SSD 960GB SAMSUNG	SSD-960GB-SAMSUNG	STORAGE	SAMSUNG	2026-03-11 04:57:04.525		{"type": "SSD", "capacity": "960GB", "interface": "SATA", "formFactor": "2.5\\""}	\N
cmmlkikbb00185b9e8320qw8z	SSD 1.92TB SAMSUNG	SSD-1.92TB-SAMSUNG	STORAGE	SAMSUNG	2026-03-11 04:57:49.656		{"type": "SSD", "capacity": "1.92TB", "interface": "SATA", "formFactor": "2.5\\""}	\N
cmmlkj9cl001b5b9e8euxbuiv	SSD 7.68TB SAMSUNG	SSD-7.68TB-SAMSUNG	STORAGE	SAMSUNG	2026-03-11 04:58:22.101		{"type": "SSD", "capacity": "7.68TB", "interface": "SATA", "formFactor": "2.5\\""}	\N
cmmlkn0i4001e5b9etafz9yi4	RAM ECC DDR4 64GB 2400T	RAM-ECC-DDR4-64GB-2400T	MEMORY	SAMSUNG	2026-03-11 05:01:17.26		{"speed": "2400T", "capacity": "64GB", "generation": "ECC DDR4"}	\N
cmmlkqlys001k5b9es8qpcyei	RAM ECC DDR4 64GB 2666V	RAM-ECC-DDR4-64GB-2666V	MEMORY	SAMSUNG	2026-03-11 05:04:05.044		{"speed": "2666V", "capacity": "64GB", "generation": "ECC DDR4"}	\N
cmmlkrzrg001n5b9e5361zazr	RAM ECC DDR4 64GB 3200	RAM-ECC-DDR4-64GB-3200	MEMORY	SAMSUNG	2026-03-11 05:05:09.58		{"speed": "3200", "capacity": "64GB", "generation": "ECC DDR4"}	\N
cmmlktcog001q5b9e6omw3ki5	RAM ECC DDR4 32GB 2666V	RAM-ECC-DDR4-32GB-2666V	MEMORY	SAMSUNG	2026-03-11 05:06:12.976		{"speed": "2666V", "capacity": "32GB", "generation": "ECC DDR4"}	\N
cmmlkuj0h001t5b9e44f0npid	RAM ECC DDR4 32GB 2400T	RAM-ECC-DDR4-32GB-2400T	MEMORY	SAMSUNG	2026-03-11 05:07:07.842		{"speed": "2400T", "capacity": "32GB", "generation": "ECC DDR4"}	\N
cmmlkvvue001w5b9e0hsl43q4	CPU PLATIUM 8163	CPU-PLATIUM-8163	CPU	Intel	2026-03-11 05:08:11.126		{"series": "Platinum"}	\N
cmmlkwnsa001z5b9e75244e0q	CPU GOLD 6138T	CPU-GOLD-6138T	CPU	Intel	2026-03-11 05:08:47.338		{"series": "Gold", "generation": "ECC DDR4"}	\N
cmmlkxfw200225b9e5ir94aqo	CPU SILVER 4310	CPU-SILVER-4310	CPU	Intel	2026-03-11 05:09:23.763		{"series": "Silver"}	\N
cmmlkzeul00285b9ey9txc0k8	CARD NIVIDIA M10	CARD-NIVIDIA-M10	GPU	NIVIDIA	2026-03-11 05:10:55.725		{}	\N
cmmll04t0002b5b9ezvb19uce	CARD NVIDIA TESLA A4000	CARD-NVIDIA-TESLA-A4000	GPU	NVIDIA	2026-03-11 05:11:29.365		{}	\N
cmmll11g6002e5b9etyzdhdcw	CARD NVIDIA TESLA A5000	CARD-NVIDIA-TESLA-A5000	GPU	SAMSUNG	2026-03-11 05:12:11.67		{}	\N
cmmoraxgp00conr01ha35s1u4	RAM ECC DDR4 32GB 2933Y	RAM-ECC-DDR4-32GB-2933Y	MEMORY	SAMSUNG	2026-03-13 10:31:09.29		{"speed": "2933Y", "capacity": "32GB", "generation": "ECC DDR4"}	\N
cmmofkgiq000lnr01z7v4lpqc	MODULE HUAWEI 10GB	MODULE-HUAWEI-10GB	ACCESSORY	HUAWEI	2026-03-13 05:02:38.498		{}	MODULE 10GB
cmmofltld000onr01mcpwoyah	MODULE JUPITER NETWORKS 10GB	MODULE-JUPITER-NETWORKS-10GB	ACCESSORY	JUPITER NETWORKS	2026-03-13 05:03:42.097		{}	MODULE 10GB
cmmofj1i3000inr01gmz27neh	MODULE ORACLE 10GB	MODULE-ORACLE-10GB	ACCESSORY	ORACLE	2026-03-13 05:01:32.379		{}	MODULE-10GB
cmmofn1qf000tnr01cpnhkt4b	MODULE MIKROTIK 10GB	MODULE-MIKROTIK-10GB	ACCESSORY	MIKROTIK	2026-03-13 05:04:39.303		{}	MODULE 10GB
cmmofqf5s000wnr019kvfmzrh	MODULE BROCADE 10GB	MODULE-BROCADE-10GB	ACCESSORY	BROCADE	2026-03-13 05:07:16.673		{}	MODULE 10GB
cmmlkough001h5b9etmrc58nj	CARD DELL R740 PCIe NVME	CARD-DELL-R740-PCIe-NVME	ACCESSORY	SAMSUNG	2026-03-11 05:02:42.737		{}	PCLE
cmmlkym3900255b9e6iepbslr	CARD MẠNG 16GB FC	CARD-MANG-16GB-FC	ACCESSORY	SAMSUNG	2026-03-11 05:10:18.454		{}	CARD MẠNG 
cmmofg28n000fnr01ip7n9qfi	CARD WIFI	CARD-WIFI	ACCESSORY	SAMSUNG	2026-03-13 04:59:13.367		{}	CARD WIFI
cmmofrxbg0015nr01pwllb6ou	MODULE CISCO 10GB	MODULE-CISCO-10GB	ACCESSORY	CISCO	2026-03-13 05:08:26.858		{}	MODULE 10GB
cmmoft2ir0018nr01q04n8p3s	MODULE DELL 16GB	MODULE-DELL-16GB	ACCESSORY	DELL	2026-03-13 05:09:20.259		{}	MODULE 16GB
cmmofu32z001bnr01g1qmatnx	MODULE QLOGIC 16GB	MODULE-QLOGIC-16GB	ACCESSORY	QLOGIC	2026-03-13 05:10:07.644		{}	MODULE 16GB
cmmofv7x7001enr01wkvv8rbv	MODULE JUPITER NETWORKS 8GB	MODULE-JUPITER-NETWORKS-8GB	ACCESSORY	JUPITER NETWORKS	2026-03-13 05:11:00.572		{}	MODULE 8GB
cmmofvzsz001hnr01qqyjzijh	MODULE BROCADE 8GB	MODULE-BROCADE-8GB	ACCESSORY	BROCADE	2026-03-13 05:11:36.707		{}	MODULE 8GB
cmmofwpni001knr01dduhnmlz	MODULE HP 8GB	MODULE-HP-8GB	ACCESSORY	HP	2026-03-13 05:12:10.206		{}	MODULE 8GB
cmmokzw780034nr012fk4y49k	HPE DL360 GEN10	HPE-DL360-GEN10	SERVER	HPE	2026-03-13 07:34:36.741		{}	\N
cmmoky55k0031nr01gfipomz7	DELL PowerEdge R740XD	PE-R740XD	SERVER	DELL	2026-03-13 07:33:15.033		{}	\N
cmmol1dza0039nr01t97jside	DELL PowerEdge R750XS	PE-R750XS	SERVER	DELL	2026-03-13 07:35:46.438		{}	\N
cmmol3q09003cnr018l4eyoof	DELL PowerEdge R630	PE-R630	SERVER	DELL	2026-03-13 07:37:35.337		{}	\N
cmmori45v00crnr01pstoxxlf	HDD 2.4TB DELL	HDD-2.4TB-DELL	STORAGE	DELL	2026-03-13 10:36:44.564		{"type": "HDD", "capacity": "2.4TB"}	\N
cmmvv0pjb00ghnr01oeysb4vk	HDD SAS 1.2TB	HDD-SAS-1.2TB	STORAGE	HPE	2026-03-18 09:49:34.151		{"type": "HDD", "capacity": "1.2TB", "interface": "SAS"}	\N
cmnfozila00gwnr01sdrpzz3m	RAM ECC DDR4 32GB 2133P	RAM-ECC-DDR4-32GB-2133P	MEMORY	SAMSUNG	2026-04-01 06:56:04.318		{"speed": "2133P", "capacity": "32GB", "generation": "ECC DDR4"}	\N
cmng4dfn400hznr018ibt8ekz	SSD 1.92TB HPE	SSD-1.92TB-HPE	STORAGE	HPE	2026-04-01 14:06:47.92		{"type": "SSD", "capacity": "1.92TB", "interface": "SATA", "formFactor": "2.5\\""}	\N
cmprozi2200iqnr01ib6n7bd5	RAM ECC DDR4 16GB 3200AA	RAM-ECC-DDR4-16GB-3200AA	MEMORY	TAIWAI	2026-05-30 01:48:42.41		{"speed": "3200AA", "capacity": "16GB", "generation": "ECC DDR4"}	\N
\.


--
-- Data for Name: Rack; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Rack" (id, name, "totalUnits", "warehouseId", "createdAt", type) FROM stdin;
cmmofzgsy001qnr01gb1h35hs	Tủ 1	\N	cmmofz16h001nnr012j89r8sx	2026-03-13 05:14:18.706	STORAGE
cmmofzk6f001tnr0106vqiklq	Tủ 2	\N	cmmofz16h001nnr012j89r8sx	2026-03-13 05:14:23.028	STORAGE
cmmofznr1001wnr010fh0nnxi	Tủ 3	\N	cmmofz16h001nnr012j89r8sx	2026-03-13 05:14:27.709	STORAGE
cmmog04ou0023nr01mqbat12i	Tủ 4	\N	cmmofz16h001nnr012j89r8sx	2026-03-13 05:14:49.662	STORAGE
cmmoln2mc0047nr01o7w9ii0f	R7.04	42	cmmog1iem0026nr01em9mkkb1	2026-03-13 07:52:38.148	DATACENTER
\.


--
-- Data for Name: RentalContract; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."RentalContract" (id, "customerName", "startDate", "endDate", status, "assetId", "createdAt", "updatedAt", "alert14Sent", "alert1Sent", "alert3Sent", "alert7Sent", "alertExpiredSent") FROM stdin;
cmmvpka4300fpnr01ggio3ap2	TechX	2026-03-18 00:00:00	2026-04-18 00:00:00	RETURNED	cmmooouqi008unr01p6awfz5c	2026-03-18 07:16:49.587	2026-03-18 07:16:57.306	f	f	f	f	f
cmnhkosza00ianr0135awwx9g	Mr.Thụ	2026-04-02 00:00:00	2027-04-02 00:00:00	ACTIVE	cmmoll4fp003inr01ficn1ias	2026-04-02 14:31:18.454	2026-04-02 14:31:18.454	f	f	f	f	f
\.


--
-- Data for Name: StockMovement; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."StockMovement" (id, "assetId", type, note, "createdAt", "userId", "targetUserId") FROM stdin;
cmmlk8bhn000n5b9e5id7eljg	\N	CREATE_PRODUCT	Tạo sản phẩm mới: aaa	2026-03-11 04:49:51.659	cmmahv7p600005bumvtjhepyn	\N
cmmlk8jog000p5b9evniyh954	\N	DELETE_PRODUCT	Xóa sản phẩm: aaa	2026-03-11 04:50:02.273	cmmahv7p600005bumvtjhepyn	\N
cmmlkbmrh000s5b9egb4gpkom	\N	CREATE_PRODUCT	Tạo sản phẩm mới: HDD 4TB DELL	2026-03-11 04:52:26.238	cmmahv7p600005bumvtjhepyn	\N
cmmlkcd51000v5b9e2apqtcud	\N	CREATE_PRODUCT	Tạo sản phẩm mới: HDD 2TB DELL	2026-03-11 04:53:00.421	cmmahv7p600005bumvtjhepyn	\N
cmmlke637000y5b9eyv23ir5y	\N	CREATE_PRODUCT	Tạo sản phẩm mới: SSD 200GB INTEL	2026-03-11 04:54:24.595	cmmahv7p600005bumvtjhepyn	\N
cmmlkfdaf00115b9e22szx063	\N	CREATE_PRODUCT	Tạo sản phẩm mới: SSD 240GB SAMSUNG	2026-03-11 04:55:20.583	cmmahv7p600005bumvtjhepyn	\N
cmmlkghd600145b9ek9vmeuc9	\N	CREATE_PRODUCT	Tạo sản phẩm mới: SSD 480GB SAMSUNG	2026-03-11 04:56:12.522	cmmahv7p600005bumvtjhepyn	\N
cmmlkhlhv00175b9eg2mutmh1	\N	CREATE_PRODUCT	Tạo sản phẩm mới: SSD 960GB SAMSUNG	2026-03-11 04:57:04.531	cmmahv7p600005bumvtjhepyn	\N
cmmlkikbh001a5b9e1ee23kgt	\N	CREATE_PRODUCT	Tạo sản phẩm mới: SSD 1.92TB SAMSUNG	2026-03-11 04:57:49.661	cmmahv7p600005bumvtjhepyn	\N
cmmlkj9cr001d5b9eqcvohqhc	\N	CREATE_PRODUCT	Tạo sản phẩm mới: SSD 7.68TB SAMSUNG	2026-03-11 04:58:22.108	cmmahv7p600005bumvtjhepyn	\N
cmmlkn0i8001g5b9eliixkl2c	\N	CREATE_PRODUCT	Tạo sản phẩm mới: RAM ECC DDR4 64GB 2400T	2026-03-11 05:01:17.264	cmmahv7p600005bumvtjhepyn	\N
cmmlkougm001j5b9eozafrwh4	\N	CREATE_PRODUCT	Tạo sản phẩm mới: CARD DELL R740 PCIe NVME	2026-03-11 05:02:42.742	cmmahv7p600005bumvtjhepyn	\N
cmmlkqlyz001m5b9e5h8rmhx4	\N	CREATE_PRODUCT	Tạo sản phẩm mới: RAM ECC DDR4 64GB 2666V	2026-03-11 05:04:05.051	cmmahv7p600005bumvtjhepyn	\N
cmmlkrzrm001p5b9ehr5a65ie	\N	CREATE_PRODUCT	Tạo sản phẩm mới: RAM ECC DDR4 64GB 3200	2026-03-11 05:05:09.586	cmmahv7p600005bumvtjhepyn	\N
cmmlktcoo001s5b9eivn3ozzj	\N	CREATE_PRODUCT	Tạo sản phẩm mới: RAM ECC DDR4 32GB 2666V	2026-03-11 05:06:12.984	cmmahv7p600005bumvtjhepyn	\N
cmmlkuj0t001v5b9ehh4izwb4	\N	CREATE_PRODUCT	Tạo sản phẩm mới: RAM ECC DDR4 32GB 2400T	2026-03-11 05:07:07.853	cmmahv7p600005bumvtjhepyn	\N
cmmlkvvun001y5b9ed0576pq2	\N	CREATE_PRODUCT	Tạo sản phẩm mới: CPU PLATIUM 8163	2026-03-11 05:08:11.135	cmmahv7p600005bumvtjhepyn	\N
cmmlkwnsg00215b9ehlxkvyle	\N	CREATE_PRODUCT	Tạo sản phẩm mới: CPU GOLD 6138T	2026-03-11 05:08:47.344	cmmahv7p600005bumvtjhepyn	\N
cmmlkxfw900245b9e8091mep1	\N	CREATE_PRODUCT	Tạo sản phẩm mới: CPU SILVER 4310	2026-03-11 05:09:23.77	cmmahv7p600005bumvtjhepyn	\N
cmmlkym3e00275b9e10eg49wr	\N	CREATE_PRODUCT	Tạo sản phẩm mới: CARD MẠNG 16GB FC	2026-03-11 05:10:18.459	cmmahv7p600005bumvtjhepyn	\N
cmmlkzeuu002a5b9eyej1vkvl	\N	CREATE_PRODUCT	Tạo sản phẩm mới: CARD NIVIDIA M10	2026-03-11 05:10:55.735	cmmahv7p600005bumvtjhepyn	\N
cmmll04t7002d5b9ej0ukptfq	\N	CREATE_PRODUCT	Tạo sản phẩm mới: CARD NVIDIA TESLA A4000	2026-03-11 05:11:29.371	cmmahv7p600005bumvtjhepyn	\N
cmmll11gf002g5b9e1e6etskm	\N	CREATE_PRODUCT	Tạo sản phẩm mới: CARD NVIDIA TESLA A5000	2026-03-11 05:12:11.68	cmmahv7p600005bumvtjhepyn	\N
cmmofd86j0002nr01tsw2i4t4	\N	CREATE_PRODUCT	Tạo sản phẩm mới: CARD MẠNG 16GB FC	2026-03-13 04:57:01.099	cmmahv7p600005bumvtjhepyn	\N
cmmofdpgf0004nr018y4ny6jo	\N	UPDATE_PRODUCT	Cập nhật sản phẩm: CARD MẠNG 16GB FC	2026-03-13 04:57:23.487	cmmahv7p600005bumvtjhepyn	\N
cmmofeaq90006nr01vv1394c6	\N	UPDATE_PRODUCT	Cập nhật sản phẩm: CARD MẠNG 16GB FC	2026-03-13 04:57:51.057	cmmahv7p600005bumvtjhepyn	\N
cmmofemgn0008nr01ad782fzw	\N	UPDATE_PRODUCT	Cập nhật sản phẩm: CARD DELL R740 PCIe NVME	2026-03-13 04:58:06.263	cmmahv7p600005bumvtjhepyn	\N
cmmofeyxo000anr01n11mk2fp	\N	DELETE_PRODUCT	Xóa sản phẩm: CARD MẠNG 16GB FC	2026-03-13 04:58:22.428	cmmahv7p600005bumvtjhepyn	\N
cmmoffc11000cnr01so24ia75	\N	UPDATE_PRODUCT	Cập nhật sản phẩm: CARD MẠNG 16GB FC	2026-03-13 04:58:39.397	cmmahv7p600005bumvtjhepyn	\N
cmmoffi5b000enr01y2mbczbn	\N	UPDATE_PRODUCT	Cập nhật sản phẩm: CARD MẠNG 16GB FC	2026-03-13 04:58:47.327	cmmahv7p600005bumvtjhepyn	\N
cmmofg28v000hnr01n1h96f2y	\N	CREATE_PRODUCT	Tạo sản phẩm mới: CARD WIFI	2026-03-13 04:59:13.376	cmmahv7p600005bumvtjhepyn	\N
cmmofj1ie000knr01kn68sa7b	\N	CREATE_PRODUCT	Tạo sản phẩm mới: Module Oracle 10GB	2026-03-13 05:01:32.39	cmmahv7p600005bumvtjhepyn	\N
cmmofkgj0000nnr0137jqg3ju	\N	CREATE_PRODUCT	Tạo sản phẩm mới: MODULE HUAWEI 10GB	2026-03-13 05:02:38.509	cmmahv7p600005bumvtjhepyn	\N
cmmofltlq000qnr01r2x0p07t	\N	CREATE_PRODUCT	Tạo sản phẩm mới: MODULE JUPITER NETWORKS 10GB	2026-03-13 05:03:42.11	cmmahv7p600005bumvtjhepyn	\N
cmmofm8kw000snr01n0y80rb1	\N	UPDATE_PRODUCT	Cập nhật sản phẩm: MODULE ORACLE 10GB	2026-03-13 05:04:01.52	cmmahv7p600005bumvtjhepyn	\N
cmmofn1qo000vnr01s73ywvz2	\N	CREATE_PRODUCT	Tạo sản phẩm mới: MODULE MIKROTIK 10GB	2026-03-13 05:04:39.312	cmmahv7p600005bumvtjhepyn	\N
cmmofqf60000ynr019no9ea8p	\N	CREATE_PRODUCT	Tạo sản phẩm mới: MODULE BROCADE 10GB	2026-03-13 05:07:16.68	cmmahv7p600005bumvtjhepyn	\N
cmmofqo360010nr01nx4nqk0y	\N	UPDATE_PRODUCT	Cập nhật sản phẩm: CARD DELL R740 PCIe NVME	2026-03-13 05:07:28.242	cmmahv7p600005bumvtjhepyn	\N
cmmofqs7p0012nr01cquicyyz	\N	UPDATE_PRODUCT	Cập nhật sản phẩm: CARD MẠNG 16GB FC	2026-03-13 05:07:33.589	cmmahv7p600005bumvtjhepyn	\N
cmmofqw0c0014nr016f2b4hsp	\N	UPDATE_PRODUCT	Cập nhật sản phẩm: CARD WIFI	2026-03-13 05:07:38.509	cmmahv7p600005bumvtjhepyn	\N
cmmofrxbu0017nr018del84hj	\N	CREATE_PRODUCT	Tạo sản phẩm mới: MODULE CISCO 10GB	2026-03-13 05:08:26.874	cmmahv7p600005bumvtjhepyn	\N
cmmoft2j1001anr01k4qts5ix	\N	CREATE_PRODUCT	Tạo sản phẩm mới: MODULE DELL 16GB	2026-03-13 05:09:20.27	cmmahv7p600005bumvtjhepyn	\N
cmmofu336001dnr01i27nii6r	\N	CREATE_PRODUCT	Tạo sản phẩm mới: MODULE QLOGIC 16GB	2026-03-13 05:10:07.649	cmmahv7p600005bumvtjhepyn	\N
cmmofv7xf001gnr01mmsz1q70	\N	CREATE_PRODUCT	Tạo sản phẩm mới: MODULE JUPITER NETWORKS 8GB	2026-03-13 05:11:00.579	cmmahv7p600005bumvtjhepyn	\N
cmmofvzt8001jnr01sh4w9dcg	\N	CREATE_PRODUCT	Tạo sản phẩm mới: MODULE BROCADE 8GB	2026-03-13 05:11:36.716	cmmahv7p600005bumvtjhepyn	\N
cmmofwpnt001mnr01i876di73	\N	CREATE_PRODUCT	Tạo sản phẩm mới: MODULE HP 8GB	2026-03-13 05:12:10.217	cmmahv7p600005bumvtjhepyn	\N
cmmofz16q001pnr01yzbqu49h	\N	CREATE_WAREHOUSE	Tạo kho mới: KHO STEP	2026-03-13 05:13:58.466	cmmahv7p600005bumvtjhepyn	\N
cmmofzgtd001snr017gm7iacl	\N	CREATE_RACK	Tạo Rack mới: Tủ 1	2026-03-13 05:14:18.722	cmmahv7p600005bumvtjhepyn	\N
cmmofzk73001vnr01t76ji0v6	\N	CREATE_RACK	Tạo Rack mới: Tủ 2	2026-03-13 05:14:23.103	cmmahv7p600005bumvtjhepyn	\N
cmmofznrd001ynr01g0nuhnth	\N	CREATE_RACK	Tạo Rack mới: Tủ 3	2026-03-13 05:14:27.721	cmmahv7p600005bumvtjhepyn	\N
cmmofzwfv0020nr01nnab4yh9	\N	UPDATE_RACK	Cập nhật Rack: Tủ 2	2026-03-13 05:14:38.971	cmmahv7p600005bumvtjhepyn	\N
cmmog005m0022nr01setouwdj	\N	UPDATE_RACK	Cập nhật Rack: Tủ 3	2026-03-13 05:14:43.786	cmmahv7p600005bumvtjhepyn	\N
cmmog04p50025nr01shiplmr5	\N	CREATE_RACK	Tạo Rack mới: Tủ 4	2026-03-13 05:14:49.673	cmmahv7p600005bumvtjhepyn	\N
cmmog1iet0028nr01w7eir9cm	\N	CREATE_WAREHOUSE	Tạo kho mới: Data Center CMC	2026-03-13 05:15:54.101	cmmahv7p600005bumvtjhepyn	\N
cmmog1p9e002anr01bpsjrle0	\N	UPDATE_WAREHOUSE	Cập nhật kho: Kho STEP	2026-03-13 05:16:02.978	cmmahv7p600005bumvtjhepyn	\N
cmmog2jry002dnr0138ujv21m	\N	CREATE_WAREHOUSE	Tạo kho mới: Data Center VNPT	2026-03-13 05:16:42.526	cmmahv7p600005bumvtjhepyn	\N
cmmog5i4r002fnr01npsydyvm	cmmog5i4b002enr01f0z835cq	IMPORT	Nhập mới thiết bị: Y8S0A02KF6QE. Cỡ: 1U.	2026-03-13 05:19:00.363	cmmahv7p600005bumvtjhepyn	\N
cmmoh9ggm002knr01w2nm0rh2	\N	HARD_DELETE	Xoá vĩnh viễn thiết bị khỏi hệ thống. SN: X7H0A07CF74E	2026-03-13 05:50:04.438	cmmahv7p600005bumvtjhepyn	\N
cmmog7esk002hnr0161aqrpl9	\N	IMPORT	Nhập mới thiết bị: X7H0A07CF74E. Cỡ: 1U.	2026-03-13 05:20:29.348	cmmahv7p600005bumvtjhepyn	\N
cmmoh9dk6002inr01hxmz808e	\N	DELETE	Xóa mềm thiết bị khỏi hệ thống (Đưa vào Recycle Bin). SN: X7H0A07CF74E	2026-03-13 05:50:00.678	cmmahv7p600005bumvtjhepyn	\N
cmmohabdy002mnr01omb1jok0	cmmohabdn002lnr01csstspnh	IMPORT	Nhập mới thiết bị: X7H0A07CF74E. Cỡ: 1U.	2026-03-13 05:50:44.519	cmmahv7p600005bumvtjhepyn	\N
cmmokw4mz002qnr01i8kt0n91	cmmokw4ma002pnr0110zzr2m8	IMPORT	Import hàng loạt từ Excel	2026-03-13 07:31:41.051	cmmahv7p600005bumvtjhepyn	\N
cmmokw4np002rnr01s9qw4iuo	cmmokw4m6002onr016bzane2w	IMPORT	Import hàng loạt từ Excel	2026-03-13 07:31:41.078	cmmahv7p600005bumvtjhepyn	\N
cmmokw4nt002snr012gvymt0a	cmmokw4m2002nnr016d0qh65q	IMPORT	Import hàng loạt từ Excel	2026-03-13 07:31:41.082	cmmahv7p600005bumvtjhepyn	\N
cmmokw4pb002xnr014ihd7wgj	cmmokw4ow002vnr011pw7pmva	IMPORT	Import hàng loạt từ Excel	2026-03-13 07:31:41.136	cmmahv7p600005bumvtjhepyn	\N
cmmokw4pm002ynr01gdv1qbo5	cmmokw4p6002wnr01vri8547m	IMPORT	Import hàng loạt từ Excel	2026-03-13 07:31:41.146	cmmahv7p600005bumvtjhepyn	\N
cmmokw4q7002znr0146p0qhd3	cmmokw4om002unr01mki9qf2s	IMPORT	Import hàng loạt từ Excel	2026-03-13 07:31:41.167	cmmahv7p600005bumvtjhepyn	\N
cmmokw4qd0030nr01aauw7l2n	cmmokw4o4002tnr01cz3hwxsi	IMPORT	Import hàng loạt từ Excel	2026-03-13 07:31:41.174	cmmahv7p600005bumvtjhepyn	\N
cmmoky55u0033nr01pgqct3am	\N	CREATE_PRODUCT	Tạo sản phẩm mới: DELL PowerEdge R740xd	2026-03-13 07:33:15.042	cmmahv7p600005bumvtjhepyn	\N
cmmokzw7i0036nr01aavp35np	\N	CREATE_PRODUCT	Tạo sản phẩm mới: HPE DL360 GEN10	2026-03-13 07:34:36.75	cmmahv7p600005bumvtjhepyn	\N
cmmol0u8v0038nr013yyijlw4	\N	UPDATE_PRODUCT	Cập nhật sản phẩm: DELL PowerEdge R740XD	2026-03-13 07:35:20.862	cmmahv7p600005bumvtjhepyn	\N
cmmol1dzh003bnr01tpjmun08	\N	CREATE_PRODUCT	Tạo sản phẩm mới: DELL PowerEdge R750XS	2026-03-13 07:35:46.445	cmmahv7p600005bumvtjhepyn	\N
cmmol3q0i003enr015bu7ur17	\N	CREATE_PRODUCT	Tạo sản phẩm mới: DELL PowerEdge R630	2026-03-13 07:37:35.346	cmmahv7p600005bumvtjhepyn	\N
cmmol7azg003gnr01pg121jlb	cmmol7az3003fnr01ct64az1k	IMPORT	Import hàng loạt từ Excel	2026-03-13 07:40:22.492	cmmahv7p600005bumvtjhepyn	\N
cmmoll4gs003knr01o6v4cky8	cmmoll4fn003hnr01jgjfkq3y	IMPORT	Import hàng loạt từ Excel	2026-03-13 07:51:07.229	cmmahv7p600005bumvtjhepyn	\N
cmmoll4hz003lnr01j7anlysm	cmmoll4fp003inr01ficn1ias	IMPORT	Import hàng loạt từ Excel	2026-03-13 07:51:07.271	cmmahv7p600005bumvtjhepyn	\N
cmmoll4id003onr01naqzqll8	cmmoll4g5003jnr01z7nnm7ch	IMPORT	Import hàng loạt từ Excel	2026-03-13 07:51:07.285	cmmahv7p600005bumvtjhepyn	\N
cmmoll4iu003qnr01w3mydym3	cmmoll4i7003nnr01sco09soq	IMPORT	Import hàng loạt từ Excel	2026-03-13 07:51:07.302	cmmahv7p600005bumvtjhepyn	\N
cmmoll4jx003unr01ectoe4dd	cmmoll4jj003snr01go5l4yp3	IMPORT	Import hàng loạt từ Excel	2026-03-13 07:51:07.342	cmmahv7p600005bumvtjhepyn	\N
cmmoll4k0003vnr01gdb7i016	cmmoll4jh003rnr016hbk4xmf	IMPORT	Import hàng loạt từ Excel	2026-03-13 07:51:07.344	cmmahv7p600005bumvtjhepyn	\N
cmmoll4k9003xnr0189tsem2c	cmmoll4jo003tnr01d8zgbeae	IMPORT	Import hàng loạt từ Excel	2026-03-13 07:51:07.354	cmmahv7p600005bumvtjhepyn	\N
cmmoll4k8003wnr014s6hwt2f	cmmoll4i2003mnr01kbr9mo2d	IMPORT	Import hàng loạt từ Excel	2026-03-13 07:51:07.353	cmmahv7p600005bumvtjhepyn	\N
cmmoll4ke003ynr01yny8bjjg	cmmoll4im003pnr013f502o9e	IMPORT	Import hàng loạt từ Excel	2026-03-13 07:51:07.358	cmmahv7p600005bumvtjhepyn	\N
cmmoll4kz0042nr01jw71vk9v	cmmoll4kj003znr014bnc1kh8	IMPORT	Import hàng loạt từ Excel	2026-03-13 07:51:07.379	cmmahv7p600005bumvtjhepyn	\N
cmmoll4l90043nr01gomgo1fd	cmmoll4kq0040nr017gpxgnbt	IMPORT	Import hàng loạt từ Excel	2026-03-13 07:51:07.389	cmmahv7p600005bumvtjhepyn	\N
cmmoll4ls0044nr01bnfu0gq8	cmmoll4kv0041nr01j8uozl91	IMPORT	Import hàng loạt từ Excel	2026-03-13 07:51:07.408	cmmahv7p600005bumvtjhepyn	\N
cmmoll4m40046nr017884fuxi	cmmoll4lt0045nr01orh7hath	IMPORT	Import hàng loạt từ Excel	2026-03-13 07:51:07.42	cmmahv7p600005bumvtjhepyn	\N
cmmoln2mo0049nr01jzisv59d	\N	CREATE_RACK	Tạo Rack mới: R7.04	2026-03-13 07:52:38.161	cmmahv7p600005bumvtjhepyn	\N
cmmolon1n004bnr01lhr653gf	cmmolon19004anr019o14uzdo	IMPORT	Nhập mới thiết bị: FXGG0R2. Cỡ: 1U.	2026-03-13 07:53:51.276	cmmahv7p600005bumvtjhepyn	\N
cmmolpzxw004cnr019gfx5m9t	cmmolon19004anr019o14uzdo	TRANSFER	Cập nhật vị trí: Data Center CMC - Tủ: R7.04 - Vị trí U: 33 (Cỡ: 2U). Trạng thái: DEPLOYED. Ghi chú: Không	2026-03-13 07:54:54.644	cmmahv7p600005bumvtjhepyn	\N
cmmomj3s3004dnr01a3w7mvpa	cmmolon19004anr019o14uzdo	TRANSFER	Cập nhật vị trí: Data Center CMC - Tủ: R7.04 - Vị trí U: 33 (Cỡ: 2U). Trạng thái: DEPLOYED. Ghi chú: Server mr.Sạ	2026-03-13 08:17:32.643	cmmahv7p600005bumvtjhepyn	\N
cmmoniz1k004hnr01abiismy9	cmmoniyzh004fnr013e2l9h7i	IMPORT	Import hàng loạt từ Excel	2026-03-13 08:45:26.12	cmmahv7p600005bumvtjhepyn	\N
cmmoniz1p004inr01mteymg0j	cmmoniyzl004gnr0112rzsx2r	IMPORT	Import hàng loạt từ Excel	2026-03-13 08:45:26.126	cmmahv7p600005bumvtjhepyn	\N
cmmoniz1v004knr01cc12niuh	cmmoniyzg004enr0187x3rbfw	IMPORT	Import hàng loạt từ Excel	2026-03-13 08:45:26.131	cmmahv7p600005bumvtjhepyn	\N
cmmoniz3j004nnr01tu889pum	cmmoniz30004lnr01nddc7iyu	IMPORT	Import hàng loạt từ Excel	2026-03-13 08:45:26.192	cmmahv7p600005bumvtjhepyn	\N
cmmoniz3a004mnr018touv4g3	cmmoniz1r004jnr01zq1nrz17	IMPORT	Import hàng loạt từ Excel	2026-03-13 08:45:26.182	cmmahv7p600005bumvtjhepyn	\N
cmmoniz48004rnr016gywyrzg	cmmoniz3v004pnr01t32e8sj3	IMPORT	Import hàng loạt từ Excel	2026-03-13 08:45:26.217	cmmahv7p600005bumvtjhepyn	\N
cmmoniz4i004tnr01w2lh8xom	cmmoniz40004qnr01pg0i5w0j	IMPORT	Import hàng loạt từ Excel	2026-03-13 08:45:26.226	cmmahv7p600005bumvtjhepyn	\N
cmmoniz55004vnr018wkjkrt5	cmmoniz4a004snr012nwv3npa	IMPORT	Import hàng loạt từ Excel	2026-03-13 08:45:26.25	cmmahv7p600005bumvtjhepyn	\N
cmmoniz5j004xnr01kos2mqkh	cmmoniz4p004unr01r8xejqqn	IMPORT	Import hàng loạt từ Excel	2026-03-13 08:45:26.263	cmmahv7p600005bumvtjhepyn	\N
cmmoniz5r0050nr01vkbbx7mh	cmmoniz58004wnr017c8ijcpb	IMPORT	Import hàng loạt từ Excel	2026-03-13 08:45:26.271	cmmahv7p600005bumvtjhepyn	\N
cmmoniz660051nr01b03wt5qo	cmmoniz5o004znr01bkwayo6y	IMPORT	Import hàng loạt từ Excel	2026-03-13 08:45:26.286	cmmahv7p600005bumvtjhepyn	\N
cmmoniz6i0053nr01basqa2xd	cmmoniz5j004ynr01ee2utxvo	IMPORT	Import hàng loạt từ Excel	2026-03-13 08:45:26.297	cmmahv7p600005bumvtjhepyn	\N
cmmoniz6d0052nr0131mjbxiz	cmmoniz3t004onr01db81w5ng	IMPORT	Import hàng loạt từ Excel	2026-03-13 08:45:26.292	cmmahv7p600005bumvtjhepyn	\N
cmmoniz700056nr01smc03d7h	cmmoniz6j0054nr01feovasyy	IMPORT	Import hàng loạt từ Excel	2026-03-13 08:45:26.317	cmmahv7p600005bumvtjhepyn	\N
cmmoniz7d0059nr01j1a9vp5p	cmmoniz6v0055nr01eogxg2rs	IMPORT	Import hàng loạt từ Excel	2026-03-13 08:45:26.33	cmmahv7p600005bumvtjhepyn	\N
cmmoniz7n005anr01mlen161y	cmmoniz740057nr018wxjru07	IMPORT	Import hàng loạt từ Excel	2026-03-13 08:45:26.339	cmmahv7p600005bumvtjhepyn	\N
cmmoniz7s005bnr01y4561lzi	cmmoniz7a0058nr017szdg37r	IMPORT	Import hàng loạt từ Excel	2026-03-13 08:45:26.345	cmmahv7p600005bumvtjhepyn	\N
cmmoniz8x005jnr01jj1w5cdu	cmmoniz8m005hnr01lbtl79j6	IMPORT	Import hàng loạt từ Excel	2026-03-13 08:45:26.386	cmmahv7p600005bumvtjhepyn	\N
cmmoniz8e005fnr01xt1habc7	cmmoniz80005dnr01qck2o72d	IMPORT	Import hàng loạt từ Excel	2026-03-13 08:45:26.366	cmmahv7p600005bumvtjhepyn	\N
cmmoniz8k005gnr01hnl51p8y	cmmoniz7x005cnr0113rrvpey	IMPORT	Import hàng loạt từ Excel	2026-03-13 08:45:26.372	cmmahv7p600005bumvtjhepyn	\N
cmmoniz8r005inr01tp691uf2	cmmoniz8a005enr01qvsv5r28	IMPORT	Import hàng loạt từ Excel	2026-03-13 08:45:26.379	cmmahv7p600005bumvtjhepyn	\N
cmmonkn9h005knr01kqsqsbbq	cmmokw4om002unr01mki9qf2s	TRANSFER	Cập nhật vị trí: Data Center CMC - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: Không	2026-03-13 08:46:44.165	cmmahv7p600005bumvtjhepyn	\N
cmmonkuvt005lnr01a3wr9t93	cmmokw4o4002tnr01cz3hwxsi	TRANSFER	Cập nhật vị trí: Data Center CMC - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: Không	2026-03-13 08:46:54.042	cmmahv7p600005bumvtjhepyn	\N
cmmonl26h005mnr01iwzl3lzp	cmmokw4ma002pnr0110zzr2m8	TRANSFER	Cập nhật vị trí: Data Center CMC - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: Không	2026-03-13 08:47:03.497	cmmahv7p600005bumvtjhepyn	\N
cmmonl8nh005nnr0134c18b8n	cmmokw4m6002onr016bzane2w	TRANSFER	Cập nhật vị trí: Data Center CMC - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: Không	2026-03-13 08:47:11.885	cmmahv7p600005bumvtjhepyn	\N
cmmonlgfc005onr01v7lvij3z	cmmokw4m2002nnr016d0qh65q	TRANSFER	Cập nhật vị trí: Data Center CMC - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: Không	2026-03-13 08:47:21.961	cmmahv7p600005bumvtjhepyn	\N
cmmonln0l005pnr01va8vgnsi	cmmohabdn002lnr01csstspnh	TRANSFER	Cập nhật vị trí: Data Center CMC - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: Không	2026-03-13 08:47:30.501	cmmahv7p600005bumvtjhepyn	\N
cmmonlshn005qnr01s2qxc7r9	cmmog5i4b002enr01f0z835cq	TRANSFER	Cập nhật vị trí: Data Center CMC - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: Không	2026-03-13 08:47:37.595	cmmahv7p600005bumvtjhepyn	\N
cmmonm403005rnr01byv96bzh	cmmokw4p6002wnr01vri8547m	TRANSFER	Cập nhật vị trí: Data Center CMC - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: Không	2026-03-13 08:47:52.516	cmmahv7p600005bumvtjhepyn	\N
cmmonncd4005snr01kf0smi97	cmmokw4p6002wnr01vri8547m	ASSEMBLE	Lắp ráp vào thiết bị mẹ [SN: FXGG0R2].	2026-03-13 08:48:50.008	cmmahv7p600005bumvtjhepyn	\N
cmmonncd4005tnr015k7z7qkv	cmmokw4om002unr01mki9qf2s	ASSEMBLE	Lắp ráp vào thiết bị mẹ [SN: FXGG0R2].	2026-03-13 08:48:50.008	cmmahv7p600005bumvtjhepyn	\N
cmmonncd5005unr012122ei6p	cmmokw4o4002tnr01cz3hwxsi	ASSEMBLE	Lắp ráp vào thiết bị mẹ [SN: FXGG0R2].	2026-03-13 08:48:50.008	cmmahv7p600005bumvtjhepyn	\N
cmmonncd5005vnr01kwtdwn8w	cmmokw4ma002pnr0110zzr2m8	ASSEMBLE	Lắp ráp vào thiết bị mẹ [SN: FXGG0R2].	2026-03-13 08:48:50.008	cmmahv7p600005bumvtjhepyn	\N
cmmonncd5005wnr01hlotxw3l	cmmokw4m6002onr016bzane2w	ASSEMBLE	Lắp ráp vào thiết bị mẹ [SN: FXGG0R2].	2026-03-13 08:48:50.008	cmmahv7p600005bumvtjhepyn	\N
cmmonncd5005xnr012srxn3yt	cmmokw4m2002nnr016d0qh65q	ASSEMBLE	Lắp ráp vào thiết bị mẹ [SN: FXGG0R2].	2026-03-13 08:48:50.008	cmmahv7p600005bumvtjhepyn	\N
cmmonncd5005ynr01ay7gltyr	cmmohabdn002lnr01csstspnh	ASSEMBLE	Lắp ráp vào thiết bị mẹ [SN: FXGG0R2].	2026-03-13 08:48:50.008	cmmahv7p600005bumvtjhepyn	\N
cmmonncd5005znr01nixfy36m	cmmog5i4b002enr01f0z835cq	ASSEMBLE	Lắp ráp vào thiết bị mẹ [SN: FXGG0R2].	2026-03-13 08:48:50.008	cmmahv7p600005bumvtjhepyn	\N
cmmoo9jnn0063nr01g0dwbvwv	cmmoo9jks0061nr01l90q0odw	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:05.891	cmmahv7p600005bumvtjhepyn	\N
cmmoo9jnu0064nr014i1a50bk	cmmoo9jki0060nr01j4msp753	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:05.898	cmmahv7p600005bumvtjhepyn	\N
cmmoo9joj0067nr01xqz6v0ls	cmmoo9jkx0062nr01jxam2vss	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:05.923	cmmahv7p600005bumvtjhepyn	\N
cmmoo9jpk006anr01lhgiuyea	cmmoo9jp40068nr01vumrlo5s	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:05.96	cmmahv7p600005bumvtjhepyn	\N
cmmoo9jpq006bnr01v3jca8md	cmmoo9jpe0069nr01aocmzyeg	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:05.966	cmmahv7p600005bumvtjhepyn	\N
cmmoo9jqd006gnr01cjy4u5vn	cmmoo9jpy006cnr01miavd9po	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:05.989	cmmahv7p600005bumvtjhepyn	\N
cmmoo9jq9006fnr01ljp3esgu	cmmoo9joc0066nr01etfmc6vh	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:05.985	cmmahv7p600005bumvtjhepyn	\N
cmmoo9jqt006inr011um4wdiq	cmmoo9jq7006enr01yjl8xnlu	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:06.005	cmmahv7p600005bumvtjhepyn	\N
cmmoo9jq2006dnr01r2ofwi0j	cmmoo9jo60065nr01p0xla45l	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:05.978	cmmahv7p600005bumvtjhepyn	\N
cmmoo9jqz006jnr01agco9619	cmmoo9jqe006hnr01e4lxrwx3	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:06.012	cmmahv7p600005bumvtjhepyn	\N
cmmoo9jrd006mnr01a0ruh91p	cmmoo9jr3006knr010baly989	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:06.026	cmmahv7p600005bumvtjhepyn	\N
cmmoo9jrw006pnr01guiktrx7	cmmoo9jrb006lnr017dqismrw	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:06.044	cmmahv7p600005bumvtjhepyn	\N
cmmoo9jry006qnr01pzlie70u	cmmoo9jre006nnr01h834j296	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:06.047	cmmahv7p600005bumvtjhepyn	\N
cmmoo9js7006tnr01xm8g8lj5	cmmoo9jrr006onr013o8f5vyq	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:06.055	cmmahv7p600005bumvtjhepyn	\N
cmmoo9jso006vnr01c1rivswn	cmmoo9js4006snr01ek2x9azq	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:06.072	cmmahv7p600005bumvtjhepyn	\N
cmmoo9jst006xnr011n143vkw	cmmoo9js1006rnr01c4cb8fj9	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:06.078	cmmahv7p600005bumvtjhepyn	\N
cmmoo9jsu006ynr01nu7838y4	cmmoo9jsk006unr01w4guqylu	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:06.079	cmmahv7p600005bumvtjhepyn	\N
cmmoo9jt10070nr01dzci3cbc	cmmoo9jsq006wnr019poednqo	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:06.086	cmmahv7p600005bumvtjhepyn	\N
cmmoo9jth0074nr01eqik3if7	cmmoo9jt1006znr01s6ti7tfc	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:06.101	cmmahv7p600005bumvtjhepyn	\N
cmmoo9jtp0075nr01c683x9um	cmmoo9jta0071nr01wdb8fcw3	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:06.11	cmmahv7p600005bumvtjhepyn	\N
cmmoo9jts0076nr01kv92tryu	cmmoo9jtd0072nr012prg50x7	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:06.112	cmmahv7p600005bumvtjhepyn	\N
cmmoo9jtu0077nr01o9e162lr	cmmoo9jte0073nr01h9y5g0v2	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:06.115	cmmahv7p600005bumvtjhepyn	\N
cmmoo9ju9007bnr01fnter63b	cmmoo9jtz0078nr01tsen3jf0	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:06.13	cmmahv7p600005bumvtjhepyn	\N
cmmoo9juh007dnr0163s20l9v	cmmoo9ju30079nr01v0rs0mcn	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:06.137	cmmahv7p600005bumvtjhepyn	\N
cmmoo9jum007fnr01dnl1rooa	cmmoo9ju5007anr01bo300141	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:06.143	cmmahv7p600005bumvtjhepyn	\N
cmmoo9jus007hnr016mwyet03	cmmoo9juf007cnr01l779bz25	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:06.148	cmmahv7p600005bumvtjhepyn	\N
cmmoo9jv2007jnr01ybmlxad8	cmmoo9jui007enr01xok6t856	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:06.158	cmmahv7p600005bumvtjhepyn	\N
cmmoo9jv3007knr01d5sf1j5b	cmmoo9juo007gnr01zido84zk	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:06.159	cmmahv7p600005bumvtjhepyn	\N
cmmoo9jvi007nnr01ubjrlfqm	cmmoo9jv0007inr01z2l9gsjb	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:06.175	cmmahv7p600005bumvtjhepyn	\N
cmmoo9jvl007onr01cu8w2g4u	cmmoo9jv8007lnr01ieugu1qx	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:06.177	cmmahv7p600005bumvtjhepyn	\N
cmmoo9jvn007pnr01nkuvj974	cmmoo9jvf007mnr01z5bkuzqn	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:06.179	cmmahv7p600005bumvtjhepyn	\N
cmmoo9jwv0080nr01499ivgjq	cmmoo9jwd007vnr01e904qil9	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:06.223	cmmahv7p600005bumvtjhepyn	\N
cmmoo9jxz008anr01un6mtf5h	cmmoo9jxp0087nr01teilgqpv	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:06.263	cmmahv7p600005bumvtjhepyn	\N
cmmoo9jw3007tnr016ls1hqis	cmmoo9jvs007qnr010b6fc6ks	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:06.195	cmmahv7p600005bumvtjhepyn	\N
cmmoo9jx70083nr01i5zkjmjq	cmmoo9jwu007znr01tqo5y9r0	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:06.236	cmmahv7p600005bumvtjhepyn	\N
cmmoo9jwg007wnr01o8wot4nt	cmmoo9jvw007rnr01oaess5g0	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:06.209	cmmahv7p600005bumvtjhepyn	\N
cmmoo9jxf0085nr019lldo4yz	cmmoo9jx10081nr012qggfwsh	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:06.243	cmmahv7p600005bumvtjhepyn	\N
cmmoo9jwn007xnr016p5d9mz8	cmmoo9jw1007snr01eupojud6	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:06.215	cmmahv7p600005bumvtjhepyn	\N
cmmoo9jxr0088nr01riarq9gz	cmmoo9jx60082nr01nfqgg6kl	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:06.254	cmmahv7p600005bumvtjhepyn	\N
cmmoo9jwr007ynr01nante2ll	cmmoo9jw8007unr01s95wgkek	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:06.22	cmmahv7p600005bumvtjhepyn	\N
cmmoo9jxj0086nr015u2pjgo8	cmmoo9jxc0084nr013ldm15dq	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:06.247	cmmahv7p600005bumvtjhepyn	\N
cmmoo9jy2008bnr01jbxrpabj	cmmoo9jxu0089nr017ae9rd54	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:06:06.267	cmmahv7p600005bumvtjhepyn	\N
cmmooi6j0008jnr01h9c0cat9	cmmooi6gu008enr016w4sehzf	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:12:48.781	cmmahv7p600005bumvtjhepyn	\N
cmmooi6is008gnr01dk066ifj	cmmooi6gl008cnr017j7rtnqk	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:12:48.772	cmmahv7p600005bumvtjhepyn	\N
cmmooi6iv008hnr01s304fnja	cmmooi6gs008dnr018d8d0ueq	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:12:48.775	cmmahv7p600005bumvtjhepyn	\N
cmmooi6jj008lnr01bmu4inut	cmmooi6jf008knr01feg87j3s	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:12:48.799	cmmahv7p600005bumvtjhepyn	\N
cmmooi6k1008mnr01a77408xq	cmmooi6iy008inr0110w8jbbn	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:12:48.818	cmmahv7p600005bumvtjhepyn	\N
cmmooi6k8008nnr01nzbwz1fw	cmmooi6im008fnr01djsj9bhn	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:12:48.825	cmmahv7p600005bumvtjhepyn	\N
cmmoooupm008snr01l6y88gcb	cmmooouor008pnr01dijfgmbd	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:18:00.058	cmmahv7p600005bumvtjhepyn	\N
cmmooouph008rnr01np3aj9bc	cmmooouon008onr01lbyc8uod	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:18:00.054	cmmahv7p600005bumvtjhepyn	\N
cmmoooupt008tnr01tnlqlr2d	cmmooouov008qnr01praeofad	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:18:00.066	cmmahv7p600005bumvtjhepyn	\N
cmmooour7008vnr01vyomspsk	cmmooouqi008unr01p6awfz5c	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:18:00.115	cmmahv7p600005bumvtjhepyn	\N
cmmooq1d2008xnr01ceqqc67t	cmmooq1cw008wnr01te1pmjrg	IMPORT	Nhập mới thiết bị: CN-0H56H0-5H56H. Cỡ: 1U.	2026-03-13 09:18:55.334	cmmahv7p600005bumvtjhepyn	\N
cmmop0wkx008znr01tq3gyjay	cmmop0wkp008ynr01ydgckvew	IMPORT	Nhập mới thiết bị: 2144037002133. Cỡ: 1U.	2026-03-13 09:27:22.353	cmmahv7p600005bumvtjhepyn	\N
cmmop20da0093nr01vv0nc4w9	cmmop20cg0090nr01szss42ck	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:28:13.918	cmmahv7p600005bumvtjhepyn	\N
cmmop20dy0094nr01nop0rfeb	cmmop20ck0091nr01li1xturu	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:28:13.942	cmmahv7p600005bumvtjhepyn	\N
cmmop20e60095nr01wf61es7g	cmmop20cp0092nr013knjk7dg	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:28:13.95	cmmahv7p600005bumvtjhepyn	\N
cmmop20fq0097nr01b4k16x4p	cmmop20ew0096nr0175kq8q64	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:28:14.006	cmmahv7p600005bumvtjhepyn	\N
cmmoq6tb0009bnr017x4yg967	cmmoq6tal009anr01czmj64nw	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:57.661	cmmahv7p600005bumvtjhepyn	\N
cmmoq6tc6009cnr01gki9i61s	cmmoq6tag0099nr01c478k7ty	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:57.703	cmmahv7p600005bumvtjhepyn	\N
cmmoq6tcq009enr01d8vz5n9i	cmmoq6ta90098nr01zv19guzv	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:57.723	cmmahv7p600005bumvtjhepyn	\N
cmmoq6tdz009inr01s0o35f9z	cmmoq6tdg009gnr01ilw26lgi	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:57.767	cmmahv7p600005bumvtjhepyn	\N
cmmoq6te3009jnr0148zbyca9	cmmoq6tdl009hnr01zbetwdo0	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:57.771	cmmahv7p600005bumvtjhepyn	\N
cmmoq6tf2009onr0164icch6j	cmmoq6tef009knr01082vd932	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:57.806	cmmahv7p600005bumvtjhepyn	\N
cmmoq6tex009mnr01ckctagqm	cmmoq6tcj009dnr01ecyzvo76	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:57.802	cmmahv7p600005bumvtjhepyn	\N
cmmoq6tft009qnr01ey2zqtjc	cmmoq6teu009lnr017j8xyane	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:57.832	cmmahv7p600005bumvtjhepyn	\N
cmmoq6tfa009pnr01a1q5x6jw	cmmoq6tct009fnr01jhpfb4oo	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:57.814	cmmahv7p600005bumvtjhepyn	\N
cmmoq6tfx009rnr015bqhmnsw	cmmoq6tf0009nnr018al8a7gq	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:57.838	cmmahv7p600005bumvtjhepyn	\N
cmmoq6tgk009unr01acdh1gxw	cmmoq6tg7009snr01t6oog10l	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:57.861	cmmahv7p600005bumvtjhepyn	\N
cmmoq6tgx009xnr01ohtmoybu	cmmoq6tgi009tnr01b2cqx7zp	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:57.873	cmmahv7p600005bumvtjhepyn	\N
cmmoq6th5009znr01zmmpheo7	cmmoq6tgn009vnr01f61t2awj	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:57.88	cmmahv7p600005bumvtjhepyn	\N
cmmoq6thh00a2nr01u472mco6	cmmoq6tgy009ynr01f4fatsvv	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:57.893	cmmahv7p600005bumvtjhepyn	\N
cmmoq6thf00a1nr01r40z8avc	cmmoq6tgq009wnr01enpctkrh	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:57.892	cmmahv7p600005bumvtjhepyn	\N
cmmoq6thq00a4nr01ui17462z	cmmoq6thb00a0nr01e6lv3zke	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:57.903	cmmahv7p600005bumvtjhepyn	\N
cmmoq6thz00a6nr01ln7igiog	cmmoq6thl00a3nr01niqvzqyq	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:57.911	cmmahv7p600005bumvtjhepyn	\N
cmmoq6tia00a9nr01arqjs34a	cmmoq6thu00a5nr01svfwj2h6	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:57.921	cmmahv7p600005bumvtjhepyn	\N
cmmoq6tik00abnr01t7k5uaw3	cmmoq6ti100a7nr01qn9vst5c	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:57.932	cmmahv7p600005bumvtjhepyn	\N
cmmoq6tih00aanr0101hnty6g	cmmoq6ti600a8nr01v9nonux1	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:57.93	cmmahv7p600005bumvtjhepyn	\N
cmmoq6tj800afnr01c44go68r	cmmoq6tis00adnr015jxdua6l	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:57.956	cmmahv7p600005bumvtjhepyn	\N
cmmoq6tjc00agnr01g47idsmd	cmmoq6til00acnr01hm9f0mbu	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:57.96	cmmahv7p600005bumvtjhepyn	\N
cmmoq6tjj00ajnr01ltkh7jxq	cmmoq6tj600aenr015e4yvpk6	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:57.968	cmmahv7p600005bumvtjhepyn	\N
cmmoq6tjw00aknr01x9jo8hus	cmmoq6tjg00ahnr01oeb2tnd3	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:57.98	cmmahv7p600005bumvtjhepyn	\N
cmmoq6tk100amnr01v2512em6	cmmoq6tjj00ainr01wy0mjko4	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:57.985	cmmahv7p600005bumvtjhepyn	\N
cmmoq6tkm00aqnr01pjvajp7d	cmmoq6tjy00alnr01dchavoo9	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:58.007	cmmahv7p600005bumvtjhepyn	\N
cmmoq6tkq00arnr01saiqftwg	cmmoq6tk400annr01ahd62ntg	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:58.01	cmmahv7p600005bumvtjhepyn	\N
cmmoq6tku00atnr01hpqxmluw	cmmoq6tka00aonr01vr7ydsjr	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:58.015	cmmahv7p600005bumvtjhepyn	\N
cmmoq6tl200aunr01g36qti7e	cmmoq6tki00apnr019f8juqrr	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:58.022	cmmahv7p600005bumvtjhepyn	\N
cmmoq6tli00axnr01vdmi0xsk	cmmoq6tku00asnr012ya158oo	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:58.039	cmmahv7p600005bumvtjhepyn	\N
cmmoq6tlr00b0nr01wo28dqz0	cmmoq6tla00avnr01rhbvy6m7	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:58.048	cmmahv7p600005bumvtjhepyn	\N
cmmoq6tm000b1nr01bxcd9cbi	cmmoq6tlf00awnr01hwt1hdr1	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:58.056	cmmahv7p600005bumvtjhepyn	\N
cmmoq6tm600b2nr013qurumb7	cmmoq6tlp00aynr018sd426kk	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:58.062	cmmahv7p600005bumvtjhepyn	\N
cmmoq6tmb00b3nr01p6vl0eld	cmmoq6tlp00aznr01y0z79dgp	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:58.064	cmmahv7p600005bumvtjhepyn	\N
cmmoq6tnj00bcnr01iclt7dsm	cmmoq6tmx00b7nr01coypu8jn	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:58.111	cmmahv7p600005bumvtjhepyn	\N
cmmoqboii00binr017ol1ui5x	cmmoll4jj003snr01go5l4yp3	TRANSFER	Cập nhật vị trí: Data Center CMC - Tủ: R7.04. Trạng thái: DEPLOYED. Ghi chú: Không	2026-03-13 10:03:44.731	cmmahv7p600005bumvtjhepyn	\N
cmmoq6tmz00b8nr015jpvd7za	cmmoq6tmi00b4nr01g4pzsqoj	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:58.091	cmmahv7p600005bumvtjhepyn	\N
cmmoq6to200bgnr01is88gilx	cmmoq6tnn00benr011dy46b7c	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:58.13	cmmahv7p600005bumvtjhepyn	\N
cmmoq6tna00banr01z5lq4tjs	cmmoq6tmn00b5nr0107cc1oab	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:58.103	cmmahv7p600005bumvtjhepyn	\N
cmmoq6to800bhnr01vwka4k12	cmmoq6tnw00bfnr01hm830zzi	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:58.136	cmmahv7p600005bumvtjhepyn	\N
cmmoq6tnf00bbnr01jb2j6lkc	cmmoq6tmt00b6nr01vnzp9h46	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:58.107	cmmahv7p600005bumvtjhepyn	\N
cmmoq6tnk00bdnr01qxc8sgon	cmmoq6tn300b9nr01l91cehgk	IMPORT	Import hàng loạt từ Excel	2026-03-13 09:59:58.112	cmmahv7p600005bumvtjhepyn	\N
cmmoqdfc000bjnr01nhaic55a	cmmoll4jh003rnr016hbk4xmf	TRANSFER	Cập nhật vị trí: Kho STEP - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: Trong kho - Trên bàn\n	2026-03-13 10:05:06.144	cmmahv7p600005bumvtjhepyn	\N
cmmoqdtmp00bknr014luqrkos	cmmoll4kj003znr014bnc1kh8	TRANSFER	Cập nhật vị trí: Kho STEP - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: Trong kho - Trên bàn\n	2026-03-13 10:05:24.674	cmmahv7p600005bumvtjhepyn	\N
cmmoqe6ko00blnr01c7nu942d	cmmoll4lt0045nr01orh7hath	TRANSFER	Cập nhật vị trí: Kho STEP - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: Trong kho - Trên bàn	2026-03-13 10:05:41.449	cmmahv7p600005bumvtjhepyn	\N
cmmoqepml00bmnr014mw5as7h	cmmoll4kq0040nr017gpxgnbt	TRANSFER	Cập nhật vị trí: Kho STEP - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: Trong kho -> cất riêng -> Thùng dưới bàn	2026-03-13 10:06:06.142	cmmahv7p600005bumvtjhepyn	\N
cmmoqf2zi00bnnr018d3b0ujj	cmmoll4kv0041nr01j8uozl91	TRANSFER	Cập nhật vị trí: Kho STEP - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: Trong kho -> cất riêng -> Thùng ASUS\n	2026-03-13 10:06:23.455	cmmahv7p600005bumvtjhepyn	\N
cmmoqfpmh00bonr019izoi9zv	cmmoll4i7003nnr01sco09soq	TRANSFER	Cập nhật vị trí: Kho STEP - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: Trong kho -> cất riêng -> Thùng dưới bàn\n	2026-03-13 10:06:52.793	cmmahv7p600005bumvtjhepyn	\N
cmmoqhxdy00bpnr01j9fbsblu	cmmoll4jo003tnr01d8zgbeae	TRANSFER	Cập nhật vị trí: Kho STEP - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: Trong kho -> cất riêng -> Thùng dưới bàn	2026-03-13 10:08:36.167	cmmahv7p600005bumvtjhepyn	\N
cmmoqsurt00brnr01o9kcd41t	\N	RESET_PASSWORD	Reset mật khẩu cho user: admin.sang	2026-03-13 10:17:05.993	cmmahv7p600005bumvtjhepyn	cmmahv7p600005bumvtjhepyn
cmmoqsybg00btnr01fhjr90mt	\N	DISABLE_USER	Vô hiệu hoá tài khoản: admin.phong	2026-03-13 10:17:10.588	cmmahv7p600005bumvtjhepyn	cmmfq016h001i5bd2znnds7w9
cmmoqsztx00bvnr01i52dgwny	\N	DISABLE_USER	Vô hiệu hoá tài khoản: admin.dai	2026-03-13 10:17:12.55	cmmahv7p600005bumvtjhepyn	cmmlhdkbk00075bp8px1ad8bq
cmmoqulk200c6nr01x40n7f21	\N	DELETE_USER	Xoá tài khoản: sangnd	2026-03-13 10:18:27.362	cmmahv7p600005bumvtjhepyn	\N
cmmoqtdx700bynr01plz6kd6b	\N	CREATE_USER	Tạo tài khoản người dùng: sangnd	2026-03-13 10:17:30.811	cmmahv7p600005bumvtjhepyn	\N
cmmoquo1c00c8nr01q95z5aji	\N	DELETE_USER	Xoá tài khoản: daind	2026-03-13 10:18:30.576	cmmahv7p600005bumvtjhepyn	\N
cmmoqtrmj00c1nr01fh9uc2zm	\N	CREATE_USER	Tạo tài khoản người dùng: daind	2026-03-13 10:17:48.571	cmmahv7p600005bumvtjhepyn	\N
cmmoquqhu00canr01pn72ny9h	\N	DELETE_USER	Xoá tài khoản: phongnd	2026-03-13 10:18:33.762	cmmahv7p600005bumvtjhepyn	\N
cmmoqu6rs00c4nr0112kofldo	\N	CREATE_USER	Tạo tài khoản người dùng: phongnd	2026-03-13 10:18:08.199	cmmahv7p600005bumvtjhepyn	\N
cmmoqv92o00cdnr012wi8pg4q	\N	CREATE_USER	Tạo tài khoản người dùng: sangnd@step.com.vn	2026-03-13 10:18:57.841	cmmahv7p600005bumvtjhepyn	cmmoqv92m00cbnr0157vo0bkk
cmmoqxel900cgnr01ess9yhvp	\N	CREATE_USER	Tạo tài khoản người dùng: daind@step.com.vn	2026-03-13 10:20:38.301	cmmahv7p600005bumvtjhepyn	cmmoqxel500cenr01gtwk4439
cmmoqxthn00cjnr015qbg3e4f	\N	CREATE_USER	Tạo tài khoản người dùng: phongnd@step.com.vn	2026-03-13 10:20:57.611	cmmahv7p600005bumvtjhepyn	cmmoqxthk00chnr01175dxdga
cmmoqz0u500cknr015vyb5ckq	cmmoq6tnw00bfnr01hm830zzi	DELETE	Xóa mềm thiết bị khỏi hệ thống (Đưa vào Recycle Bin). SN: MY850307YP	2026-03-13 10:21:53.789	cmmahv7p600005bumvtjhepyn	\N
cmmoqz4cu00clnr017m1qsc5l	cmmoq6tnw00bfnr01hm830zzi	RESTORE	Khôi phục thiết bị MY850307YP từ Recycle Bin.	2026-03-13 10:21:58.35	cmmahv7p600005bumvtjhepyn	\N
cmmoqzbyc00cmnr01um71bww5	cmmoq6tnw00bfnr01hm830zzi	RESTORE	Khôi phục thiết bị MY850307YP từ Recycle Bin.	2026-03-13 10:22:08.196	cmmahv7p600005bumvtjhepyn	\N
cmmoqztyz00cnnr01t9hzdmzr	cmmoq6tnw00bfnr01hm830zzi	RESTORE	Khôi phục thiết bị MY850307YP từ Recycle Bin.	2026-03-13 10:22:31.548	cmmahv7p600005bumvtjhepyn	\N
cmmoraxgy00cqnr01vghw63jm	\N	CREATE_PRODUCT	Tạo sản phẩm mới: RAM ECC DDR4 32GB 2933Y	2026-03-13 10:31:09.298	cmmoqv92m00cbnr0157vo0bkk	\N
cmmori46400ctnr011hwc310j	\N	CREATE_PRODUCT	Tạo sản phẩm mới: HDD 2.4TB DELL	2026-03-13 10:36:44.571	cmmoqv92m00cbnr0157vo0bkk	\N
cmmornobl00cxnr01phw68k5l	cmmorno9a00cvnr01bd7ghxcj	IMPORT	Import hàng loạt từ Excel	2026-03-13 10:41:03.969	cmmahv7p600005bumvtjhepyn	\N
cmmornocr00d0nr015cdpjccp	cmmorno9m00cwnr01w4ofj5ll	IMPORT	Import hàng loạt từ Excel	2026-03-13 10:41:04.012	cmmahv7p600005bumvtjhepyn	\N
cmmornodh00d3nr012znsdgpb	cmmornod300d2nr01je5vuyms	IMPORT	Import hàng loạt từ Excel	2026-03-13 10:41:04.037	cmmahv7p600005bumvtjhepyn	\N
cmmornocv00d1nr012mhmf1y0	cmmorno9600cunr01j45pghp1	IMPORT	Import hàng loạt từ Excel	2026-03-13 10:41:04.016	cmmahv7p600005bumvtjhepyn	\N
cmmornodh00d4nr01yzrj58li	cmmornobq00cynr015hm2vg92	IMPORT	Import hàng loạt từ Excel	2026-03-13 10:41:04.037	cmmahv7p600005bumvtjhepyn	\N
cmmornoef00d8nr01vd26wbtd	cmmornodx00d5nr01gq0935x0	IMPORT	Import hàng loạt từ Excel	2026-03-13 10:41:04.071	cmmahv7p600005bumvtjhepyn	\N
cmmornoet00danr01m40o0awz	cmmornoe500d6nr01hfzwo1j8	IMPORT	Import hàng loạt từ Excel	2026-03-13 10:41:04.086	cmmahv7p600005bumvtjhepyn	\N
cmmornoev00dbnr01ao1qtzr2	cmmornoe900d7nr01qwdqavhp	IMPORT	Import hàng loạt từ Excel	2026-03-13 10:41:04.087	cmmahv7p600005bumvtjhepyn	\N
cmmornoel00d9nr01481v9noy	cmmornobw00cznr01wlyw83gb	IMPORT	Import hàng loạt từ Excel	2026-03-13 10:41:04.077	cmmahv7p600005bumvtjhepyn	\N
cmmornofw00denr01zhfd38oz	cmmornofc00dcnr01f8iw14f8	IMPORT	Import hàng loạt từ Excel	2026-03-13 10:41:04.124	cmmahv7p600005bumvtjhepyn	\N
cmmornogk00dinr01fej4zvgl	cmmornofu00ddnr010kwyy8og	IMPORT	Import hàng loạt từ Excel	2026-03-13 10:41:04.149	cmmahv7p600005bumvtjhepyn	\N
cmmornogr00djnr01cd45de3j	cmmornog100dfnr01ljl3a68s	IMPORT	Import hàng loạt từ Excel	2026-03-13 10:41:04.155	cmmahv7p600005bumvtjhepyn	\N
cmmornoh000dmnr0192usy56r	cmmornogf00dhnr01x1p10jtg	IMPORT	Import hàng loạt từ Excel	2026-03-13 10:41:04.164	cmmahv7p600005bumvtjhepyn	\N
cmmornogw00dlnr01ctgqo8r1	cmmornog700dgnr01wnl38suv	IMPORT	Import hàng loạt từ Excel	2026-03-13 10:41:04.161	cmmahv7p600005bumvtjhepyn	\N
cmmornohi00dpnr01i3qb686d	cmmornogs00dknr01queid6xo	IMPORT	Import hàng loạt từ Excel	2026-03-13 10:41:04.183	cmmahv7p600005bumvtjhepyn	\N
cmmornoia00dsnr01fdkkp13e	cmmornohf00donr018qxujud2	IMPORT	Import hàng loạt từ Excel	2026-03-13 10:41:04.21	cmmahv7p600005bumvtjhepyn	\N
cmmornoia00dtnr01rjn0ue0j	cmmornohc00dnnr01nthuclag	IMPORT	Import hàng loạt từ Excel	2026-03-13 10:41:04.21	cmmahv7p600005bumvtjhepyn	\N
cmmornoig00dunr01syip7925	cmmornoi400drnr01awptxhx1	IMPORT	Import hàng loạt từ Excel	2026-03-13 10:41:04.216	cmmahv7p600005bumvtjhepyn	\N
cmmornoik00dvnr01j8blzt11	cmmornohm00dqnr01lisy65ar	IMPORT	Import hàng loạt từ Excel	2026-03-13 10:41:04.221	cmmahv7p600005bumvtjhepyn	\N
cmmornoj700e0nr01khqa38x8	cmmornoim00dwnr01x4kv6y1c	IMPORT	Import hàng loạt từ Excel	2026-03-13 10:41:04.243	cmmahv7p600005bumvtjhepyn	\N
cmmornojb00e1nr01re4dat1v	cmmornoir00dxnr01kc53aukt	IMPORT	Import hàng loạt từ Excel	2026-03-13 10:41:04.246	cmmahv7p600005bumvtjhepyn	\N
cmmornojk00e3nr01hnmhecld	cmmornoj500dznr016mocst7n	IMPORT	Import hàng loạt từ Excel	2026-03-13 10:41:04.256	cmmahv7p600005bumvtjhepyn	\N
cmmornojm00e4nr01rej348bw	cmmornoix00dynr01rdqcj84e	IMPORT	Import hàng loạt từ Excel	2026-03-13 10:41:04.259	cmmahv7p600005bumvtjhepyn	\N
cmmornojz00e5nr01f0f9d3j1	cmmornoje00e2nr01kefntig9	IMPORT	Import hàng loạt từ Excel	2026-03-13 10:41:04.272	cmmahv7p600005bumvtjhepyn	\N
cmmors8gg00e8nr01iz26cra3	\N	CREATE_PRODUCT	Tạo sản phẩm mới: aaa	2026-03-13 10:44:36.689	cmmoqv92m00cbnr0157vo0bkk	\N
cmmos86l200eanr01r8tdlzq2	\N	DELETE_PRODUCT	Xóa sản phẩm: aaa	2026-03-13 10:57:00.758	cmmoqv92m00cbnr0157vo0bkk	\N
cmmosatzo00ebnr01rlyoxpy0	cmmoll4i2003mnr01kbr9mo2d	TRANSFER	Cập nhật vị trí: Kho STEP - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: Không	2026-03-13 10:59:04.404	cmmahv7p600005bumvtjhepyn	\N
cmmosb5mw00ecnr01ce4a69n8	cmmol7az3003fnr01ct64az1k	TRANSFER	Cập nhật vị trí: Kho STEP - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: Không	2026-03-13 10:59:19.496	cmmahv7p600005bumvtjhepyn	\N
cmmosbh0g00ednr01ykuljmu1	cmmoll4fn003hnr01jgjfkq3y	TRANSFER	Cập nhật vị trí: Kho STEP - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: Không	2026-03-13 10:59:34.24	cmmahv7p600005bumvtjhepyn	\N
cmmp24m7m00efnr01t10y99yg	\N	RESET_PASSWORD	Reset mật khẩu cho user: daind@step.com.vn	2026-03-13 15:34:10.546	cmmahv7p600005bumvtjhepyn	cmmoqxel500cenr01gtwk4439
cmmp24xre00ehnr01m9ipdwts	\N	RESET_PASSWORD	Reset mật khẩu cho user: phongnd@step.com.vn	2026-03-13 15:34:25.514	cmmahv7p600005bumvtjhepyn	cmmoqxthk00chnr01175dxdga
cmmp25cqw00ejnr01ktbcidgn	\N	RESET_PASSWORD	Reset mật khẩu cho user: sangnd@step.com.vn	2026-03-13 15:34:44.937	cmmahv7p600005bumvtjhepyn	cmmoqv92m00cbnr0157vo0bkk
cmmspqn8j00eknr01c9xmz30v	cmmoniz5j004ynr01ee2utxvo	TRANSFER	Cập nhật vị trí: Kho STEP - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: Trong Server cho GTEL mượn	2026-03-16 04:58:28.004	cmmahv7p600005bumvtjhepyn	\N
cmmspzhme00emnr0172ffsvkd	cmmspzhm200elnr0149d84hyi	IMPORT	Nhập mới thiết bị: S3BPNX0J807417. Cỡ: 1U.	2026-03-16 05:05:20.63	cmmahv7p600005bumvtjhepyn	\N
cmmsq261900eonr0192616axe	cmmsq260l00ennr01w0awe7ka	IMPORT	Nhập mới thiết bị: S3BPNX0J807421. Cỡ: 1U.	2026-03-16 05:07:25.582	cmmahv7p600005bumvtjhepyn	\N
cmmsq2yio00epnr01njtg8nga	cmmsq260l00ennr01w0awe7ka	ASSEMBLE	Lắp ráp vào thiết bị mẹ [SN: SGH943Y0J2].	2026-03-16 05:08:02.496	cmmahv7p600005bumvtjhepyn	\N
cmmsq2yio00eqnr01sdwc7cw3	cmmspzhm200elnr0149d84hyi	ASSEMBLE	Lắp ráp vào thiết bị mẹ [SN: SGH943Y0J2].	2026-03-16 05:08:02.496	cmmahv7p600005bumvtjhepyn	\N
cmmsq2yio00ernr01xluz2bcb	cmmoniz5j004ynr01ee2utxvo	ASSEMBLE	Lắp ráp vào thiết bị mẹ [SN: SGH943Y0J2].	2026-03-16 05:08:02.496	cmmahv7p600005bumvtjhepyn	\N
cmmsukna400etnr01n7s9mb13	cmmsukn9q00esnr01dvkm535q	IMPORT	Nhập mới thiết bị: BTHV73210C4Q200MGN. Cỡ: 1U.	2026-03-16 07:13:46.205	cmmahv7p600005bumvtjhepyn	\N
cmmsumeu800evnr01lyct5fta	cmmsumeu200eunr01gxkoxync	IMPORT	Nhập mới thiết bị: S3BPNX0J805949. Cỡ: 1U.	2026-03-16 07:15:08.577	cmmahv7p600005bumvtjhepyn	\N
cmmsuogry00exnr01h91qz0a8	cmmsuogrq00ewnr014kb49fjd	IMPORT	Nhập mới thiết bị: S3BPNX0J907770. Cỡ: 1U.	2026-03-16 07:16:44.399	cmmahv7p600005bumvtjhepyn	\N
cmmsuopkp00eynr01wgfsz9to	cmmsuogrq00ewnr014kb49fjd	ASSEMBLE	Lắp ráp vào thiết bị mẹ [SN: SGH929YWR1].	2026-03-16 07:16:55.801	cmmahv7p600005bumvtjhepyn	\N
cmmsuopkp00eznr01kxnngklm	cmmsumeu200eunr01gxkoxync	ASSEMBLE	Lắp ráp vào thiết bị mẹ [SN: SGH929YWR1].	2026-03-16 07:16:55.801	cmmahv7p600005bumvtjhepyn	\N
cmmsuopkp00f0nr01tqzxh42i	cmmsukn9q00esnr01dvkm535q	ASSEMBLE	Lắp ráp vào thiết bị mẹ [SN: SGH929YWR1].	2026-03-16 07:16:55.801	cmmahv7p600005bumvtjhepyn	\N
cmmsv8luo00f2nr01i9o7ljc6	cmmsv8luc00f1nr0160uuo74y	IMPORT	Nhập mới thiết bị: BTHV73350BC6200MGN. Cỡ: 1U.	2026-03-16 07:32:24.097	cmmahv7p600005bumvtjhepyn	\N
cmmsv918n00f4nr01zsn3mdoh	cmmsv918f00f3nr01yet6mywv	IMPORT	Nhập mới thiết bị: S455NC0NB17181. Cỡ: 1U.	2026-03-16 07:32:44.039	cmmahv7p600005bumvtjhepyn	\N
cmmsvb8j700f5nr01v58v8dqg	cmmsv8luc00f1nr0160uuo74y	ASSEMBLE	Lắp ráp vào thiết bị mẹ [SN: SGH929YWQZ].	2026-03-16 07:34:26.803	cmmahv7p600005bumvtjhepyn	\N
cmmsvb8j700f6nr01c2g9hvxl	cmmsv918f00f3nr01yet6mywv	ASSEMBLE	Lắp ráp vào thiết bị mẹ [SN: SGH929YWQZ].	2026-03-16 07:34:26.803	cmmahv7p600005bumvtjhepyn	\N
cmmsvb8j700f7nr01qv4pu6br	cmmoniz58004wnr017c8ijcpb	ASSEMBLE	Lắp ráp vào thiết bị mẹ [SN: SGH929YWQZ].	2026-03-16 07:34:26.803	cmmahv7p600005bumvtjhepyn	\N
cmmsvl60h00f8nr01kjpbcodg	cmmoll4lt0045nr01orh7hath	TRANSFER	Cập nhật vị trí: Kho STEP - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: Trong kho - Trên bàn\n\nip ilo 192.168.1.217 Các linh kiện đi theo thiết bị.	2026-03-16 07:42:10.098	cmmahv7p600005bumvtjhepyn	\N
cmmswot4700f9nr01j83w33ij	cmmoll4lt0045nr01orh7hath	TRANSFER	Cập nhật vị trí: Kho STEP - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: Trong kho - Trên bàn\n\nIP ILO: 192.168.1.217\nIP Ubuntu: 192.168.1.220 Các linh kiện đi theo thiết bị.	2026-03-16 08:12:59.624	cmmahv7p600005bumvtjhepyn	\N
cmmsxoqz100fanr01c0t0hitr	cmmoll4kj003znr014bnc1kh8	TRANSFER	Cập nhật vị trí: Kho STEP - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: Trong kho - Trên bàn\nIP ILO: 192.168.1.218\nIP Ubuntu: 192.168.1.221\n Các linh kiện đi theo thiết bị.	2026-03-16 08:40:56.461	cmmahv7p600005bumvtjhepyn	\N
cmmsz9n4g00fbnr01ew6gq3or	cmmoll4kj003znr014bnc1kh8	TRANSFER	Cập nhật vị trí: Kho STEP - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: Trong kho - Trên bàn\nIP ILO: 192.168.1.218\nIP Ubuntu: 192.168.1.221\nusername: step2\npassword: 1\n Các linh kiện đi theo thiết bị.	2026-03-16 09:25:10.864	cmmahv7p600005bumvtjhepyn	\N
cmmsza5l900fcnr01d9cwnmch	cmmoll4lt0045nr01orh7hath	TRANSFER	Cập nhật vị trí: Kho STEP - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: Trong kho - Trên bàn\n\nIP ILO: 192.168.1.217\nIP Ubuntu: 192.168.1.220\nusername:step1\npassword:1 Các linh kiện đi theo thiết bị.	2026-03-16 09:25:34.798	cmmahv7p600005bumvtjhepyn	\N
cmmszc3mh00fdnr019jcscpok	cmmoll4jh003rnr016hbk4xmf	TRANSFER	Cập nhật vị trí: Kho STEP - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: Trong kho - Trên bàn\n\nIP ILO: 192.168.1.219\nIP Ubuntu: 192.168.1.222\n Các linh kiện đi theo thiết bị.	2026-03-16 09:27:05.561	cmmahv7p600005bumvtjhepyn	\N
cmmt0jqdc00fenr01u0g74ce1	cmmoll4jh003rnr016hbk4xmf	TRANSFER	Cập nhật vị trí: Kho STEP - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: Trong kho - Trên bàn\n\nIP ILO: 192.168.1.219\nIP Ubuntu: 192.168.1.222\nusername: step3\npassword: 1\n Các linh kiện đi theo thiết bị.	2026-03-16 10:01:01.249	cmmahv7p600005bumvtjhepyn	\N
cmmt0kzkm00ffnr014o5a1kck	cmmoll4kj003znr014bnc1kh8	TRANSFER	Cập nhật vị trí: Kho STEP - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: Trong kho - Trên bàn\n\nIP ILO: 192.168.1.218\nIP Ubuntu: 192.168.1.221\nusername: step2\npassword: 1\n Các linh kiện đi theo thiết bị.	2026-03-16 10:01:59.83	cmmahv7p600005bumvtjhepyn	\N
cmmvhy5kh00fgnr01sood5o10	cmmsv918f00f3nr01yet6mywv	TRANSFER	Di chuyển linh kiện SSD 1.92TB SAMSUNG (S455NC0NB17181) từ HPE DL360 GEN10 (SGH929YWQZ) sang HPE DL360 GEN10 (SGH943Y0J2)	2026-03-18 03:43:39.953	cmmahv7p600005bumvtjhepyn	\N
cmmvj3qnv00finr01m6lir83z	cmmvj3qng00fhnr01gqeuoioh	IMPORT	Nhập mới thiết bị: SERVER_DEMO. Cỡ: 1U.	2026-03-18 04:16:00.187	cmmahv7p600005bumvtjhepyn	\N
cmmvj3xw100fjnr013ha8t2d1	cmmvj3qng00fhnr01gqeuoioh	TRANSFER	Cập nhật vị trí: Data Center VNPT - Tủ: Không lên tủ. Trạng thái: DEPLOYED. Ghi chú: Không	2026-03-18 04:16:09.553	cmmahv7p600005bumvtjhepyn	\N
cmmvj4mxb00flnr0186xhqzg6	cmmvj4mx000fknr01f1syi0zl	IMPORT	Nhập mới thiết bị: RAM_DEMO. Cỡ: 1U.	2026-03-18 04:16:41.999	cmmahv7p600005bumvtjhepyn	\N
cmmvj53ol00fnnr01xf4efe5g	cmmvj53o700fmnr01wm2umk1o	IMPORT	Nhập mới thiết bị: STORAGE_DEMO. Cỡ: 1U.	2026-03-18 04:17:03.717	cmmahv7p600005bumvtjhepyn	\N
cmmvpka4j00frnr017rohv33z	cmmooouqi008unr01p6awfz5c	CREATE_RENTAL	Tạo hợp đồng thuê cho khách hàng: TechX - Thiết bị CN-OCDC7W-FCP00-97H-00H2-A00	2026-03-18 07:16:49.603	cmmahv7p600005bumvtjhepyn	\N
cmmvpka4v00ftnr01ec0nnw80	cmmooouqi008unr01p6awfz5c	EXPORT	Thiết bị CN-OCDC7W-FCP00-97H-00H2-A00 được xuất kho cho thuê theo hợp đồng của TechX	2026-03-18 07:16:49.615	cmmahv7p600005bumvtjhepyn	\N
cmmvpkg2y00fvnr01mn9fdnmw	cmmooouqi008unr01p6awfz5c	RETURN_RENTAL	Khách hàng trả lại thiết bị CN-OCDC7W-FCP00-97H-00H2-A00	2026-03-18 07:16:57.322	cmmahv7p600005bumvtjhepyn	\N
cmmvty5n800fznr01ouvc9clr	cmmvty5m700fwnr01oxik8rjn	IMPORT	Import hàng loạt từ Excel	2026-03-18 09:19:35.444	cmmahv7p600005bumvtjhepyn	\N
cmmvty5nh00g1nr01ov1tlyg3	cmmvty5mc00fynr01zjd4urth	IMPORT	Import hàng loạt từ Excel	2026-03-18 09:19:35.454	cmmahv7p600005bumvtjhepyn	\N
cmmvty5ni00g2nr01ltw1k066	cmmvty5m900fxnr013nrm7nmd	IMPORT	Import hàng loạt từ Excel	2026-03-18 09:19:35.454	cmmahv7p600005bumvtjhepyn	\N
cmmvty5o300g4nr01o7nm5scx	cmmvty5ng00g0nr01nzejof2q	IMPORT	Import hàng loạt từ Excel	2026-03-18 09:19:35.475	cmmahv7p600005bumvtjhepyn	\N
cmmvty5oh00g6nr01ybmh4doe	cmmvty5o700g5nr013vxmszfb	IMPORT	Import hàng loạt từ Excel	2026-03-18 09:19:35.489	cmmahv7p600005bumvtjhepyn	\N
cmmvty5ok00g7nr01mm0dqbk0	cmmvty5ny00g3nr0183omxefl	IMPORT	Import hàng loạt từ Excel	2026-03-18 09:19:35.492	cmmahv7p600005bumvtjhepyn	\N
cmmvtzcbt00g8nr01onnj4gae	cmmvty5o700g5nr013vxmszfb	TRANSFER	Di chuyển linh kiện RAM ECC DDR4 32GB 2933Y (MTA36ASF4G72PZ-2G9E2VG2047) từ DELL PowerEdge R740XD (7V1HH93) sang DELL PowerEdge R740XD (7RS49X2)	2026-03-18 09:20:30.762	cmmahv7p600005bumvtjhepyn	\N
cmmvtzghl00g9nr01hrm9a5z6	cmmvty5ny00g3nr0183omxefl	TRANSFER	Di chuyển linh kiện RAM ECC DDR4 32GB 2933Y (MTA36ASF4G72PZ-2G9E2VG1942-2) từ DELL PowerEdge R740XD (7V1HH93) sang DELL PowerEdge R740XD (7RS49X2)	2026-03-18 09:20:36.154	cmmahv7p600005bumvtjhepyn	\N
cmmvtzl1600ganr01k0hph5qo	cmmvty5ng00g0nr01nzejof2q	TRANSFER	Di chuyển linh kiện RAM ECC DDR4 32GB 2933Y (MTA36ASF4G72PZ-2G9E2UI1931) từ DELL PowerEdge R740XD (7V1HH93) sang DELL PowerEdge R740XD (7RS49X2)	2026-03-18 09:20:42.043	cmmahv7p600005bumvtjhepyn	\N
cmmvtzozw00gbnr01zshpfruy	cmmvty5mc00fynr01zjd4urth	TRANSFER	Di chuyển linh kiện RAM ECC DDR4 32GB 2933Y (MTA36ASF4G72PZ-2G9E2TI2049) từ DELL PowerEdge R740XD (7V1HH93) sang DELL PowerEdge R740XD (7RS49X2)	2026-03-18 09:20:47.18	cmmahv7p600005bumvtjhepyn	\N
cmmvtzst800gcnr01sw02vn7s	cmmvty5m900fxnr013nrm7nmd	TRANSFER	Di chuyển linh kiện RAM ECC DDR4 32GB 2933Y (MTA36ASF4G72PZ-2G9E2VG1942) từ DELL PowerEdge R740XD (7V1HH93) sang DELL PowerEdge R740XD (7RS49X2)	2026-03-18 09:20:52.125	cmmahv7p600005bumvtjhepyn	\N
cmmvtzwfp00gdnr0174yhddq3	cmmvty5m700fwnr01oxik8rjn	TRANSFER	Di chuyển linh kiện RAM ECC DDR4 32GB 2933Y (MTA36ASF4G72PZ-2G9E2UI2008) từ DELL PowerEdge R740XD (7V1HH93) sang DELL PowerEdge R740XD (7RS49X2)	2026-03-18 09:20:56.822	cmmahv7p600005bumvtjhepyn	\N
cmmvu1dl900genr01m3ivi1d9	cmmol7az3003fnr01ct64az1k	TRANSFER	Cập nhật vị trí: Kho STEP - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: 6 thanh ram của  Các linh kiện đi theo thiết bị.	2026-03-18 09:22:05.71	cmmahv7p600005bumvtjhepyn	\N
cmmvu1utz00gfnr01y6a9zni0	cmmol7az3003fnr01ct64az1k	TRANSFER	Cập nhật vị trí: Kho STEP - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: 6 thanh ram của 7V1HH93 Các linh kiện đi theo thiết bị.	2026-03-18 09:22:28.056	cmmahv7p600005bumvtjhepyn	\N
cmmvusy7i00ggnr01rdnfngbe	cmmol7az3003fnr01ct64az1k	TRANSFER	Cập nhật vị trí: Kho STEP - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: 6 thanh ram của 7V1HH93\n\niRAC:192.168.1.231\nip Proxmox: \nUsername:\nPassword:\n Các linh kiện đi theo thiết bị.	2026-03-18 09:43:32.143	cmmahv7p600005bumvtjhepyn	\N
cmmvv0pjg00gjnr01h6uowgiz	\N	CREATE_PRODUCT	Tạo sản phẩm mới: HDD SAS 1.2TB	2026-03-18 09:49:34.156	cmmahv7p600005bumvtjhepyn	\N
cmmvv31hs00gnnr01rdhbr9jf	cmmvv31h500gknr01xkn65apz	IMPORT	Import hàng loạt từ Excel	2026-03-18 09:51:22.96	cmmahv7p600005bumvtjhepyn	\N
cmmvv31ht00gonr01ect2r6sb	cmmvv31hd00gmnr019q4ayw3l	IMPORT	Import hàng loạt từ Excel	2026-03-18 09:51:22.961	cmmahv7p600005bumvtjhepyn	\N
cmmvv31hv00gpnr01zrx4q8s5	cmmvv31hb00glnr01d0uhrjhv	IMPORT	Import hàng loạt từ Excel	2026-03-18 09:51:22.963	cmmahv7p600005bumvtjhepyn	\N
cmmvv31ih00grnr01ekzlxup7	cmmvv31i100gqnr01al4hbnz1	IMPORT	Import hàng loạt từ Excel	2026-03-18 09:51:22.985	cmmahv7p600005bumvtjhepyn	\N
cmnbxgi3j00gsnr01jcuwpyzx	cmmsuogrq00ewnr014kb49fjd	DISASSEMBLE	Tháo rời khỏi thiết bị mẹ [SN: SGH929YWR1].	2026-03-29 15:42:09.056	cmmahv7p600005bumvtjhepyn	\N
cmnbxglvq00gtnr011n0dzh3y	cmmsumeu200eunr01gxkoxync	DISASSEMBLE	Tháo rời khỏi thiết bị mẹ [SN: SGH929YWR1].	2026-03-29 15:42:13.959	cmmahv7p600005bumvtjhepyn	\N
cmnbxilkw00gunr0178fnod7b	cmmsumeu200eunr01gxkoxync	TRANSFER	Cập nhật vị trí: Kho STEP - Tủ: Không lên tủ. Trạng thái: RENTED. Ghi chú: Nguyễn Duy Đại cầm đi 27/03/2026	2026-03-29 15:43:46.881	cmmahv7p600005bumvtjhepyn	\N
cmnbxj8uk00gvnr01p2x5yww5	cmmsuogrq00ewnr014kb49fjd	TRANSFER	Cập nhật vị trí: Kho STEP - Tủ: Không lên tủ. Trạng thái: RENTED. Ghi chú: Nguyễn Duy Đại cho mượn 27/03/2026	2026-03-29 15:44:17.036	cmmahv7p600005bumvtjhepyn	\N
cmnfozilg00gynr013kzib0e9	\N	CREATE_PRODUCT	Tạo sản phẩm mới: RAM ECC DDR4 32GB 2133P	2026-04-01 06:56:04.324	cmmahv7p600005bumvtjhepyn	\N
cmnfozvyy00h0nr01lj4wmh8i	\N	UPDATE_PRODUCT	Cập nhật sản phẩm: RAM ECC DDR4 32GB 2133P	2026-04-01 06:56:21.658	cmmahv7p600005bumvtjhepyn	\N
cmnfquldg00h4nr01282ig08g	cmnfqulcj00h1nr01slqr3ir1	IMPORT	Import hàng loạt từ Excel	2026-04-01 07:48:13.876	cmmahv7p600005bumvtjhepyn	\N
cmnfquldo00h5nr01wlp4h09q	cmnfqulcq00h3nr01lmreaql1	IMPORT	Import hàng loạt từ Excel	2026-04-01 07:48:13.884	cmmahv7p600005bumvtjhepyn	\N
cmnfquldu00h8nr01b7of3s0p	cmnfqulcm00h2nr01h9t5hojz	IMPORT	Import hàng loạt từ Excel	2026-04-01 07:48:13.89	cmmahv7p600005bumvtjhepyn	\N
cmnfqulee00hbnr01bdjzsqqd	cmnfqule500h9nr012mv1m489	IMPORT	Import hàng loạt từ Excel	2026-04-01 07:48:13.91	cmmahv7p600005bumvtjhepyn	\N
cmnfqulen00henr01makxz5d8	cmnfquleb00hanr011shkzagu	IMPORT	Import hàng loạt từ Excel	2026-04-01 07:48:13.919	cmmahv7p600005bumvtjhepyn	\N
cmnfquleh00hcnr01l1vxa3qf	cmnfquldp00h6nr01g49v6fs1	IMPORT	Import hàng loạt từ Excel	2026-04-01 07:48:13.914	cmmahv7p600005bumvtjhepyn	\N
cmnfqulen00hfnr01lmi75z4o	cmnfqulds00h7nr01squ4qj3j	IMPORT	Import hàng loạt từ Excel	2026-04-01 07:48:13.92	cmmahv7p600005bumvtjhepyn	\N
cmnfquleu00hgnr01diu6nrc7	cmnfqulem00hdnr014n35bux3	IMPORT	Import hàng loạt từ Excel	2026-04-01 07:48:13.927	cmmahv7p600005bumvtjhepyn	\N
cmng48n6z00hhnr01ujgqps7r	cmnfqulem00hdnr014n35bux3	TRANSFER	Cập nhật vị trí: Kho STEP - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: Không	2026-04-01 14:03:04.427	cmmahv7p600005bumvtjhepyn	\N
cmng48u0s00hinr017p62lx5v	cmnfquleb00hanr011shkzagu	TRANSFER	Cập nhật vị trí: Kho STEP - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: Không	2026-04-01 14:03:13.277	cmmahv7p600005bumvtjhepyn	\N
cmng48zuu00hjnr01ak44snd7	cmnfqule500h9nr012mv1m489	TRANSFER	Cập nhật vị trí: Kho STEP - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: Không	2026-04-01 14:03:20.838	cmmahv7p600005bumvtjhepyn	\N
cmng494u400hknr017y9ufpsi	cmnfqulds00h7nr01squ4qj3j	TRANSFER	Cập nhật vị trí: Kho STEP - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: Không	2026-04-01 14:03:27.292	cmmahv7p600005bumvtjhepyn	\N
cmng4995v00hlnr01spqjobuq	cmnfquldp00h6nr01g49v6fs1	TRANSFER	Cập nhật vị trí: Kho STEP - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: Không	2026-04-01 14:03:32.899	cmmahv7p600005bumvtjhepyn	\N
cmng49dbb00hmnr0115dnzson	cmnfqulcq00h3nr01lmreaql1	TRANSFER	Cập nhật vị trí: Kho STEP - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: Không	2026-04-01 14:03:38.279	cmmahv7p600005bumvtjhepyn	\N
cmng49jgk00hnnr01ocstwy5y	cmnfqulcm00h2nr01h9t5hojz	TRANSFER	Cập nhật vị trí: Kho STEP - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: Không	2026-04-01 14:03:46.244	cmmahv7p600005bumvtjhepyn	\N
cmng49nnk00honr01csvwmdbs	cmnfqulcj00h1nr01slqr3ir1	TRANSFER	Cập nhật vị trí: Kho STEP - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: Không	2026-04-01 14:03:51.681	cmmahv7p600005bumvtjhepyn	\N
cmng4bl6e00hpnr01fhjdrnqt	cmnfqulem00hdnr014n35bux3	ASSEMBLE	Lắp ráp vào thiết bị mẹ [SN: 6HWFBD2].	2026-04-01 14:05:21.782	cmmahv7p600005bumvtjhepyn	\N
cmng4bl6e00hqnr014f08zd9b	cmnfquleb00hanr011shkzagu	ASSEMBLE	Lắp ráp vào thiết bị mẹ [SN: 6HWFBD2].	2026-04-01 14:05:21.782	cmmahv7p600005bumvtjhepyn	\N
cmng4bl6e00hrnr01q83qy3rq	cmnfqule500h9nr012mv1m489	ASSEMBLE	Lắp ráp vào thiết bị mẹ [SN: 6HWFBD2].	2026-04-01 14:05:21.782	cmmahv7p600005bumvtjhepyn	\N
cmng4bl6e00hsnr016kjcu6ks	cmnfqulds00h7nr01squ4qj3j	ASSEMBLE	Lắp ráp vào thiết bị mẹ [SN: 6HWFBD2].	2026-04-01 14:05:21.782	cmmahv7p600005bumvtjhepyn	\N
cmng4bl6e00htnr01zko7ht18	cmnfquldp00h6nr01g49v6fs1	ASSEMBLE	Lắp ráp vào thiết bị mẹ [SN: 6HWFBD2].	2026-04-01 14:05:21.782	cmmahv7p600005bumvtjhepyn	\N
cmng4bl6e00hunr01fw34de36	cmnfqulcq00h3nr01lmreaql1	ASSEMBLE	Lắp ráp vào thiết bị mẹ [SN: 6HWFBD2].	2026-04-01 14:05:21.782	cmmahv7p600005bumvtjhepyn	\N
cmng4bl6e00hvnr01ek858lld	cmnfqulcm00h2nr01h9t5hojz	ASSEMBLE	Lắp ráp vào thiết bị mẹ [SN: 6HWFBD2].	2026-04-01 14:05:21.782	cmmahv7p600005bumvtjhepyn	\N
cmng4bl6e00hwnr013nrpszqi	cmnfqulcj00h1nr01slqr3ir1	ASSEMBLE	Lắp ráp vào thiết bị mẹ [SN: 6HWFBD2].	2026-04-01 14:05:21.782	cmmahv7p600005bumvtjhepyn	\N
cmng4bl6e00hxnr01bcjjyx8d	cmmornoj500dznr016mocst7n	ASSEMBLE	Lắp ráp vào thiết bị mẹ [SN: 6HWFBD2].	2026-04-01 14:05:21.782	cmmahv7p600005bumvtjhepyn	\N
cmng4bl6e00hynr015k3tq1le	cmmornogf00dhnr01x1p10jtg	ASSEMBLE	Lắp ráp vào thiết bị mẹ [SN: 6HWFBD2].	2026-04-01 14:05:21.782	cmmahv7p600005bumvtjhepyn	\N
cmng4dfn800i1nr01qwicnifn	\N	CREATE_PRODUCT	Tạo sản phẩm mới: SSD 1.92TB HPE	2026-04-01 14:06:47.924	cmmahv7p600005bumvtjhepyn	\N
cmng6szmd00i2nr0115ay77sf	cmmspzhm200elnr0149d84hyi	TRANSFER	Di chuyển linh kiện SSD 1.92TB SAMSUNG (S3BPNX0J807417) từ HPE DL360 GEN10 (SGH943Y0J2) sang DELL PowerEdge R630 (6HWFBD2)	2026-04-01 15:14:52.886	cmmahv7p600005bumvtjhepyn	\N
cmng6ugul00i3nr01w08giiem	cmnfqule500h9nr012mv1m489	DISASSEMBLE	Tháo rời khỏi thiết bị mẹ [SN: 6HWFBD2].	2026-04-01 15:16:01.869	cmmahv7p600005bumvtjhepyn	\N
cmng6uil400i4nr01hfvxytk6	cmnfqulds00h7nr01squ4qj3j	DISASSEMBLE	Tháo rời khỏi thiết bị mẹ [SN: 6HWFBD2].	2026-04-01 15:16:04.12	cmmahv7p600005bumvtjhepyn	\N
cmng6uk6i00i5nr01l79aegdn	cmnfquldp00h6nr01g49v6fs1	DISASSEMBLE	Tháo rời khỏi thiết bị mẹ [SN: 6HWFBD2].	2026-04-01 15:16:06.186	cmmahv7p600005bumvtjhepyn	\N
cmng6ulv500i6nr01kwh0wrif	cmnfqulcq00h3nr01lmreaql1	DISASSEMBLE	Tháo rời khỏi thiết bị mẹ [SN: 6HWFBD2].	2026-04-01 15:16:08.369	cmmahv7p600005bumvtjhepyn	\N
cmng6unz400i7nr01ladbzj9q	cmnfqulcm00h2nr01h9t5hojz	DISASSEMBLE	Tháo rời khỏi thiết bị mẹ [SN: 6HWFBD2].	2026-04-01 15:16:11.104	cmmahv7p600005bumvtjhepyn	\N
cmng6upne00i8nr01lv61fos2	cmnfqulcj00h1nr01slqr3ir1	DISASSEMBLE	Tháo rời khỏi thiết bị mẹ [SN: 6HWFBD2].	2026-04-01 15:16:13.275	cmmahv7p600005bumvtjhepyn	\N
cmnhkoszi00icnr01h11trq18	cmmoll4fp003inr01ficn1ias	CREATE_RENTAL	Tạo hợp đồng thuê cho khách hàng: Mr.Thụ - Thiết bị 6HWFBD2	2026-04-02 14:31:18.462	cmmahv7p600005bumvtjhepyn	\N
cmnhkoszm00ienr01jc0fx5dg	cmmoll4fp003inr01ficn1ias	EXPORT	Thiết bị 6HWFBD2 được xuất kho cho thuê theo hợp đồng của Mr.Thụ	2026-04-02 14:31:18.467	cmmahv7p600005bumvtjhepyn	\N
cmnr9amum00ifnr01ebrsahqy	cmmsuogrq00ewnr014kb49fjd	TRANSFER	Cập nhật vị trí: Kho STEP - Tủ: Không lên tủ. Trạng thái: RENTED. Ghi chú: VETC đã giả ổ cứng 09/04/2026\n	2026-04-09 09:10:03.311	cmmahv7p600005bumvtjhepyn	\N
cmprocg1i00ignr0170hxqvr5	cmmspzhm200elnr0149d84hyi	TRANSFER	Cập nhật vị trí: Kho STEP - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: Không	2026-05-30 01:30:46.711	cmmahv7p600005bumvtjhepyn	\N
cmprodhns00ihnr01rou6bscu	cmmspzhm200elnr0149d84hyi	DISASSEMBLE	Tháo rời khỏi thiết bị mẹ [SN: 6HWFBD2].	2026-05-30 01:31:35.465	cmmahv7p600005bumvtjhepyn	\N
cmproii0i00iinr01bas400lg	cmmsuogrq00ewnr014kb49fjd	TRANSFER	Cập nhật vị trí: Kho STEP - Tủ: Không lên tủ. Trạng thái: RENTED. Ghi chú: VETC đã giả ổ cứng 09/04/2026 và hiện tại đang trong kho\n	2026-05-30 01:35:29.203	cmmahv7p600005bumvtjhepyn	\N
cmprojmnl00ijnr0127wll890	cmmvv31hb00glnr01d0uhrjhv	DISASSEMBLE	Tháo rời khỏi thiết bị mẹ [SN: 7RS49X2].	2026-05-30 01:36:21.873	cmmahv7p600005bumvtjhepyn	\N
cmprokftu00iknr01loek5aq1	cmmvv31hd00gmnr019q4ayw3l	DISASSEMBLE	Tháo rời khỏi thiết bị mẹ [SN: 7RS49X2].	2026-05-30 01:36:59.682	cmmahv7p600005bumvtjhepyn	\N
cmprokvxl00ilnr01065pxna5	cmmvv31i100gqnr01al4hbnz1	DISASSEMBLE	Tháo rời khỏi thiết bị mẹ [SN: 7RS49X2].	2026-05-30 01:37:20.554	cmmahv7p600005bumvtjhepyn	\N
cmprolgop00imnr01nhfi0fmu	cmmvv31h500gknr01xkn65apz	DISASSEMBLE	Tháo rời khỏi thiết bị mẹ [SN: 7RS49X2].	2026-05-30 01:37:47.45	cmmahv7p600005bumvtjhepyn	\N
cmproncvx00innr01sokecqna	cmmoniz6j0054nr01feovasyy	TRANSFER	Cập nhật vị trí: Kho STEP - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: Không tìm thấy trong kho. khả năng ở GTEL	2026-05-30 01:39:15.837	cmmahv7p600005bumvtjhepyn	\N
cmprooyql00ionr01ewtmfgw4	cmmsv8luc00f1nr0160uuo74y	DISASSEMBLE	Tháo rời khỏi thiết bị mẹ [SN: SGH929YWQZ].	2026-05-30 01:40:30.813	cmmahv7p600005bumvtjhepyn	\N
cmpropuz400ipnr01cfrcmkud	cmmsukn9q00esnr01dvkm535q	DISASSEMBLE	Tháo rời khỏi thiết bị mẹ [SN: SGH929YWR1].	2026-05-30 01:41:12.592	cmmahv7p600005bumvtjhepyn	\N
cmprozi2800isnr01t8nyw2bt	\N	CREATE_PRODUCT	Tạo sản phẩm mới: RAM ECC DDR4 16GB 3200AA	2026-05-30 01:48:42.416	cmmahv7p600005bumvtjhepyn	\N
cmprp08ae00iunr017aze8jaz	cmprp08a700itnr01w0o30ktj	IMPORT	Nhập mới thiết bị: MTA18ASF2G72PDZ-3G2R1UI. Cỡ: 1U.	2026-05-30 01:49:16.407	cmmahv7p600005bumvtjhepyn	\N
cmprpirc800ivnr01ymw14j9k	cmnfqulem00hdnr014n35bux3	DISASSEMBLE	Tháo rời khỏi thiết bị mẹ [SN: 6HWFBD2].	2026-05-30 02:03:40.905	cmmahv7p600005bumvtjhepyn	\N
cmprpisxw00iwnr014mx0992u	cmnfquleb00hanr011shkzagu	DISASSEMBLE	Tháo rời khỏi thiết bị mẹ [SN: 6HWFBD2].	2026-05-30 02:03:42.98	cmmahv7p600005bumvtjhepyn	\N
cmprplakp00iynr01n9q0uqnf	cmprplakj00ixnr013painsq5	IMPORT	Nhập mới thiết bị: M386A4G40DM0-CPB2QS1612-4. Cỡ: 1U.	2026-05-30 02:05:39.145	cmmahv7p600005bumvtjhepyn	\N
cmprplm6e00j0nr01i2apll1e	cmprplm6b00iznr0147x2i01r	IMPORT	Nhập mới thiết bị: M386A4G40DM0-CPB2QS1612-5. Cỡ: 1U.	2026-05-30 02:05:54.183	cmmahv7p600005bumvtjhepyn	\N
cmprpr90100j1nr01cenveojs	cmnfqulcq00h3nr01lmreaql1	TRANSFER	Cập nhật vị trí: Kho STEP - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: Không	2026-05-30 02:10:17.042	cmmahv7p600005bumvtjhepyn	\N
cmprpwxe200j3nr01m5oojage	cmprpwxdw00j2nr01gthbs7ig	IMPORT	Nhập mới thiết bị: SYTUA1064133B3FF66. Cỡ: 1U.	2026-05-30 02:14:41.93	cmmahv7p600005bumvtjhepyn	\N
cmprpyog900j5nr01v5q9pifv	cmprpyog100j4nr015x7ml7j5	IMPORT	Nhập mới thiết bị: K0NX00092025E4DB4F. Cỡ: 1U.	2026-05-30 02:16:03.658	cmmahv7p600005bumvtjhepyn	\N
cmprq3j3r00j6nr01vf1f00pf	cmmoniz58004wnr017c8ijcpb	TRANSFER	Di chuyển linh kiện SSD 1.92TB SAMSUNG (S455NC0NB18319) từ HPE DL360 GEN10 (SGH929YWQZ) sang HPE DL360 GEN10 (SGH929YWR1)	2026-05-30 02:19:50.008	cmmahv7p600005bumvtjhepyn	\N
cmprq4jdi00j7nr01ul36pfs9	cmmsq260l00ennr01w0awe7ka	TRANSFER	Di chuyển linh kiện SSD 1.92TB SAMSUNG (S3BPNX0J807421) từ HPE DL360 GEN10 (SGH943Y0J2) sang HPE DL360 GEN10 (SGH929YWQZ)	2026-05-30 02:20:37.014	cmmahv7p600005bumvtjhepyn	\N
cmprq6pte00j8nr01un1m2y00	cmmsv8luc00f1nr0160uuo74y	ASSEMBLE	Lắp ráp vào thiết bị mẹ [SN: SGH929YWQZ].	2026-05-30 02:22:18.674	cmmahv7p600005bumvtjhepyn	\N
cmprq8vph00j9nr01arse4286	cmmsq260l00ennr01w0awe7ka	TRANSFER	Di chuyển linh kiện SSD 1.92TB SAMSUNG (S3BPNX0J807421) từ HPE DL360 GEN10 (SGH929YWQZ) sang HPE DL360 GEN10 (SGH943Y0J2)	2026-05-30 02:23:59.621	cmmahv7p600005bumvtjhepyn	\N
cmprqevqz00jbnr01odb6zk9v	cmprqevqo00janr01o955qohq	IMPORT	Import hàng loạt từ Excel	2026-05-30 02:28:39.612	cmmahv7p600005bumvtjhepyn	\N
cmprqjdp900jcnr01rdybxn0k	cmprqevqo00janr01o955qohq	DISASSEMBLE	Tháo rời khỏi thiết bị mẹ [SN: SGH943Y0J2].	2026-05-30 02:32:09.502	cmmahv7p600005bumvtjhepyn	\N
cmprqjxah00jdnr01544t7wtl	cmprqevqo00janr01o955qohq	TRANSFER	Cập nhật vị trí: Kho STEP - Tủ: Không lên tủ. Trạng thái: IN_STOCK. Ghi chú: Không	2026-05-30 02:32:34.889	cmmahv7p600005bumvtjhepyn	\N
cmprqkc5u00jenr01ga6ve14k	cmprqevqo00janr01o955qohq	ASSEMBLE	Lắp ráp vào thiết bị mẹ [SN: SGH943Y0J2].	2026-05-30 02:32:54.162	cmmahv7p600005bumvtjhepyn	\N
cmprquwcy00jinr016zlwkdz6	cmprquwc200jhnr018t0d8jtt	IMPORT	Import hàng loạt từ Excel	2026-05-30 02:41:06.899	cmmahv7p600005bumvtjhepyn	\N
cmprquwd200jjnr01m75p8gwk	cmprquwbx00jfnr01ksdofoc0	IMPORT	Import hàng loạt từ Excel	2026-05-30 02:41:06.902	cmmahv7p600005bumvtjhepyn	\N
cmprquwdb00jmnr01iqmchjqs	cmprquwc000jgnr01w3dbz61b	IMPORT	Import hàng loạt từ Excel	2026-05-30 02:41:06.911	cmmahv7p600005bumvtjhepyn	\N
cmprquwe000jpnr01erl1zrx6	cmprquwd700jlnr01ln6bbloa	IMPORT	Import hàng loạt từ Excel	2026-05-30 02:41:06.937	cmmahv7p600005bumvtjhepyn	\N
cmprquwe500jrnr01a553ds9i	cmprquwdt00jnnr01dcyh8w49	IMPORT	Import hàng loạt từ Excel	2026-05-30 02:41:06.941	cmmahv7p600005bumvtjhepyn	\N
cmprquwe700jsnr01iu5h9208	cmprquwdv00jonr01jl2eqyhg	IMPORT	Import hàng loạt từ Excel	2026-05-30 02:41:06.944	cmmahv7p600005bumvtjhepyn	\N
cmprquwe400jqnr0129464as0	cmprquwd500jknr015io8pt7q	IMPORT	Import hàng loạt từ Excel	2026-05-30 02:41:06.94	cmmahv7p600005bumvtjhepyn	\N
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."User" (id, username, "passwordHash", name, role, "createdAt", "isActive") FROM stdin;
cmmahv7p600005bumvtjhepyn	admin.sang	$2b$10$9UQFkViZZvg4zd5SxP06m.Gn4jdsySY0j3Nw7JHslz/aWMqiyFWz.	Nguyễn Danh Sáng	ADMIN	2026-03-03 10:58:13.051	t
cmmfq016h001i5bd2znnds7w9	admin.phong	$2b$10$ccrl0hvzZmQgl.vI8CIWfOCqv5LzrEKWnb75QenA4/KSHSPbXgdDG	Nguyễn Duy Phong	ADMIN	2026-03-07 02:44:45.69	f
cmmlhdkbk00075bp8px1ad8bq	admin.dai	$2b$10$FyMSBvX2Ro/Fd4YuygM1EuXWT.NgP6i8ylSPSRgu9nCU8NnyzipCO	Nguyễn Duy Đại	ADMIN	2026-03-11 03:29:57.537	f
cmmoqxel500cenr01gtwk4439	daind@step.com.vn	$2b$10$pGxjsc.DQa8S/ogmqrOJs.wHXsoClsoaCeQn1zLflUwEWy5YlQtzq	Nguyễn Duy Đại	USER	2026-03-13 10:20:38.298	t
cmmoqxthk00chnr01175dxdga	phongnd@step.com.vn	$2b$10$YHt8q9mEX/NmAM6o5/Kml.StTBkpF4V3mGzdQPC2/MkdwVaBIsJWe	Nguyễn Duy Phong	USER	2026-03-13 10:20:57.608	t
cmmoqv92m00cbnr0157vo0bkk	sangnd@step.com.vn	$2b$10$dRKlMTDO/hJJkkv1FlIQCOyHgKZGAGlpRCIMDb1c0LnGNdOautSRy	Nguyễn Danh Sáng	USER	2026-03-13 10:18:57.838	t
\.


--
-- Data for Name: Warehouse; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Warehouse" (id, name, location) FROM stdin;
cmmog1iem0026nr01em9mkkb1	Data Center CMC	Tòa nhà CMC, Số 11 Phố Duy Tân, Phường Cầu Giấy, TP. Hà Nội
cmmofz16h001nnr012j89r8sx	Kho STEP	Xóm 9 Thôn 3 Phượng Cách Quốc Oai Hà Nội
cmmog2jro002bnr01a7egv5ss	Data Center VNPT	Khu B2 – 1 – 6, Khu công nghiệp Nam Thăng Long, Bắc Từ Liêm, Hà Nội.
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
\.


--
-- Name: Asset Asset_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Asset"
    ADD CONSTRAINT "Asset_pkey" PRIMARY KEY (id);


--
-- Name: Product Product_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY (id);


--
-- Name: Rack Rack_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Rack"
    ADD CONSTRAINT "Rack_pkey" PRIMARY KEY (id);


--
-- Name: RentalContract RentalContract_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."RentalContract"
    ADD CONSTRAINT "RentalContract_pkey" PRIMARY KEY (id);


--
-- Name: StockMovement StockMovement_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."StockMovement"
    ADD CONSTRAINT "StockMovement_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Warehouse Warehouse_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Warehouse"
    ADD CONSTRAINT "Warehouse_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Asset_serialNumber_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "Asset_serialNumber_key" ON public."Asset" USING btree ("serialNumber");


--
-- Name: Product_category_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Product_category_idx" ON public."Product" USING btree (category);


--
-- Name: Product_category_type_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Product_category_type_idx" ON public."Product" USING btree (category, type);


--
-- Name: Product_modelNumber_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Product_modelNumber_idx" ON public."Product" USING btree ("modelNumber");


--
-- Name: Product_modelNumber_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "Product_modelNumber_key" ON public."Product" USING btree ("modelNumber");


--
-- Name: Product_vendor_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "Product_vendor_idx" ON public."Product" USING btree (vendor);


--
-- Name: StockMovement_assetId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "StockMovement_assetId_idx" ON public."StockMovement" USING btree ("assetId");


--
-- Name: StockMovement_createdAt_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "StockMovement_createdAt_idx" ON public."StockMovement" USING btree ("createdAt");


--
-- Name: StockMovement_type_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "StockMovement_type_idx" ON public."StockMovement" USING btree (type);


--
-- Name: StockMovement_userId_idx; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX "StockMovement_userId_idx" ON public."StockMovement" USING btree ("userId");


--
-- Name: User_username_key; Type: INDEX; Schema: public; Owner: admin
--

CREATE UNIQUE INDEX "User_username_key" ON public."User" USING btree (username);


--
-- Name: Asset Asset_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Asset"
    ADD CONSTRAINT "Asset_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public."Asset"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Asset Asset_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Asset"
    ADD CONSTRAINT "Asset_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Asset Asset_rackId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Asset"
    ADD CONSTRAINT "Asset_rackId_fkey" FOREIGN KEY ("rackId") REFERENCES public."Rack"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Asset Asset_warehouseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Asset"
    ADD CONSTRAINT "Asset_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES public."Warehouse"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Rack Rack_warehouseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."Rack"
    ADD CONSTRAINT "Rack_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES public."Warehouse"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RentalContract RentalContract_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."RentalContract"
    ADD CONSTRAINT "RentalContract_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public."Asset"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockMovement StockMovement_assetId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."StockMovement"
    ADD CONSTRAINT "StockMovement_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES public."Asset"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: StockMovement StockMovement_targetUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."StockMovement"
    ADD CONSTRAINT "StockMovement_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: StockMovement StockMovement_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public."StockMovement"
    ADD CONSTRAINT "StockMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict 9nINoNLv0syXv6dZXmxxKt2tsSZKMPNCDJBIqOViGoW06Lp8tso9VNrZP7SPA45

