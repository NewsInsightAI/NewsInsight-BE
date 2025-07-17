const pool = require("../db");
const crypto = require("crypto");

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateHashedId() {
  return crypto.randomBytes(16).toString("hex");
}

function extractExcerpt(content, maxLength = 200) {
  const plainText = content.replace(/<[^>]*>/g, "");
  if (plainText.length <= maxLength) {
    return plainText;
  }
  return plainText.substring(0, maxLength).trim() + "...";
}

exports.getAllNews = async (req, res) => {
  try {
    const {
      search,
      page = 1,
      limit = 10,
      status,
      category,
      author,
      sortBy = "created_at",
      sortOrder = "DESC",
    } = req.query;

    let query = `
      SELECT 
        n.id,
        n.title,
        n.excerpt,
        n.slug,
        n.featured_image,
        n.status,
        n.published_at,
        n.created_at,
        n.updated_at,
        n.view_count,
        n.hashed_id,
        c.name as category_name,
        c.slug as category_slug,
        u.email as created_by_email,
        p.full_name as created_by_name,
        COUNT(*) OVER() as total_count
      FROM news n
      LEFT JOIN categories c ON n.category_id = c.id
      LEFT JOIN users u ON n.created_by = u.id
      LEFT JOIN profile p ON u.id = p.user_id
      WHERE 1=1
    `;

    const queryParams = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND (
        LOWER(n.title) LIKE LOWER($${paramCount}) OR 
        LOWER(n.content) LIKE LOWER($${paramCount}) OR
        LOWER(n.excerpt) LIKE LOWER($${paramCount})
      )`;
      queryParams.push(`%${search}%`);
    }

    if (status) {
      paramCount++;
      query += ` AND n.status = $${paramCount}`;
      queryParams.push(status);
    }

    if (category) {
      paramCount++;
      query += ` AND c.slug = $${paramCount}`;
      queryParams.push(category);
    }

    if (author) {
      paramCount++;
      query += ` AND EXISTS (
        SELECT 1 FROM news_authors na 
        WHERE na.news_id = n.id 
        AND LOWER(na.author_name) LIKE LOWER($${paramCount})
      )`;
      queryParams.push(`%${author}%`);
    }

    const allowedSortFields = [
      "created_at",
      "updated_at",
      "published_at",
      "title",
      "view_count",
    ];
    const allowedSortOrders = ["ASC", "DESC"];

    const finalSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : "created_at";
    const finalSortOrder = allowedSortOrders.includes(sortOrder.toUpperCase())
      ? sortOrder.toUpperCase()
      : "DESC";

    query += ` ORDER BY n.${finalSortBy} ${finalSortOrder}`;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    paramCount++;
    query += ` LIMIT $${paramCount}`;
    queryParams.push(limitNum);

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    queryParams.push(offset);

    const result = await pool.query(query, queryParams);

    for (let newsItem of result.rows) {
      const authorsResult = await pool.query(
        "SELECT author_name, location FROM news_authors WHERE news_id = $1 ORDER BY id",
        [newsItem.id]
      );
      newsItem.authors = authorsResult.rows;

      const tagsResult = await pool.query(
        "SELECT tag_name FROM news_tags WHERE news_id = $1 ORDER BY id",
        [newsItem.id]
      );
      newsItem.tags = tagsResult.rows.map((row) => row.tag_name);
    }

    const totalCount =
      result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    const totalPages = Math.ceil(totalCount / limitNum);

    res.status(200).json({
      success: true,
      data: {
        news: result.rows,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          hasNextPage: pageNum < totalPages,
          hasPreviousPage: pageNum > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching news:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getNewsById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const query = `
      SELECT 
        n.*,
        c.name as category_name,
        c.slug as category_slug,
        u.email as created_by_email,
        p.full_name as created_by_name
      FROM news n
      LEFT JOIN categories c ON n.category_id = c.id
      LEFT JOIN users u ON n.created_by = u.id
      LEFT JOIN profile p ON u.id = p.user_id
      WHERE n.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "News not found",
      });
    }

    const newsItem = result.rows[0];

    if (req.user.role !== "admin" && newsItem.created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to view this news",
      });
    }

    const authorsResult = await pool.query(
      "SELECT author_name, location FROM news_authors WHERE news_id = $1 ORDER BY id",
      [newsItem.id]
    );
    newsItem.authors = authorsResult.rows;

    const tagsResult = await pool.query(
      "SELECT tag_name FROM news_tags WHERE news_id = $1 ORDER BY id",
      [newsItem.id]
    );
    newsItem.tags = tagsResult.rows.map((row) => row.tag_name);

    res.status(200).json({
      success: true,
      data: newsItem,
    });
  } catch (error) {
    console.error("Error fetching news by ID:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getNewsByHashedIdAndSlug = async (req, res) => {
  try {
    const { hashedId, slug } = req.params;

    const query = `
      SELECT 
        n.*,
        c.name as category_name,
        c.slug as category_slug,
        u.email as created_by_email,
        p.full_name as created_by_name
      FROM news n
      LEFT JOIN categories c ON n.category_id = c.id
      LEFT JOIN users u ON n.created_by = u.id
      LEFT JOIN profile p ON u.id = p.user_id
      WHERE n.hashed_id = $1 AND n.slug = $2
    `;

    const result = await pool.query(query, [hashedId, slug]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "News not found",
      });
    }

    const newsItem = result.rows[0];

    const authorsResult = await pool.query(
      "SELECT author_name, location FROM news_authors WHERE news_id = $1 ORDER BY id",
      [newsItem.id]
    );
    newsItem.authors = authorsResult.rows;

    const tagsResult = await pool.query(
      "SELECT tag_name FROM news_tags WHERE news_id = $1 ORDER BY id",
      [newsItem.id]
    );
    newsItem.tags = tagsResult.rows.map((row) => row.tag_name);

    await pool.query(
      "UPDATE news SET view_count = view_count + 1 WHERE id = $1",
      [newsItem.id]
    );

    res.status(200).json({
      success: true,
      data: newsItem,
    });
  } catch (error) {
    console.error("Error fetching news:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.createNews = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      title,
      content,
      categoryId,
      featuredImage,
      status = "draft",
      authors = [],
      tags = [],
    } = req.body;

    const userId = req.user.id;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "Title and content are required",
      });
    }

    const baseSlug = generateSlug(title);
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existingSlug = await client.query(
        "SELECT id FROM news WHERE slug = $1",
        [slug]
      );

      if (existingSlug.rows.length === 0) break;

      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const hashedId = generateHashedId();
    const excerpt = extractExcerpt(content);

    const publishedAt = status === "published" ? new Date() : null;

    const newsResult = await client.query(
      `
      INSERT INTO news (
        title, content, excerpt, slug, featured_image, 
        category_id, status, published_at, created_by, hashed_id
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `,
      [
        title,
        content,
        excerpt,
        slug,
        featuredImage,
        categoryId,
        status,
        publishedAt,
        userId,
        hashedId,
      ]
    );

    const newsId = newsResult.rows[0].id;

    if (authors && authors.length > 0) {
      for (const author of authors) {
        if (author.name && author.name.trim()) {
          await client.query(
            "INSERT INTO news_authors (news_id, author_name, location) VALUES ($1, $2, $3)",
            [newsId, author.name.trim(), author.location || null]
          );
        }
      }
    }

    if (tags && tags.length > 0) {
      for (const tag of tags) {
        if (tag && tag.trim()) {
          await client.query(
            "INSERT INTO news_tags (news_id, tag_name) VALUES ($1, $2)",
            [newsId, tag.trim()]
          );
        }
      }
    }

    await client.query("COMMIT");

    const completeNews = await pool.query(
      `
      SELECT 
        n.*,
        c.name as category_name,
        c.slug as category_slug
      FROM news n
      LEFT JOIN categories c ON n.category_id = c.id
      WHERE n.id = $1
    `,
      [newsId]
    );

    const newsItem = completeNews.rows[0];

    const authorsResult = await pool.query(
      "SELECT author_name, location FROM news_authors WHERE news_id = $1 ORDER BY id",
      [newsId]
    );
    newsItem.authors = authorsResult.rows;

    const tagsResult = await pool.query(
      "SELECT tag_name FROM news_tags WHERE news_id = $1 ORDER BY id",
      [newsId]
    );
    newsItem.tags = tagsResult.rows.map((row) => row.tag_name);

    res.status(201).json({
      success: true,
      message: "News created successfully",
      data: newsItem,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating news:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  } finally {
    client.release();
  }
};

exports.updateNews = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { id } = req.params;
    const {
      title,
      content,
      categoryId,
      featuredImage,
      status,
      authors = [],
      tags = [],
    } = req.body;

    const userId = req.user.id;

    const existingNews = await client.query(
      "SELECT * FROM news WHERE id = $1",
      [id]
    );

    if (existingNews.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "News not found",
      });
    }

    if (
      req.user.role !== "admin" &&
      existingNews.rows[0].created_by !== userId
    ) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to update this news",
      });
    }

    let slug = existingNews.rows[0].slug;
    if (title && title !== existingNews.rows[0].title) {
      const baseSlug = generateSlug(title);
      slug = baseSlug;
      let counter = 1;

      while (true) {
        const existingSlug = await client.query(
          "SELECT id FROM news WHERE slug = $1 AND id != $2",
          [slug, id]
        );

        if (existingSlug.rows.length === 0) break;

        slug = `${baseSlug}-${counter}`;
        counter++;
      }
    }

    const excerpt = content
      ? extractExcerpt(content)
      : existingNews.rows[0].excerpt;

    let publishedAt = existingNews.rows[0].published_at;
    if (status === "published" && !publishedAt) {
      publishedAt = new Date();
    }

    const updateResult = await client.query(
      `
      UPDATE news SET 
        title = COALESCE($1, title),
        content = COALESCE($2, content),
        excerpt = $3,
        slug = $4,
        featured_image = COALESCE($5, featured_image),
        category_id = COALESCE($6, category_id),
        status = COALESCE($7, status),
        published_at = $8
      WHERE id = $9
      RETURNING *
    `,
      [
        title,
        content,
        excerpt,
        slug,
        featuredImage,
        categoryId,
        status,
        publishedAt,
        id,
      ]
    );

    await client.query("DELETE FROM news_authors WHERE news_id = $1", [id]);
    await client.query("DELETE FROM news_tags WHERE news_id = $1", [id]);

    if (authors && authors.length > 0) {
      for (const author of authors) {
        if (author.name && author.name.trim()) {
          await client.query(
            "INSERT INTO news_authors (news_id, author_name, location) VALUES ($1, $2, $3)",
            [id, author.name.trim(), author.location || null]
          );
        }
      }
    }

    if (tags && tags.length > 0) {
      for (const tag of tags) {
        if (tag && tag.trim()) {
          await client.query(
            "INSERT INTO news_tags (news_id, tag_name) VALUES ($1, $2)",
            [id, tag.trim()]
          );
        }
      }
    }

    await client.query("COMMIT");

    const completeNews = await pool.query(
      `
      SELECT 
        n.*,
        c.name as category_name,
        c.slug as category_slug
      FROM news n
      LEFT JOIN categories c ON n.category_id = c.id
      WHERE n.id = $1
    `,
      [id]
    );

    const newsItem = completeNews.rows[0];

    const authorsResult = await pool.query(
      "SELECT author_name, location FROM news_authors WHERE news_id = $1 ORDER BY id",
      [id]
    );
    newsItem.authors = authorsResult.rows;

    const tagsResult = await pool.query(
      "SELECT tag_name FROM news_tags WHERE news_id = $1 ORDER BY id",
      [id]
    );
    newsItem.tags = tagsResult.rows.map((row) => row.tag_name);

    res.status(200).json({
      success: true,
      message: "News updated successfully",
      data: newsItem,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating news:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  } finally {
    client.release();
  }
};

exports.deleteNews = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const existingNews = await pool.query("SELECT * FROM news WHERE id = $1", [
      id,
    ]);

    if (existingNews.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "News not found",
      });
    }

    if (
      req.user.role !== "admin" &&
      existingNews.rows[0].created_by !== userId
    ) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete this news",
      });
    }

    await pool.query("DELETE FROM news WHERE id = $1", [id]);

    res.status(200).json({
      success: true,
      message: "News deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting news:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getNewsByCategory = async (req, res) => {
  try {
    const { categorySlug } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const query = `
      SELECT 
        n.id,
        n.title,
        n.excerpt,
        n.slug,
        n.featured_image,
        n.published_at,
        n.view_count,
        n.hashed_id,
        c.name as category_name,
        c.slug as category_slug,
        COUNT(*) OVER() as total_count
      FROM news n
      INNER JOIN categories c ON n.category_id = c.id
      WHERE c.slug = $1 AND n.status = 'published'
      ORDER BY n.published_at DESC
      LIMIT $2 OFFSET $3
    `;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const result = await pool.query(query, [categorySlug, limitNum, offset]);

    for (let newsItem of result.rows) {
      const authorsResult = await pool.query(
        "SELECT author_name, location FROM news_authors WHERE news_id = $1 ORDER BY id",
        [newsItem.id]
      );
      newsItem.authors = authorsResult.rows;

      const tagsResult = await pool.query(
        "SELECT tag_name FROM news_tags WHERE news_id = $1 ORDER BY id",
        [newsItem.id]
      );
      newsItem.tags = tagsResult.rows.map((row) => row.tag_name);
    }

    const totalCount =
      result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    const totalPages = Math.ceil(totalCount / limitNum);

    res.status(200).json({
      success: true,
      data: {
        news: result.rows,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          hasNextPage: pageNum < totalPages,
          hasPreviousPage: pageNum > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching news by category:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.bulkDeleteNews = async (req, res) => {
  try {
    const { newsIds } = req.body;
    const userId = req.user.id;

    if (!newsIds || !Array.isArray(newsIds) || newsIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "News IDs array is required",
      });
    }

    if (req.user.role !== "admin") {
      const userNewsCheck = await pool.query(
        "SELECT id FROM news WHERE id = ANY($1) AND created_by = $2",
        [newsIds, userId]
      );

      if (userNewsCheck.rows.length !== newsIds.length) {
        return res.status(403).json({
          success: false,
          message:
            "You don't have permission to delete some of these news items",
        });
      }
    }

    const result = await pool.query("DELETE FROM news WHERE id = ANY($1)", [
      newsIds,
    ]);

    res.status(200).json({
      success: true,
      message: `${result.rowCount} news items deleted successfully`,
    });
  } catch (error) {
    console.error("Error bulk deleting news:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get news by category (public endpoint)
exports.getNewsByCategory = async (req, res) => {
  try {
    const { categorySlug } = req.params;
    const {
      page = 1,
      limit = 12,
      sortBy = "published_at",
      sortOrder = "DESC",
    } = req.query;

    let query = `
      SELECT 
        n.id,
        n.title,
        n.content,
        n.excerpt,
        n.slug,
        n.featured_image,
        n.status,
        n.published_at,
        n.created_at,
        n.updated_at,
        n.view_count,
        n.hashed_id,
        c.name as category_name,
        c.slug as category_slug,
        u.email as created_by_email,
        p.full_name as created_by_name,
        COUNT(*) OVER() as total_count
      FROM news n
      LEFT JOIN categories c ON n.category_id = c.id
      LEFT JOIN users u ON n.created_by = u.id
      LEFT JOIN profile p ON u.id = p.user_id
      WHERE c.slug = $1 AND n.status = 'published'
    `;

    const queryParams = [categorySlug];

    const allowedSortFields = [
      "created_at",
      "updated_at", 
      "published_at",
      "title",
      "view_count",
    ];
    const allowedSortOrders = ["ASC", "DESC"];

    const finalSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : "published_at";
    const finalSortOrder = allowedSortOrders.includes(sortOrder.toUpperCase())
      ? sortOrder.toUpperCase()
      : "DESC";

    query += ` ORDER BY n.${finalSortBy} ${finalSortOrder}`;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    query += ` LIMIT $2 OFFSET $3`;
    queryParams.push(limitNum, offset);

    const result = await pool.query(query, queryParams);

    // Add authors and tags for each news item
    for (let newsItem of result.rows) {
      const authorsResult = await pool.query(
        "SELECT author_name, location FROM news_authors WHERE news_id = $1 ORDER BY id",
        [newsItem.id]
      );
      newsItem.authors = authorsResult.rows;

      const tagsResult = await pool.query(
        "SELECT tag_name FROM news_tags WHERE news_id = $1 ORDER BY id",
        [newsItem.id]
      );
      newsItem.tags = tagsResult.rows.map((row) => row.tag_name);
    }

    const totalCount =
      result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    const totalPages = Math.ceil(totalCount / limitNum);

    res.status(200).json({
      success: true,
      data: {
        news: result.rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalCount,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPreviousPage: pageNum > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching news by category:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
