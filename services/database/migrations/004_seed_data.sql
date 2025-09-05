-- 004_seed_data.sql

-- Insert default settings
INSERT INTO settings (
    association_name, 
    about, 
    operating_hours, 
    production_time, 
    address, 
    whatsapp, 
    site, 
    instagram, 
    pix_key, 
    company_name, 
    bank_name
) VALUES (
    'Associação SATIVAR',
    'Associação de apoio ao tratamento com canabinoides',
    'Segunda a Sexta, das 9h às 18h',
    '7-10 dias úteis',
    'Endereço da Associação',
    '(11) 99999-9999',
    'www.sativar.org',
    '@sativar',
    'chave-pix@sativar.org',
    'Associação SATIVAR Ltda',
    'Banco do Brasil'
) ON CONFLICT DO NOTHING;

-- Insert sample products
INSERT INTO products (name, price, description, icon, settings_id) 
SELECT 
    'Óleo CBD 10%', 
    150.00, 
    'Óleo de canabidiol 10% em frasco conta-gotas', 
    'oil-icon',
    id
FROM settings 
WHERE association_name = 'Associação SATIVAR'
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, description, icon, settings_id) 
SELECT 
    'Óleo CBD 20%', 
    250.00, 
    'Óleo de canabidiol 20% em frasco conta-gotas', 
    'oil-icon',
    id
FROM settings 
WHERE association_name = 'Associação SATIVAR'
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, description, icon, settings_id) 
SELECT 
    'Pomada Canabidiol', 
    90.00, 
    'Pomada à base de canabidiol para uso tópico', 
    'cream-icon',
    id
FROM settings 
WHERE association_name = 'Associação SATIVAR'
ON CONFLICT DO NOTHING;