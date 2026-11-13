-- marca de ejemplo lista para mostrar: origen cargado, recarga confirmada y publicada
insert into brands (slug, name, tagline, category, color, whatsapp, status,
                    origin_name, origin_street, origin_city, origin_province,
                    origin_zip, origin_phone, recharge_confirmed_at, activated_at)
values ('lunaria', 'Lunaria', 'Accesorios tejidos a mano · Bogotá', 'accesorios', 'ciruela',
        '573000000000', 'active', 'Lunaria', 'Calle 93 # 15-40', 'Bogotá', 'Cundinamarca',
        '11001', '573000000000', now(), now())
on conflict (slug) do nothing;

insert into products (brand_id, name, description, price_cop, weight_grams, position)
select b.id, v.name, v.description, v.price, v.weight, v.pos
  from brands b
  cross join (values
    ('Aretes Wayuu', 'Tejido a mano en hilo encerado, 4 cm', 38000, 60, 0),
    ('Collar Piedra Luna', 'Dije en piedra natural con baño de oro', 52000, 90, 1),
    ('Pulsera Trenzada', 'Hilo encerado con cierre ajustable', 24000, 35, 2),
    ('Mochila Pequeña', 'Tejida en fique, forro interno', 95000, 420, 3),
    ('Anillo Martillado', 'Plata 925 con textura artesanal', 46000, 25, 4),
    ('Aretes Gota', 'Baño de oro de 18k, livianos', 34000, 45, 5)
  ) as v(name, description, price, weight, pos)
 where b.slug = 'lunaria'
   and not exists (select 1 from products p where p.brand_id = b.id);
