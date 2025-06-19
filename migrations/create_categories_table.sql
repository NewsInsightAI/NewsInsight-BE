-- Migration to create categories table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    slug VARCHAR(120) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- Insert some default categories
INSERT INTO categories (name, description, slug) VALUES
    ('Teknologi', 'Informasi terbaru mengenai perkembangan dunia teknologi dan inovasi digital', 'teknologi'),
    ('AI', 'Artikel seputar kecerdasan buatan, machine learning, dan penerapannya dalam berbagai bidang', 'ai'),
    ('Otomotif', 'Berita dan ulasan tentang kendaraan terbaru, industri otomotif, serta tips berkendara', 'otomotif'),
    ('Gadget', 'Review dan berita terkini tentang gadget, smartphone, dan perangkat elektronik lainnya', 'gadget'),
    ('Kesehatan', 'Informasi dan berita terbaru seputar kesehatan, gaya hidup sehat, dan tips kesehatan', 'kesehatan'),
    ('Olahraga', 'Berita dan informasi seputar dunia olahraga, kompetisi, dan atlet', 'olahraga')
ON CONFLICT (name) DO NOTHING;
