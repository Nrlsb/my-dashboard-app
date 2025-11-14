-- Table: public.products

-- DROP TABLE IF EXISTS public.products;

CREATE TABLE IF NOT EXISTS public.products
(
    id integer NOT NULL DEFAULT nextval('products_id_seq'::regclass),
    code character varying(50) COLLATE pg_catalog."default" NOT NULL,
    description text COLLATE pg_catalog."default",
    capacity character varying(50) COLLATE pg_catalog."default",
    product_group character varying(100) COLLATE pg_catalog."default",
    ts_standard character varying(50) COLLATE pg_catalog."default",
    table_code character varying(50) COLLATE pg_catalog."default",
    price numeric(12,2) DEFAULT 0.00,
    capacity_description text COLLATE pg_catalog."default",
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    brand character varying(255) COLLATE pg_catalog."default",
    moneda integer DEFAULT 1,
    cotizacion numeric(10,2) DEFAULT 1.00,
    CONSTRAINT products_pkey PRIMARY KEY (id),
    CONSTRAINT products_code_key UNIQUE (code)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.products
    OWNER to postgres;
-- Index: idx_products_brand

-- DROP INDEX IF EXISTS public.idx_products_brand;

CREATE INDEX IF NOT EXISTS idx_products_brand
    ON public.products USING btree
    (brand COLLATE pg_catalog."default" ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;
-- Index: idx_products_description

-- DROP INDEX IF EXISTS public.idx_products_description;

CREATE INDEX IF NOT EXISTS idx_products_description
    ON public.products USING btree
    (description COLLATE pg_catalog."default" ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;
-- Index: idx_products_group

-- DROP INDEX IF EXISTS public.idx_products_group;

CREATE INDEX IF NOT EXISTS idx_products_group
    ON public.products USING btree
    (product_group COLLATE pg_catalog."default" ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;
-- Index: idx_products_price

-- DROP INDEX IF EXISTS public.idx_products_price;

CREATE INDEX IF NOT EXISTS idx_products_price
    ON public.products USING btree
    (price ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;



-- Table: public.account_movements

-- DROP TABLE IF EXISTS public.account_movements;

CREATE TABLE IF NOT EXISTS public.account_movements
(
    id integer NOT NULL DEFAULT nextval('account_movements_id_seq'::regclass),
    user_id integer NOT NULL,
    date date NOT NULL,
    description text COLLATE pg_catalog."default",
    debit numeric(12,2) DEFAULT 0,
    credit numeric(12,2) DEFAULT 0,
    balance numeric(12,2) DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    order_ref integer,
    CONSTRAINT account_movements_pkey PRIMARY KEY (id),
    CONSTRAINT account_movements_order_ref_fkey FOREIGN KEY (order_ref)
        REFERENCES public.orders (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT account_movements_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.account_movements
    OWNER to postgres;
-- Index: idx_account_movements_user_id_date

-- DROP INDEX IF EXISTS public.idx_account_movements_user_id_date;

CREATE INDEX IF NOT EXISTS idx_account_movements_user_id_date
    ON public.account_movements USING btree
    (user_id ASC NULLS LAST, date DESC NULLS FIRST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;


-- Table: public.offers

-- DROP TABLE IF EXISTS public.offers;

CREATE TABLE IF NOT EXISTS public.offers
(
    id integer NOT NULL DEFAULT nextval('offers_id_seq'::regclass),
    title text COLLATE pg_catalog."default" NOT NULL,
    description text COLLATE pg_catalog."default",
    price text COLLATE pg_catalog."default",
    old_price text COLLATE pg_catalog."default",
    image_url text COLLATE pg_catalog."default",
    CONSTRAINT offers_pkey PRIMARY KEY (id)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.offers
    OWNER to postgres;


-- Table: public.order_items

-- DROP TABLE IF EXISTS public.order_items;

CREATE TABLE IF NOT EXISTS public.order_items
(
    id integer NOT NULL DEFAULT nextval('order_items_id_seq'::regclass),
    order_id integer NOT NULL,
    product_id integer,
    product_code character varying(50) COLLATE pg_catalog."default" NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT order_items_pkey PRIMARY KEY (id),
    CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id)
        REFERENCES public.orders (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id)
        REFERENCES public.products (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.order_items
    OWNER to postgres;
-- Index: idx_order_items_order_id

-- DROP INDEX IF EXISTS public.idx_order_items_order_id;

CREATE INDEX IF NOT EXISTS idx_order_items_order_id
    ON public.order_items USING btree
    (order_id ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;
-- Index: idx_order_items_product_id

-- DROP INDEX IF EXISTS public.idx_order_items_product_id;

CREATE INDEX IF NOT EXISTS idx_order_items_product_id
    ON public.order_items USING btree
    (product_id ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;


-- Table: public.orders

-- DROP TABLE IF EXISTS public.orders;

CREATE TABLE IF NOT EXISTS public.orders
(
    id integer NOT NULL DEFAULT nextval('orders_id_seq'::regclass),
    user_id integer NOT NULL,
    status character varying(50) COLLATE pg_catalog."default" DEFAULT 'Pendiente'::character varying,
    total numeric(12,2) DEFAULT 0.00,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT orders_pkey PRIMARY KEY (id),
    CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.orders
    OWNER to postgres;
-- Index: idx_orders_user_id_created_at

-- DROP INDEX IF EXISTS public.idx_orders_user_id_created_at;

CREATE INDEX IF NOT EXISTS idx_orders_user_id_created_at
    ON public.orders USING btree
    (user_id ASC NULLS LAST, created_at DESC NULLS FIRST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;


-- Table: public.queries

-- DROP TABLE IF EXISTS public.queries;

CREATE TABLE IF NOT EXISTS public.queries
(
    id integer NOT NULL DEFAULT nextval('queries_id_seq'::regclass),
    user_id integer NOT NULL,
    subject character varying(255) COLLATE pg_catalog."default" NOT NULL,
    message text COLLATE pg_catalog."default" NOT NULL,
    status character varying(50) COLLATE pg_catalog."default" DEFAULT 'Recibida'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT queries_pkey PRIMARY KEY (id),
    CONSTRAINT queries_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.queries
    OWNER to postgres;
-- Index: idx_queries_user_id

-- DROP INDEX IF EXISTS public.idx_queries_user_id;

CREATE INDEX IF NOT EXISTS idx_queries_user_id
    ON public.queries USING btree
    (user_id ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;


-- Table: public.users

-- DROP TABLE IF EXISTS public.users;

CREATE TABLE IF NOT EXISTS public.users
(
    id integer NOT NULL DEFAULT nextval('users_id_seq'::regclass),
    email character varying(255) COLLATE pg_catalog."default" NOT NULL,
    password_hash character varying(255) COLLATE pg_catalog."default" NOT NULL,
    full_name character varying(255) COLLATE pg_catalog."default",
    a1_cod character varying(20) COLLATE pg_catalog."default",
    a1_loja character varying(10) COLLATE pg_catalog."default",
    a1_cgc character varying(20) COLLATE pg_catalog."default",
    a1_tel character varying(30) COLLATE pg_catalog."default",
    a1_endereco text COLLATE pg_catalog."default",
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_admin boolean DEFAULT false,
    a1_desc text COLLATE pg_catalog."default",
    a1_desc2 text COLLATE pg_catalog."default",
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_email_key UNIQUE (email)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.users
    OWNER to postgres;        


-- Table: public.vouchers

-- DROP TABLE IF EXISTS public.vouchers;

CREATE TABLE IF NOT EXISTS public.vouchers
(
    id integer NOT NULL DEFAULT nextval('vouchers_id_seq'::regclass),
    user_id integer NOT NULL,
    file_path character varying(255) COLLATE pg_catalog."default" NOT NULL,
    original_name character varying(255) COLLATE pg_catalog."default" NOT NULL,
    file_size bigint,
    mime_type character varying(100) COLLATE pg_catalog."default",
    upload_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT vouchers_pkey PRIMARY KEY (id),
    CONSTRAINT vouchers_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES public.users (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.vouchers
    OWNER to postgres;
-- Index: idx_vouchers_user_id

-- DROP INDEX IF EXISTS public.idx_vouchers_user_id;

CREATE INDEX IF NOT EXISTS idx_vouchers_user_id
    ON public.vouchers USING btree
    (user_id ASC NULLS LAST)
    WITH (fillfactor=100, deduplicate_items=True)
    TABLESPACE pg_default;