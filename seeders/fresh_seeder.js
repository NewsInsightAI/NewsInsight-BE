const pool = require("../db");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

// Helper function to generate slug
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Helper function to generate hashed ID
function generateHashedId() {
  return crypto.randomBytes(16).toString("hex");
}

async function clearAndSeedDatabase() {
  console.log("🌱 Starting fresh database seeding...");
  console.log(
    "⚠️  WARNING: This will clear existing data and add fresh sample data!"
  );

  try {
    // Clear existing data in reverse order of dependencies
    console.log("🗑️  Clearing existing data...");

    await pool.query("DELETE FROM news_tags");
    await pool.query("DELETE FROM news_authors");
    await pool.query("DELETE FROM comments");
    await pool.query("DELETE FROM news");
    await pool.query("DELETE FROM profile");
    await pool.query("DELETE FROM users WHERE id > 0"); // Delete all users

    console.log("✅ Existing data cleared");

    // Reset sequences
    await pool.query("SELECT setval('users_id_seq', 1, false)");
    await pool.query("SELECT setval('news_id_seq', 1, false)");
    await pool.query("SELECT setval('profile_id_seq', 1, false)");

    // 1. Seed Users (10 users)
    console.log("📝 Seeding users...");
    const hashedPassword = await bcrypt.hash("password123", 10);

    const usersData = [
      {
        email: "admin@newsinsight.com",
        username: "admin",
        password: hashedPassword,
        role: "admin",
        email_verified: true,
        auth_provider: "email",
      },
      {
        email: "alexandra.alper@reuters.com",
        username: "alexandra_alper",
        password: hashedPassword,
        role: "editor",
        email_verified: true,
        auth_provider: "email",
      },
      {
        email: "david.shepardson@reuters.com",
        username: "david_shepardson",
        password: hashedPassword,
        role: "contributor",
        email_verified: true,
        auth_provider: "email",
      },
      {
        email: "harshita.meenaktshi@reuters.com",
        username: "harshita_meenaktshi",
        password: hashedPassword,
        role: "contributor",
        email_verified: true,
        auth_provider: "email",
      },
      {
        email: "mark.porter@reuters.com",
        username: "mark_porter",
        password: hashedPassword,
        role: "editor",
        email_verified: true,
        auth_provider: "email",
      },
      {
        email: "sarah.mitchell@meta.com",
        username: "sarah_mitchell",
        password: hashedPassword,
        role: "contributor",
        email_verified: true,
        auth_provider: "email",
      },
      {
        email: "ahmad.rahman@kompas.com",
        username: "ahmad_rahman",
        password: hashedPassword,
        role: "contributor",
        email_verified: true,
        auth_provider: "email",
      },
      {
        email: "jennifer.smith@tempo.com",
        username: "jennifer_smith",
        password: hashedPassword,
        role: "editor",
        email_verified: true,
        auth_provider: "email",
      },
      {
        email: "michael.johnson@detik.com",
        username: "michael_johnson",
        password: hashedPassword,
        role: "contributor",
        email_verified: true,
        auth_provider: "email",
      },
      {
        email: "user@example.com",
        username: "regular_user",
        password: hashedPassword,
        role: "user",
        email_verified: true,
        auth_provider: "email",
      },
    ];

    const userIds = [];
    for (const userData of usersData) {
      const result = await pool.query(
        `INSERT INTO users (email, username, password, role, email_verified, auth_provider, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) 
         RETURNING id`,
        [
          userData.email,
          userData.username,
          userData.password,
          userData.role,
          userData.email_verified,
          userData.auth_provider,
        ]
      );
      userIds.push(result.rows[0].id);
      console.log(`  ✓ Created user: ${userData.email}`);
    }

    console.log(`✅ ${userIds.length} users created`);

    // 2. Seed Profiles
    console.log("👤 Seeding profiles...");
    const profilesData = [
      {
        user_id: userIds[0],
        full_name: "Administrator NewsInsight",
        gender: "other",
        phone_number: "+62812345678",
        domicile: "Jakarta, Indonesia",
        news_interest: ["Teknologi", "Politik", "Bisnis"],
        headline: "Administrator sistem NewsInsight",
        biography:
          "Mengelola dan mengawasi platform berita NewsInsight untuk memberikan informasi terkini dan akurat.",
        avatar: "/images/avatars/admin.jpg",
      },
      {
        user_id: userIds[1],
        full_name: "Alexandra Alper",
        gender: "female",
        phone_number: "+1234567890",
        domicile: "Washington, USA",
        news_interest: ["Politik", "Teknologi", "Ekonomi"],
        headline: "Senior Technology Reporter at Reuters",
        biography:
          "Experienced journalist covering technology policy and regulation in Washington D.C.",
        avatar: "/images/avatars/alexandra.jpg",
      },
      {
        user_id: userIds[2],
        full_name: "David Shepardson",
        gender: "male",
        phone_number: "+1234567891",
        domicile: "Washington, USA",
        news_interest: ["Teknologi", "Otomotif", "Regulasi"],
        headline: "Transportation and Technology Reporter",
        biography:
          "Covering transportation technology and automotive industry developments.",
        avatar: "/images/avatars/david.jpg",
      },
      {
        user_id: userIds[3],
        full_name: "Harshita Meenaktshi",
        gender: "female",
        phone_number: "+91987654321",
        domicile: "Bengaluru, India",
        news_interest: ["Teknologi", "AI", "Startup"],
        headline: "Tech Innovation Reporter",
        biography:
          "Covering technology startups and innovation in the Indian tech ecosystem.",
        avatar: "/images/avatars/harshita.jpg",
      },
      {
        user_id: userIds[4],
        full_name: "Mark Porter",
        gender: "male",
        phone_number: "+1234567892",
        domicile: "New York, USA",
        news_interest: ["Teknologi", "Media", "Editorial"],
        headline: "Senior Editor at Reuters Technology",
        biography:
          "Experienced editor overseeing technology coverage and editorial quality.",
        avatar: "/images/avatars/mark.jpg",
      },
      {
        user_id: userIds[5],
        full_name: "Sarah Mitchell",
        gender: "female",
        phone_number: "+1234567893",
        domicile: "San Francisco, USA",
        news_interest: ["Teknologi", "Social Media", "AI"],
        headline: "Tech Industry Analyst",
        biography:
          "Analyzing trends in social media technology and artificial intelligence.",
        avatar: "/images/avatars/sarah.jpg",
      },
      {
        user_id: userIds[6],
        full_name: "Ahmad Rahman",
        gender: "male",
        phone_number: "+62813456789",
        domicile: "Jakarta, Indonesia",
        news_interest: ["Teknologi", "Lokal", "Bisnis"],
        headline: "Technology Reporter Kompas",
        biography: "Meliput perkembangan teknologi dan digital di Indonesia.",
        avatar: "/images/avatars/ahmad.jpg",
      },
      {
        user_id: userIds[7],
        full_name: "Jennifer Smith",
        gender: "female",
        phone_number: "+62814567890",
        domicile: "Surabaya, Indonesia",
        news_interest: ["Editorial", "Bisnis", "Teknologi"],
        headline: "Senior Editor Tempo",
        biography:
          "Editor senior yang mengawasi kualitas konten dan editorial di Tempo.",
        avatar: "/images/avatars/jennifer.jpg",
      },
      {
        user_id: userIds[8],
        full_name: "Michael Johnson",
        gender: "male",
        phone_number: "+62815678901",
        domicile: "Bandung, Indonesia",
        news_interest: ["Kesehatan", "Teknologi", "Sains"],
        headline: "Health & Science Reporter",
        biography: "Meliput berita kesehatan dan perkembangan sains terkini.",
        avatar: "/images/avatars/michael.jpg",
      },
      {
        user_id: userIds[9],
        full_name: "Regular User",
        gender: "other",
        phone_number: "+62816789012",
        domicile: "Yogyakarta, Indonesia",
        news_interest: ["Teknologi", "Pendidikan", "Hiburan"],
        headline: "Tech Enthusiast",
        biography:
          "Menyukai teknologi dan selalu mengikuti perkembangan terbaru.",
        avatar: "/images/avatars/user.jpg",
      },
    ];

    for (const profileData of profilesData) {
      await pool.query(
        `INSERT INTO profile (user_id, full_name, gender, phone_number, domicile, news_interest, headline, biography, avatar, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
        [
          profileData.user_id,
          profileData.full_name,
          profileData.gender,
          profileData.phone_number,
          profileData.domicile,
          profileData.news_interest,
          profileData.headline,
          profileData.biography,
          profileData.avatar,
        ]
      );
      console.log(`  ✓ Created profile: ${profileData.full_name}`);
    }

    console.log(`✅ ${profilesData.length} profiles created`);

    // 3. Ensure Required Categories Exist
    console.log("📂 Ensuring required categories exist...");
    const requiredCategories = [
      {
        name: "Teknologi",
        description: "Berita teknologi terkini dan inovasi digital",
      },
      { name: "Politik", description: "Berita politik dan pemerintahan" },
      { name: "Olahraga", description: "Berita olahraga dan kompetisi" },
      {
        name: "Kesehatan",
        description: "Informasi kesehatan dan gaya hidup sehat",
      },
      { name: "Bisnis", description: "Berita ekonomi dan bisnis" },
      { name: "Hiburan", description: "Berita hiburan dan kompetisi" },
      {
        name: "Pendidikan",
        description: "Informasi dunia pendidikan dan pembelajaran",
      },
      {
        name: "AI",
        description:
          "Artikel seputar kecerdasan buatan, machine learning, dan penerapannya dalam berbagai bidang",
      },
      { name: "Ekonomi", description: "Berita ekonomi dan bisnis" },
      {
        name: "Gadget",
        description:
          "Review dan berita terkini tentang gadget, smartphone, dan perangkat elektronik lainnya",
      },
    ];

    // Get existing categories
    const existingCategoriesResult = await pool.query(
      "SELECT id, name FROM categories ORDER BY id"
    );
    const existingCategoryNames = existingCategoriesResult.rows.map(
      (cat) => cat.name
    );

    // Insert missing categories
    for (const categoryData of requiredCategories) {
      if (!existingCategoryNames.includes(categoryData.name)) {
        const categorySlug = generateSlug(categoryData.name);
        await pool.query(
          "INSERT INTO categories (name, slug, description, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())",
          [categoryData.name, categorySlug, categoryData.description]
        );
        console.log(
          `  ✓ Created category: ${categoryData.name} (${categorySlug})`
        );
      }
    }

    // Get all categories after insertion
    const categoriesResult = await pool.query(
      "SELECT id, name FROM categories ORDER BY id"
    );
    const categoryIds = {};
    categoriesResult.rows.forEach((cat) => {
      categoryIds[cat.name] = cat.id;
    });

    console.log(
      `✅ Total ${categoriesResult.rows.length} categories available`
    );

    // 4. Seed News (10 news articles)
    console.log("📰 Seeding news...");
    const newsData = [
      {
        title:
          "Google Gratiskan Gemini Advanced untuk Pelajar, Tapi Cuma di AS",
        content: `
          <h2>Google Umumkan Program Akses Gratis Gemini Advanced</h2>
          <p>Google mengumumkan bahwa mereka akan memberikan akses gratis ke <strong>Gemini Advanced</strong> untuk para pelajar di Amerika Serikat. Program ini merupakan bagian dari inisiatif perusahaan untuk mendukung pendidikan dan teknologi AI.</p>
          
          <h3>Detail Program</h3>
          <p>Pelajar yang memenuhi syarat akan mendapatkan:</p>
          <ul>
            <li>Akses penuh ke Gemini Advanced selama masa studi</li>
            <li>Dukungan teknis khusus untuk proyek akademik</li>
            <li>Workshop gratis tentang penggunaan AI dalam pendidikan</li>
            <li>Integrasi dengan Google Workspace for Education</li>
          </ul>
          
          <blockquote>
            <p>"Kami percaya bahwa teknologi AI harus dapat diakses oleh semua kalangan, terutama generasi muda yang akan membentuk masa depan," kata Sundar Pichai, CEO Google dalam konferensi pers.</p>
          </blockquote>
          
          <h3>Syarat dan Ketentuan</h3>
          <p>Program ini terbatas untuk:</p>
          <ol>
            <li>Mahasiswa aktif di universitas terakreditasi AS</li>
            <li>Pelajar SMA yang terdaftar dalam program STEM</li>
            <li>Peserta program coding bootcamp yang diakui</li>
          </ol>
          
          <p>Pendaftaran dibuka mulai bulan depan melalui platform resmi Google for Education. Program ini diharapkan dapat meningkatkan literasi AI di kalangan pelajar dan mempersiapkan mereka untuk masa depan yang semakin digital.</p>
        `,
        category_name: "Teknologi",
        featured_image: "/images/news/gemini-advanced-students.jpg",
        status: "published",
        created_by: userIds[1], // Alexandra Alper
        authors: [
          { name: "Alexandra Alper", location: "Washington" },
          { name: "David Shepardson", location: "Washington" },
        ],
        tags: ["Google", "Gemini", "AI", "Pendidikan", "Teknologi", "AS"],
      },
      {
        title: "Meta Rilis Fitur AI Baru untuk Instagram dan WhatsApp",
        content: `
          <h2>Meta Perkenalkan Asisten AI Terbaru</h2>
          <p>Meta mengumumkan peluncuran fitur-fitur AI baru yang akan diintegrasikan ke dalam platform <strong>Instagram</strong> dan <strong>WhatsApp</strong>. Fitur ini dirancang untuk meningkatkan pengalaman pengguna dalam berinteraksi dan berbagi konten.</p>
          
          <h3>Fitur-Fitur Baru</h3>
          <ul>
            <li><strong>AI Creative Assistant</strong>: Membantu pengguna membuat konten visual yang menarik</li>
            <li><strong>Smart Reply</strong>: Saran balasan otomatis yang kontekstual</li>
            <li><strong>Content Moderation AI</strong>: Deteksi otomatis konten yang melanggar kebijakan</li>
            <li><strong>Translation AI</strong>: Terjemahan real-time untuk 50+ bahasa</li>
          </ul>
          
          <h3>Keamanan dan Privasi</h3>
          <p>Meta menekankan komitmen mereka terhadap keamanan dan privasi pengguna. Semua pemrosesan AI dilakukan dengan enkripsi end-to-end dan data pribadi tidak akan digunakan untuk pelatihan model.</p>
        `,
        category_name: "Teknologi",
        featured_image: "/images/news/meta-ai-features.jpg",
        status: "published",
        created_by: userIds[5], // Sarah Mitchell
        authors: [
          { name: "Sarah Mitchell", location: "San Francisco" },
          { name: "Ahmad Rahman", location: "Jakarta" },
        ],
        tags: ["Meta", "Instagram", "WhatsApp", "AI", "Social Media"],
      },
      {
        title: "Pemerintah Umumkan Kebijakan Baru Sektor Energi Terbarukan",
        content: `
          <h2>Kebijakan Energi Terbarukan 2025</h2>
          <p>Pemerintah Indonesia resmi mengumumkan kebijakan baru untuk mempercepat transisi ke energi terbarukan. Kebijakan ini menargetkan 23% kontribusi energi terbarukan dalam bauran energi nasional pada tahun 2025.</p>
          
          <h3>Poin-Poin Utama Kebijakan</h3>
          <ul>
            <li>Insentif pajak untuk investasi energi surya dan angin</li>
            <li>Subsidi untuk rumah tangga yang menggunakan panel surya</li>
            <li>Program pelatihan tenaga kerja di sektor energi hijau</li>
            <li>Kerjasama dengan investor asing untuk pembangunan pembangkit listrik terbarukan</li>
          </ul>
        `,
        category_name: "Politik",
        featured_image: "/images/news/renewable-energy-policy.jpg",
        status: "published",
        created_by: userIds[6], // Ahmad Rahman
        authors: [{ name: "Ahmad Rahman", location: "Jakarta" }],
        tags: ["Energi Terbarukan", "Pemerintah", "Kebijakan", "Lingkungan"],
      },
      {
        title: "Timnas Indonesia Lolos ke Final Piala Asia 2025",
        content: `
          <h2>Prestasi Membanggakan Timnas Indonesia</h2>
          <p>Tim Nasional Indonesia berhasil lolos ke final Piala Asia 2025 setelah mengalahkan Jepang dengan skor 2-1 dalam pertandingan semifinal yang dramatis.</p>
        `,
        category_name: "Olahraga",
        featured_image: "/images/news/timnas-semifinal.jpg",
        status: "published",
        created_by: userIds[8], // Michael Johnson
        authors: [{ name: "Michael Johnson", location: "Bandung" }],
        tags: ["Timnas Indonesia", "Piala Asia", "Sepak Bola", "Final"],
      },
      {
        title: "Penemuan Baru dalam Dunia Kedokteran: Terapi Gen untuk Kanker",
        content: `
          <h2>Terobosan Terapi Gen untuk Kanker</h2>
          <p>Tim peneliti dari Universitas Indonesia berhasil mengembangkan terapi gen baru yang menunjukkan hasil menggembirakan dalam pengobatan kanker stadium lanjut.</p>
        `,
        category_name: "Kesehatan",
        featured_image: "/images/news/gene-therapy-cancer.jpg",
        status: "published",
        created_by: userIds[8], // Michael Johnson
        authors: [{ name: "Michael Johnson", location: "Bandung" }],
        tags: ["Kedokteran", "Kanker", "Terapi Gen", "CRISPR", "Penelitian"],
      },
      {
        title: "Startup Indonesia Raih Funding Series A $10 Juta",
        content: `
          <h2>TechnoAI Raih Pendanaan Besar</h2>
          <p>TechnoAI, startup teknologi AI asal Indonesia, berhasil meraih pendanaan Series A sebesar $10 juta dari konsorsium investor regional.</p>
        `,
        category_name: "Bisnis",
        featured_image: "/images/news/startup-funding.jpg",
        status: "published",
        created_by: userIds[6], // Ahmad Rahman
        authors: [{ name: "Ahmad Rahman", location: "Jakarta" }],
        tags: ["Startup", "Funding", "AI", "Indonesia", "Bisnis", "Series A"],
      },
      {
        title: "Festival Musik Internasional di Jakarta Sukses Digelar",
        content: `
          <h2>Jakarta Music Festival 2025</h2>
          <p>Jakarta Music Festival 2025 sukses digelar selama 3 hari di Gelora Bung Karno dengan menghadirkan lebih dari 50 artis internasional dan lokal.</p>
        `,
        category_name: "Hiburan",
        featured_image: "/images/news/music-festival.jpg",
        status: "published",
        created_by: userIds[7], // Jennifer Smith
        authors: [{ name: "Jennifer Smith", location: "Surabaya" }],
        tags: ["Musik", "Festival", "Jakarta", "Hiburan", "Konser"],
      },
      {
        title: "Program Beasiswa Pemerintah untuk Mahasiswa Berprestasi",
        content: `
          <h2>Beasiswa Indonesia Maju 2025</h2>
          <p>Kementerian Pendidikan meluncurkan program Beasiswa Indonesia Maju 2025 yang menyediakan 10,000 slot beasiswa untuk mahasiswa berprestasi.</p>
        `,
        category_name: "Pendidikan",
        featured_image: "/images/news/scholarship-program.jpg",
        status: "published",
        created_by: userIds[2], // David Shepardson
        authors: [{ name: "David Shepardson", location: "Washington" }],
        tags: ["Beasiswa", "Pendidikan", "Mahasiswa", "Pemerintah"],
      },
      {
        title: "Terobosan Baru dalam Teknologi Quantum Computing",
        content: `
          <h2>Komputer Kuantum Generasi Baru</h2>
          <p>Para peneliti dari MIT berhasil mengembangkan prosesor kuantum dengan 1000 qubit yang stabil, menandai kemajuan signifikan dalam teknologi quantum computing.</p>
        `,
        category_name: "AI",
        featured_image: "/images/news/quantum-computing.jpg",
        status: "published",
        created_by: userIds[3], // Harshita Meenaktshi
        authors: [{ name: "Harshita Meenaktshi", location: "Bengaluru" }],
        tags: ["Quantum Computing", "MIT", "Teknologi", "Research", "Qubit"],
      },
      {
        title:
          "Inovasi Transportasi Hijau: Bus Listrik Mulai Beroperasi di Jakarta",
        content: `
          <h2>Transjakarta Luncurkan Armada Bus Listrik</h2>
          <p>PT Transjakarta resmi mengoperasikan 100 unit bus listrik pada koridor 1 dan 13. Ini merupakan langkah awal menuju transportasi publik yang ramah lingkungan.</p>
        `,
        category_name: "Teknologi",
        featured_image: "/images/news/electric-bus.jpg",
        status: "published",
        created_by: userIds[6], // Ahmad Rahman
        authors: [{ name: "Ahmad Rahman", location: "Jakarta" }],
        tags: [
          "Transportasi",
          "Bus Listrik",
          "Transjakarta",
          "Lingkungan",
          "Jakarta",
        ],
      },
    ];

    const newsIds = [];
    for (let i = 0; i < newsData.length; i++) {
      const news = newsData[i];
      const slug = generateSlug(news.title);
      const hashedId = generateHashedId();
      const excerpt =
        news.content.replace(/<[^>]*>/g, "").substring(0, 200) + "...";

      const categoryId = categoryIds[news.category_name];
      if (!categoryId) {
        console.log(
          `  ⚠️  Category not found: ${news.category_name}, skipping news: ${news.title}`
        );
        continue;
      }

      const result = await pool.query(
        `INSERT INTO news (title, content, excerpt, slug, featured_image, category_id, status, published_at, created_by, hashed_id, view_count, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9, $10, NOW(), NOW()) 
         RETURNING id`,
        [
          news.title,
          news.content,
          excerpt,
          slug,
          news.featured_image,
          categoryId,
          news.status,
          news.created_by,
          hashedId,
          Math.floor(Math.random() * 1000) + 100, // Random view count 100-1100
        ]
      );

      const newsId = result.rows[0].id;
      newsIds.push(newsId);

      // Insert authors
      for (const author of news.authors) {
        await pool.query(
          `INSERT INTO news_authors (news_id, author_name, location, created_at) 
           VALUES ($1, $2, $3, NOW())`,
          [newsId, author.name, author.location]
        );
      }

      // Insert tags
      for (const tag of news.tags) {
        await pool.query(
          `INSERT INTO news_tags (news_id, tag_name, created_at) 
           VALUES ($1, $2, NOW())`,
          [newsId, tag]
        );
      }

      console.log(`  ✓ Created news: ${news.title}`);
    }

    console.log(
      `✅ ${newsIds.length} news articles created with authors and tags`
    );

    console.log("🎉 Fresh database seeding completed successfully!");

    // Print summary
    console.log("\n📊 SEEDING SUMMARY:");
    console.log(`👥 Users: ${userIds.length}`);
    console.log(`👤 Profiles: ${profilesData.length}`);
    console.log(`📂 Categories: ${categoriesResult.rows.length}`);
    console.log(`📰 News: ${newsIds.length}`);
    console.log(
      `✏️ Authors: ${newsData.reduce(
        (sum, news) => sum + news.authors.length,
        0
      )}`
    );
    console.log(
      `🏷️ Tags: ${newsData.reduce((sum, news) => sum + news.tags.length, 0)}`
    );

    return {
      users: userIds.length,
      profiles: profilesData.length,
      categories: categoriesResult.rows.length,
      news: newsIds.length,
    };
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Run seeder if this file is executed directly
if (require.main === module) {
  clearAndSeedDatabase()
    .then(() => {
      console.log("✅ Fresh seeding process completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Fresh seeding process failed:", error);
      process.exit(1);
    });
}

module.exports = { clearAndSeedDatabase };
