-- marcas
create table if not exists brands (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name            text not null,
  tagline         text not null default '',
  category        text not null default 'general',
  color           text not null default 'ciruela',
  whatsapp        text not null default '',
  status          text not null default 'draft'
                    check (status in ('draft','pending','active','suspended')),
  origin_name     text not null default '',
  origin_street   text not null default '',
  origin_city     text not null default '',
  origin_province text not null default '',
  origin_zip      text not null default '',
  origin_phone    text not null default '',
  recharge_confirmed_at timestamptz,
  activated_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists brands_status_idx on brands (status);

-- credenciales oauth por marca, cifradas en reposo
create table if not exists brand_credentials (
  brand_id          uuid primary key references brands (id) on delete cascade,
  client_id_enc     text not null,
  client_secret_enc text not null,
  environment       text not null default 'sandbox'
                      check (environment in ('sandbox','production')),
  connected_at      timestamptz,
  last_verified_at  timestamptz,
  last_error        text
);

-- cache de token de acceso; el token vive 2 horas
create table if not exists brand_tokens (
  brand_id         uuid primary key references brands (id) on delete cascade,
  access_token_enc text not null,
  expires_at       timestamptz not null
);

create table if not exists products (
  id            uuid primary key default gen_random_uuid(),
  brand_id      uuid not null references brands (id) on delete cascade,
  name          text not null,
  description   text not null default '',
  price_cop     integer not null check (price_cop >= 0),
  weight_grams  integer not null default 300 check (weight_grams > 0),
  image_url     text,
  position      integer not null default 0,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create index if not exists products_brand_idx on products (brand_id, position);

-- numeración de pedidos sin condición de carrera
create sequence if not exists orders_code_seq start with 1001;

create table if not exists orders (
  id              uuid primary key default gen_random_uuid(),
  brand_id        uuid not null references brands (id) on delete cascade,
  code            text not null unique default ('ORD-' || nextval('orders_code_seq')),
  customer_name   text not null,
  customer_phone  text not null default '',
  city            text not null,
  zip             text not null default '',
  address         text not null,
  subtotal_cop    integer not null default 0,
  shipping_cop    integer not null default 0,
  weight_grams    integer not null default 300,
  carrier         text,
  rate_id         text,
  quotation_id    text,
  status          text not null default 'pending'
                    check (status in ('pending','labeled','cancelled','delivered')),
  shipment_id     text,
  tracking_number text,
  label_url       text,
  label_error     text,
  created_at      timestamptz not null default now()
);

create index if not exists orders_brand_idx on orders (brand_id, created_at desc);
create index if not exists orders_tracking_idx on orders (tracking_number);

create table if not exists order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references orders (id) on delete cascade,
  product_id     uuid references products (id) on delete set null,
  name_snapshot  text not null,
  unit_price_cop integer not null,
  weight_grams   integer not null default 300,
  quantity       integer not null check (quantity > 0)
);

create index if not exists order_items_order_idx on order_items (order_id);

-- eventos entrantes de webhook, persistidos antes de procesar
create table if not exists webhook_events (
  id              uuid primary key default gen_random_uuid(),
  brand_id        uuid references brands (id) on delete set null,
  event_type      text not null,
  tracking_number text,
  payload         jsonb not null,
  received_at     timestamptz not null default now(),
  processed_at    timestamptz
);

create index if not exists webhook_events_pending_idx
  on webhook_events (received_at) where processed_at is null;

-- cuentas de acceso: la asesora administra marcas, la marca administra su tienda
create table if not exists accounts (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  password_hash text not null,
  role          text not null check (role in ('advisor','brand')),
  brand_id      uuid references brands (id) on delete cascade,
  name          text not null default '',
  active        boolean not null default true,
  last_login_at timestamptz,
  created_at    timestamptz not null default now(),
  constraint accounts_scope check (
    (role = 'brand' and brand_id is not null) or (role = 'advisor' and brand_id is null)
  )
);

create index if not exists accounts_brand_idx on accounts (brand_id);
create unique index if not exists accounts_brand_owner_idx on accounts (brand_id) where role = 'brand';

-- recarga minima mensual que mantiene publicada una tienda del plan gratis
alter table brands add column if not exists min_recharge_cop integer not null default 30000;
alter table brands add column if not exists plan text not null default 'free'
  check (plan in ('free','pro'));

alter table brands add column if not exists advisor_id uuid references accounts (id) on delete set null;
create index if not exists brands_advisor_idx on brands (advisor_id);

-- politica de envio: el comprador ve un solo precio, la marca decide como se calcula
alter table brands add column if not exists shipping_mode text not null default 'cheapest'
  check (shipping_mode in ('cheapest','preferred','flat','free_over','included'));
alter table brands add column if not exists shipping_carriers text[] not null default '{}';
alter table brands add column if not exists shipping_flat_local_cop integer not null default 0;
alter table brands add column if not exists shipping_flat_national_cop integer not null default 0;
alter table brands add column if not exists shipping_free_over_cop integer not null default 0;
alter table brands add column if not exists shipping_markup_cop integer not null default 0;

-- datos de recaudo que ve el comprador al momento de pagar
alter table brands add column if not exists pay_transfer_enabled boolean not null default true;
alter table brands add column if not exists pay_gateway_enabled boolean not null default false;
alter table brands add column if not exists pay_gateway_provider text not null default '';
alter table brands add column if not exists pay_bank_name text not null default '';
alter table brands add column if not exists pay_bank_account text not null default '';
alter table brands add column if not exists pay_bank_holder text not null default '';
alter table brands add column if not exists pay_nequi text not null default '';
alter table brands add column if not exists pay_instructions text not null default '';

-- la guia solo se genera con payment_status = 'confirmed'
alter table orders add column if not exists payment_method text not null default 'transfer'
  check (payment_method in ('transfer','gateway'));
alter table orders add column if not exists payment_status text not null default 'pending'
  check (payment_status in ('pending','review','confirmed','rejected'));
alter table orders add column if not exists payment_reference text not null default '';
alter table orders add column if not exists payment_proof_url text;
alter table orders add column if not exists payment_note text not null default '';
alter table orders add column if not exists payment_confirmed_at timestamptz;
alter table orders add column if not exists payment_confirmed_by uuid references accounts (id) on delete set null;

-- shipping_cop es lo que paga el comprador; shipping_quoted_cop es la tarifa real de la transportadora
alter table orders add column if not exists shipping_quoted_cop integer not null default 0;

create index if not exists orders_payment_idx on orders (brand_id, payment_status, created_at desc);
