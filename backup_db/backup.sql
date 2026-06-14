--
-- PostgreSQL database dump
--

\restrict kDXJjPrhrSROXbNHxFU55VgFcthb3oqd1A4htZ6nCRvzKDOolsmvEHd7Tkkwkft

-- Dumped from database version 17.6 (Debian 17.6-1.pgdg13+1)
-- Dumped by pg_dump version 17.6 (Debian 17.6-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
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
-- Data for Name: Asset; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Asset" (id, "serialNumber", status, "productId", "warehouseId", "rackId", "rackUnit", "createdAt", "updatedAt", "parentId", notes, "uHeight", "deletedAt", "deletedById", owner) FROM stdin;
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
cmmlkough001h5b9etmrc58nj	CARD DELL R740 PCIe NVME	CARD-DELL-R740-PCIe-NVME	ACCESSORY	SAMSUNG	2026-03-11 05:02:42.737		{}	PCLE
cmmlkqlys001k5b9es8qpcyei	RAM ECC DDR4 64GB 2666V	RAM-ECC-DDR4-64GB-2666V	MEMORY	SAMSUNG	2026-03-11 05:04:05.044		{"speed": "2666V", "capacity": "64GB", "generation": "ECC DDR4"}	\N
cmmlkrzrg001n5b9e5361zazr	RAM ECC DDR4 64GB 3200	RAM-ECC-DDR4-64GB-3200	MEMORY	SAMSUNG	2026-03-11 05:05:09.58		{"speed": "3200", "capacity": "64GB", "generation": "ECC DDR4"}	\N
cmmlktcog001q5b9e6omw3ki5	RAM ECC DDR4 32GB 2666V	RAM-ECC-DDR4-32GB-2666V	MEMORY	SAMSUNG	2026-03-11 05:06:12.976		{"speed": "2666V", "capacity": "32GB", "generation": "ECC DDR4"}	\N
cmmlkuj0h001t5b9e44f0npid	RAM ECC DDR4 32GB 2400T	RAM-ECC-DDR4-32GB-2400T	MEMORY	SAMSUNG	2026-03-11 05:07:07.842		{"speed": "2400T", "capacity": "32GB", "generation": "ECC DDR4"}	\N
cmmlkvvue001w5b9e0hsl43q4	CPU PLATIUM 8163	CPU-PLATIUM-8163	CPU	Intel	2026-03-11 05:08:11.126		{"series": "Platinum"}	\N
cmmlkwnsa001z5b9e75244e0q	CPU GOLD 6138T	CPU-GOLD-6138T	CPU	Intel	2026-03-11 05:08:47.338		{"series": "Gold", "generation": "ECC DDR4"}	\N
cmmlkxfw200225b9e5ir94aqo	CPU SILVER 4310	CPU-SILVER-4310	CPU	Intel	2026-03-11 05:09:23.763		{"series": "Silver"}	\N
cmmlkym3900255b9e6iepbslr	CARD MẠNG 16GB FC	CARD-MẠNG-16GB-FC	ACCESSORY	SAMSUNG	2026-03-11 05:10:18.454		{}	CARD MẠNG 
cmmlkzeul00285b9ey9txc0k8	CARD NIVIDIA M10	CARD-NIVIDIA-M10	GPU	NIVIDIA	2026-03-11 05:10:55.725		{}	\N
cmmll04t0002b5b9ezvb19uce	CARD NVIDIA TESLA A4000	CARD-NVIDIA-TESLA-A4000	GPU	NVIDIA	2026-03-11 05:11:29.365		{}	\N
cmmll11g6002e5b9etyzdhdcw	CARD NVIDIA TESLA A5000	CARD-NVIDIA-TESLA-A5000	GPU	SAMSUNG	2026-03-11 05:12:11.67		{}	\N
\.


--
-- Data for Name: Rack; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Rack" (id, name, "totalUnits", "warehouseId", "createdAt", type) FROM stdin;
\.


--
-- Data for Name: RentalContract; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."RentalContract" (id, "customerName", "startDate", "endDate", status, "assetId", "createdAt", "updatedAt", "alert14Sent", "alert1Sent", "alert3Sent", "alert7Sent", "alertExpiredSent") FROM stdin;
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
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."User" (id, username, "passwordHash", name, role, "createdAt", "isActive") FROM stdin;
cmmahv7p600005bumvtjhepyn	admin.sang	$2a$12$XpfjkSn7YJX5QQG/G8nzYuxx/MbUEl7jMMUAY2mTHon3iyuEixwle	Nguyễn Danh Sáng	ADMIN	2026-03-03 10:58:13.051	t
cmmfq016h001i5bd2znnds7w9	admin.phong	$2b$10$ccrl0hvzZmQgl.vI8CIWfOCqv5LzrEKWnb75QenA4/KSHSPbXgdDG	Nguyễn Duy Phong	ADMIN	2026-03-07 02:44:45.69	t
cmmlhdkbk00075bp8px1ad8bq	admin.dai	$2b$10$FyMSBvX2Ro/Fd4YuygM1EuXWT.NgP6i8ylSPSRgu9nCU8NnyzipCO	Nguyễn Duy Đại	ADMIN	2026-03-11 03:29:57.537	t
\.


--
-- Data for Name: Warehouse; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public."Warehouse" (id, name, location) FROM stdin;
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

\unrestrict kDXJjPrhrSROXbNHxFU55VgFcthb3oqd1A4htZ6nCRvzKDOolsmvEHd7Tkkwkft

