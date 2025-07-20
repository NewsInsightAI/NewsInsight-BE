const { GoogleGenAI } = require("@google/genai");
const pool = require("../db");

// Initialize Gemini AI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Helper function to strip HTML tags
const stripHtml = (html) => {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

// Generate news summary using Gemini AI
exports.generateSummary = async (req, res) => {
  try {
    const { newsId } = req.params;
    console.log("generateSummary called for news ID:", newsId);

    // Get news content from database
    const newsResult = await pool.query(
      "SELECT id, title, content FROM news WHERE id = $1 AND status = 'published'",
      [newsId]
    );

    console.log(
      "News query result:",
      newsResult.rows.length > 0 ? "Found" : "Not found"
    );

    if (newsResult.rows.length === 0) {
      console.log("News not found with ID:", newsId);
      return res.status(404).json({
        success: false,
        message: "Berita tidak ditemukan",
      });
    }

    const news = newsResult.rows[0];

    // Check if summary already exists
    const existingSummary = await pool.query(
      "SELECT * FROM news_summaries WHERE news_id = $1",
      [newsId]
    );

    // If summary already exists, return it
    if (existingSummary.rows.length > 0) {
      const summaryData = existingSummary.rows[0];
      return res.status(200).json({
        success: true,
        data: {
          id: summaryData.id,
          newsId: parseInt(summaryData.news_id),
          summaryText: summaryData.summary_text,
          createdAt: summaryData.created_at,
          updatedAt: summaryData.updated_at,
        },
        message: "Ringkasan sudah ada",
      });
    }

    const plainTextContent = stripHtml(news.content);

    // Create prompt for Gemini
    const prompt = `
Buatlah ringkasan berita yang SINGKAT dan PADAT dari artikel berita berikut ini.

Judul: ${news.title}

Konten:
${plainTextContent}

Instruksi:
1. Ringkasan MAKSIMAL 3-4 kalimat (50-80 kata)
2. Fokus HANYA pada informasi paling penting
3. Gunakan bahasa Indonesia yang jelas dan mudah dipahami
4. Jawab pertanyaan utama: APA yang terjadi, SIAPA yang terlibat, dan MENGAPA penting
5. Jangan gunakan format bullet points atau numbering
6. Langsung ke inti tanpa kalimat pembuka seperti "Berita ini membahas..."

Ringkasan singkat:`;

    // Generate summary using Gemini
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt,
    });

    const summaryText = response.text
      .replace(/^\s*Ringkasan:\s*/i, "") // Remove "Ringkasan:" if present
      .trim();

    // Create new summary (we already checked it doesn't exist)
    const insertResult = await pool.query(
      "INSERT INTO news_summaries (news_id, summary_text) VALUES ($1, $2) RETURNING *",
      [newsId, summaryText]
    );
    const summaryData = insertResult.rows[0];

    res.status(200).json({
      success: true,
      data: {
        id: summaryData.id,
        newsId: parseInt(summaryData.news_id),
        summaryText: summaryData.summary_text,
        createdAt: summaryData.created_at,
        updatedAt: summaryData.updated_at,
      },
      message: "Ringkasan berhasil dibuat",
    });
  } catch (error) {
    console.error("Error generating summary:", error);
    res.status(500).json({
      success: false,
      message: "Gagal membuat ringkasan berita",
      error: error.message,
    });
  }
};

// Get existing summary
exports.getSummary = async (req, res) => {
  try {
    const { newsId } = req.params;
    console.log("getSummary called for news ID:", newsId);

    // For testing - skip news validation temporarily
    const summaryResult = await pool.query(
      "SELECT * FROM news_summaries WHERE news_id = $1",
      [newsId]
    );

    console.log(
      "Summary query result:",
      summaryResult.rows.length > 0 ? "Found" : "Not found"
    );
    console.log("Summary rows:", summaryResult.rows);

    if (summaryResult.rows.length === 0) {
      console.log("Summary not found for news ID:", newsId);
      return res.status(404).json({
        success: false,
        message: "Ringkasan tidak ditemukan",
      });
    }

    const summaryData = summaryResult.rows[0];

    res.status(200).json({
      success: true,
      data: {
        id: summaryData.id,
        newsId: parseInt(summaryData.news_id),
        summaryText: summaryData.summary_text,
        createdAt: summaryData.created_at,
        updatedAt: summaryData.updated_at,
      },
    });
  } catch (error) {
    console.error("Error getting summary:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil ringkasan berita",
      error: error.message,
    });
  }
};
