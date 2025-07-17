const pool = require("./db");

async function addSampleNews() {
  try {
    // Get categories first
    const categoriesResult = await pool.query(
      "SELECT id, slug, name FROM categories ORDER BY id"
    );
    const categories = categoriesResult.rows;

    console.log("Available categories:", categories);

    // Sample news data for each category
    const sampleNews = [
      // AI Category
      {
        category_id: 2, // AI
        title: "Perkembangan AI Terbaru: ChatGPT-5 Akan Segera Dirilis",
        content:
          "OpenAI mengumumkan bahwa ChatGPT-5 dengan kemampuan reasoning yang lebih baik akan segera dirilis tahun ini. Model ini diklaim 10x lebih cerdas dari pendahulunya.",
        excerpt:
          "OpenAI siap merilis ChatGPT-5 dengan kemampuan reasoning yang jauh lebih baik",
        status: "published",
        created_by: 5,
      },
      {
        category_id: 2, // AI
        title: "Google Gemini Ultra Kalahkan GPT-4 dalam Benchmark Terbaru",
        content:
          "Dalam tes benchmark terbaru, Google Gemini Ultra berhasil mengungguli GPT-4 dalam berbagai aspek termasuk coding, reasoning, dan pemahaman konteks.",
        excerpt:
          "Google Gemini Ultra tunjukkan performa superior dibanding GPT-4",
        status: "published",
        created_by: 5,
      },
      // Otomotif Category
      {
        category_id: 3, // Otomotif
        title: "Tesla Model Y Facelift 2025 Hadir dengan Desain Revolusioner",
        content:
          "Tesla menghadirkan Model Y facelift dengan desain exterior yang lebih aerodinamis dan interior yang sepenuhnya diperbarui dengan layar sentuh 17 inci.",
        excerpt:
          "Tesla Model Y 2025 hadirkan desain revolusioner dan teknologi terdepan",
        status: "published",
        created_by: 5,
      },
      {
        category_id: 3, // Otomotif
        title: "BMW iX5 Hydrogen: Mobil Listrik Bertenaga Hidrogen Pertama",
        content:
          "BMW memperkenalkan iX5 Hydrogen, kendaraan listrik pertama yang menggunakan fuel cell hidrogen dengan jangkauan hingga 500 km sekali isi.",
        excerpt:
          "BMW iX5 Hydrogen revolusi kendaraan ramah lingkungan masa depan",
        status: "published",
        created_by: 5,
      },
      // Gadget Category
      {
        category_id: 4, // Gadget
        title: "iPhone 16 Pro Max: Revolusi Camera dengan AI Photography",
        content:
          "Apple iPhone 16 Pro Max menampilkan sistem kamera revolusioner dengan AI Photography yang dapat mengambil foto profesional secara otomatis.",
        excerpt:
          "iPhone 16 Pro Max hadirkan AI Photography untuk foto profesional otomatis",
        status: "published",
        created_by: 5,
      },
      {
        category_id: 4, // Gadget
        title: "Samsung Galaxy S25 Ultra Dilengkapi S Pen Generasi Baru",
        content:
          "Samsung Galaxy S25 Ultra hadir dengan S Pen generasi baru yang mendukung AI writing dan dapat menulis di udara dengan teknologi gesture recognition.",
        excerpt:
          "Galaxy S25 Ultra S Pen baru dukung AI writing dan gesture recognition",
        status: "published",
        created_by: 5,
      },
      // Kesehatan Category
      {
        category_id: 5, // Kesehatan
        title: "Terobosan Baru: Terapi Gen untuk Penyembuhan Diabetes Tipe 1",
        content:
          "Para peneliti berhasil mengembangkan terapi gen yang dapat menyembuhkan diabetes tipe 1 dengan meregenerasi sel beta pankreas secara alami.",
        excerpt:
          "Terapi gen terbaru berhasil sembuhkan diabetes tipe 1 secara permanen",
        status: "published",
        created_by: 5,
      },
      {
        category_id: 5, // Kesehatan
        title: "Vaksin Universal Flu: Satu Vaksin untuk Semua Strain",
        content:
          "Ilmuwan berhasil mengembangkan vaksin universal influenza yang efektif melawan semua strain flu, termasuk H1N1, H3N2, dan varian baru.",
        excerpt:
          "Vaksin universal flu lindungi dari semua strain influenza sekaligus",
        status: "published",
        created_by: 5,
      },
      // Olahraga Category
      {
        category_id: 6, // Olahraga
        title: "Timnas Indonesia Lolos ke Piala Dunia 2026",
        content:
          "Timnas Indonesia berhasil mengamankan tiket ke Piala Dunia 2026 setelah mengalahkan Australia 2-1 dalam pertandingan play-off zona Asia.",
        excerpt: "Timnas Indonesia cetak sejarah lolos ke Piala Dunia 2026",
        status: "published",
        created_by: 5,
      },
      {
        category_id: 6, // Olahraga
        title: "Lionel Messi Resmi Pensiun dari Sepak Bola Profesional",
        content:
          "Lionel Messi mengumumkan pensiun dari sepak bola profesional setelah membawa Inter Miami meraih MLS Cup 2025. Ini menandai akhir era GOAT.",
        excerpt: "Lionel Messi umumkan pensiun dari sepak bola profesional",
        status: "published",
        created_by: 5,
      },
    ];

    console.log("Inserting sample news...");

    for (const news of sampleNews) {
      // Generate slug from title
      const slug = news.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      // Generate hashed_id (simple hash)
      const hashed_id = require("crypto")
        .createHash("md5")
        .update(news.title + Date.now())
        .digest("hex");

      const insertQuery = `
        INSERT INTO news (
          title, content, excerpt, slug, category_id, status, 
          published_at, hashed_id, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8)
        RETURNING id, title;
      `;

      const result = await pool.query(insertQuery, [
        news.title,
        news.content,
        news.excerpt,
        slug,
        news.category_id,
        news.status,
        hashed_id,
        news.created_by,
      ]);

      console.log(
        `✅ Created news: ${result.rows[0].title} (ID: ${result.rows[0].id})`
      );
    }

    console.log("\\n🎉 Sample news data has been successfully added!");
    console.log("\\nUpdated categories with news count:");

    // Show updated categories
    const updatedCategoriesQuery = `
      SELECT 
        c.id, c.name, c.slug,
        (SELECT COUNT(*) FROM news WHERE category_id = c.id AND status = 'published') as news_count
      FROM categories c
      ORDER BY c.id;
    `;

    const updatedResult = await pool.query(updatedCategoriesQuery);
    updatedResult.rows.forEach((cat) => {
      console.log(`📰 ${cat.name}: ${cat.news_count} berita`);
    });
  } catch (error) {
    console.error("Error adding sample news:", error);
  } finally {
    process.exit(0);
  }
}

addSampleNews();
