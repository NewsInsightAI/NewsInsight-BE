const pool = require("../db");

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

exports.getAllCategories = async (req, res) => {
  try {
    const { search, page = 1, limit = 10, status } = req.query;

    let query = `
      SELECT 
        id, 
        name, 
        description, 
        slug,
        is_active,
        created_at, 
        updated_at,
        CASE 
          WHEN is_active = true THEN 'active'
          ELSE 'inactive'
        END as status,
        (SELECT COUNT(*) FROM news WHERE category_id = categories.id AND status = 'published') as news_count
      FROM categories
      WHERE 1=1
    `;

    const queryParams = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND LOWER(name) LIKE LOWER($${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    if (status) {
      if (status === "active") {
        query += ` AND is_active = true`;
      } else if (status === "inactive") {
        query += ` AND is_active = false`;
      }
    }

    query += ` ORDER BY created_at DESC`;

    const offset = (page - 1) * limit;
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    queryParams.push(limit);

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    queryParams.push(offset);

    const result = await pool.query(query, queryParams);

    let countQuery = `
      SELECT COUNT(*) 
      FROM categories
      WHERE 1=1
    `;

    const countParams = [];
    let countParamCount = 0;

    if (search) {
      countParamCount++;
      countQuery += ` AND (
        LOWER(name) LIKE LOWER($${countParamCount}) OR 
        LOWER(description) LIKE LOWER($${countParamCount})
      )`;
      countParams.push(`%${search}%`);
    }

    if (status) {
      if (status === "active") {
        countQuery += ` AND is_active = true`;
      } else if (status === "inactive") {
        countQuery += ` AND is_active = false`;
      }
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalCategories = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCategories / limit);

    res.json({
      status: "success",
      message: "Daftar kategori berhasil diambil",
      data: result.rows.map((category) => ({
        id: category.id,
        name: category.name,
        description: category.description,
        slug: category.slug,
        status: category.status,
        isActive: category.is_active,
        newsCount: parseInt(category.news_count) || 0,
        createdAt: category.created_at,
        updatedAt: category.updated_at,
      })),
      error: null,
      metadata: {
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCategories,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "error",
      message: "Server error",
      data: null,
      error: { code: "SERVER_ERROR" },
      metadata: null,
    });
  }
};

exports.getCategoryById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT 
        id, 
        name, 
        description, 
        slug,
        is_active,
        created_at, 
        updated_at,
        CASE 
          WHEN is_active = true THEN 'active'
          ELSE 'inactive'
        END as status
      FROM categories 
      WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Kategori tidak ditemukan",
        data: null,
        error: { code: "CATEGORY_NOT_FOUND" },
        metadata: null,
      });
    }

    const category = result.rows[0];

    res.json({
      status: "success",
      message: "Kategori berhasil diambil",
      data: {
        id: category.id,
        name: category.name,
        description: category.description,
        slug: category.slug,
        status: category.status,
        isActive: category.is_active,
        createdAt: category.created_at,
        updatedAt: category.updated_at,
      },
      error: null,
      metadata: null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "error",
      message: "Server error",
      data: null,
      error: { code: "SERVER_ERROR" },
      metadata: null,
    });
  }
};

exports.createCategory = async (req, res) => {
  const { name, description } = req.body;

  if (!name || typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({
      status: "error",
      message: "Nama kategori wajib diisi",
      data: null,
      error: { code: "NAME_REQUIRED" },
      metadata: null,
    });
  }

  if (name.length > 100) {
    return res.status(400).json({
      status: "error",
      message: "Nama kategori tidak boleh lebih dari 100 karakter",
      data: null,
      error: { code: "NAME_TOO_LONG" },
      metadata: null,
    });
  }

  try {
    const existingCategory = await pool.query(
      "SELECT id FROM categories WHERE LOWER(name) = LOWER($1)",
      [name.trim()]
    );

    if (existingCategory.rows.length > 0) {
      return res.status(400).json({
        status: "error",
        message: "Kategori dengan nama ini sudah ada",
        data: null,
        error: { code: "CATEGORY_EXISTS" },
        metadata: null,
      });
    }

    const slug = generateSlug(name.trim());

    const existingSlug = await pool.query(
      "SELECT id FROM categories WHERE slug = $1",
      [slug]
    );

    let finalSlug = slug;
    if (existingSlug.rows.length > 0) {
      let counter = 1;
      do {
        finalSlug = `${slug}-${counter}`;
        const slugCheck = await pool.query(
          "SELECT id FROM categories WHERE slug = $1",
          [finalSlug]
        );
        if (slugCheck.rows.length === 0) break;
        counter++;
      } while (counter < 100);
    }

    const result = await pool.query(
      "INSERT INTO categories (name, description, slug, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *",
      [name.trim(), description?.trim() || null, finalSlug]
    );

    const newCategory = result.rows[0];

    res.status(201).json({
      status: "success",
      message: "Kategori berhasil dibuat",
      data: {
        id: newCategory.id,
        name: newCategory.name,
        description: newCategory.description,
        slug: newCategory.slug,
        status: newCategory.is_active ? "active" : "inactive",
        isActive: newCategory.is_active,
        createdAt: newCategory.created_at,
        updatedAt: newCategory.updated_at,
      },
      error: null,
      metadata: null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "error",
      message: "Server error",
      data: null,
      error: { code: "SERVER_ERROR" },
      metadata: null,
    });
  }
};

exports.updateCategory = async (req, res) => {
  const { id } = req.params;
  const { name, description, isActive } = req.body;

  if (!name || typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({
      status: "error",
      message: "Nama kategori wajib diisi",
      data: null,
      error: { code: "NAME_REQUIRED" },
      metadata: null,
    });
  }

  if (name.length > 100) {
    return res.status(400).json({
      status: "error",
      message: "Nama kategori tidak boleh lebih dari 100 karakter",
      data: null,
      error: { code: "NAME_TOO_LONG" },
      metadata: null,
    });
  }

  try {
    const existingCategory = await pool.query(
      "SELECT * FROM categories WHERE id = $1",
      [id]
    );

    if (existingCategory.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Kategori tidak ditemukan",
        data: null,
        error: { code: "CATEGORY_NOT_FOUND" },
        metadata: null,
      });
    }

    const nameCheck = await pool.query(
      "SELECT id FROM categories WHERE LOWER(name) = LOWER($1) AND id != $2",
      [name.trim(), id]
    );

    if (nameCheck.rows.length > 0) {
      return res.status(400).json({
        status: "error",
        message: "Kategori dengan nama ini sudah ada",
        data: null,
        error: { code: "CATEGORY_EXISTS" },
        metadata: null,
      });
    }

    let newSlug = existingCategory.rows[0].slug;
    if (
      name.trim().toLowerCase() !== existingCategory.rows[0].name.toLowerCase()
    ) {
      newSlug = generateSlug(name.trim());

      const slugCheck = await pool.query(
        "SELECT id FROM categories WHERE slug = $1 AND id != $2",
        [newSlug, id]
      );

      if (slugCheck.rows.length > 0) {
        let counter = 1;
        do {
          newSlug = `${generateSlug(name.trim())}-${counter}`;
          const slugCheck2 = await pool.query(
            "SELECT id FROM categories WHERE slug = $1 AND id != $2",
            [newSlug, id]
          );
          if (slugCheck2.rows.length === 0) break;
          counter++;
        } while (counter < 100);
      }
    }

    const result = await pool.query(
      "UPDATE categories SET name = $1, description = $2, slug = $3, is_active = $4, updated_at = NOW() WHERE id = $5 RETURNING *",
      [
        name.trim(),
        description?.trim() || null,
        newSlug,
        isActive !== undefined ? isActive : true,
        id,
      ]
    );

    const updatedCategory = result.rows[0];

    res.json({
      status: "success",
      message: "Kategori berhasil diperbarui",
      data: {
        id: updatedCategory.id,
        name: updatedCategory.name,
        description: updatedCategory.description,
        slug: updatedCategory.slug,
        status: updatedCategory.is_active ? "active" : "inactive",
        isActive: updatedCategory.is_active,
        createdAt: updatedCategory.created_at,
        updatedAt: updatedCategory.updated_at,
      },
      error: null,
      metadata: null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "error",
      message: "Server error",
      data: null,
      error: { code: "SERVER_ERROR" },
      metadata: null,
    });
  }
};

exports.deleteCategory = async (req, res) => {
  const { id } = req.params;

  try {
    const existingCategory = await pool.query(
      "SELECT * FROM categories WHERE id = $1",
      [id]
    );

    if (existingCategory.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Kategori tidak ditemukan",
        data: null,
        error: { code: "CATEGORY_NOT_FOUND" },
        metadata: null,
      });
    }

    await pool.query("DELETE FROM categories WHERE id = $1", [id]);

    res.json({
      status: "success",
      message: "Kategori berhasil dihapus",
      data: null,
      error: null,
      metadata: null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "error",
      message: "Server error",
      data: null,
      error: { code: "SERVER_ERROR" },
      metadata: null,
    });
  }
};

exports.bulkDeleteCategories = async (req, res) => {
  const { categoryIds } = req.body;

  if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
    return res.status(400).json({
      status: "error",
      message: "ID kategori wajib diisi",
      data: null,
      error: { code: "CATEGORY_IDS_REQUIRED" },
      metadata: null,
    });
  }

  try {
    const existingCategories = await pool.query(
      "SELECT id FROM categories WHERE id = ANY($1)",
      [categoryIds]
    );

    if (existingCategories.rows.length !== categoryIds.length) {
      return res.status(404).json({
        status: "error",
        message: "Beberapa kategori tidak ditemukan",
        data: null,
        error: { code: "CATEGORIES_NOT_FOUND" },
        metadata: null,
      });
    }

    await pool.query("DELETE FROM categories WHERE id = ANY($1)", [
      categoryIds,
    ]);

    res.json({
      status: "success",
      message: `${categoryIds.length} kategori berhasil dihapus`,
      data: { deletedCount: categoryIds.length },
      error: null,
      metadata: null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "error",
      message: "Server error",
      data: null,
      error: { code: "SERVER_ERROR" },
      metadata: null,
    });
  }
};

exports.getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({
        status: "error",
        message: "Slug kategori wajib diisi",
        data: null,
        error: { code: "SLUG_REQUIRED" },
        metadata: null,
      });
    }

    const query = `
      SELECT 
        id,
        name,
        description,
        slug,
        is_active,
        created_at,
        updated_at,
        (SELECT COUNT(*) FROM news WHERE category_id = categories.id AND status = 'published') as news_count
      FROM categories 
      WHERE slug = $1 AND is_active = true
    `;

    const result = await pool.query(query, [slug]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Kategori tidak ditemukan",
        data: null,
        error: { code: "CATEGORY_NOT_FOUND" },
        metadata: null,
      });
    }

    const category = result.rows[0];

    res.json({
      status: "success",
      message: "Kategori berhasil diambil",
      data: category,
      error: null,
      metadata: {
        slug: slug,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("Error fetching category by slug:", err);
    res.status(500).json({
      status: "error",
      message: "Server error",
      data: null,
      error: {
        code: "SERVER_ERROR",
        details: err.message,
      },
      metadata: null,
    });
  }
};
