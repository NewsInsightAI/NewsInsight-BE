const pool = require("../db");

exports.getAllComments = async (req, res) => {
  try {
    const {
      search,
      page = 1,
      limit = 10,
      status,
      newsId,
      sortBy = "created_at",
      sortOrder = "DESC",
    } = req.query;

    let query = `
      SELECT 
        c.id,
        c.news_id,
        c.reader_name,
        c.reader_email,
        c.content,
        c.status,
        c.moderation_result,
        c.moderation_score,
        c.created_at,
        c.updated_at,
        c.published_at,
        n.title as news_title,
        COUNT(*) OVER() as total_count
      FROM comments c
      LEFT JOIN news n ON c.news_id = n.id
      WHERE 1=1
    `;

    const queryParams = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND (
        LOWER(c.reader_name) LIKE LOWER($${paramCount}) OR 
        LOWER(c.content) LIKE LOWER($${paramCount}) OR
        LOWER(n.title) LIKE LOWER($${paramCount})
      )`;
      queryParams.push(`%${search}%`);
    }

    if (status) {
      paramCount++;
      query += ` AND c.status = $${paramCount}`;
      queryParams.push(status);
    }

    if (newsId) {
      paramCount++;
      query += ` AND c.news_id = $${paramCount}`;
      queryParams.push(newsId);
    }

    const allowedSortFields = [
      "created_at",
      "updated_at",
      "published_at",
      "reader_name",
      "status",
      "moderation_score",
    ];
    const allowedSortOrders = ["ASC", "DESC"];

    const finalSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : "created_at";
    const finalSortOrder = allowedSortOrders.includes(sortOrder.toUpperCase())
      ? sortOrder.toUpperCase()
      : "DESC";

    query += ` ORDER BY c.${finalSortBy} ${finalSortOrder}`;

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

    const totalCount =
      result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    const totalPages = Math.ceil(totalCount / limitNum);

    const comments = result.rows.map((row) => {
      const { total_count, ...comment } = row;
      return comment;
    });

    res.json({
      success: true,
      data: {
        comments,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getCommentById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        c.*,
        n.title as news_title
       FROM comments c
       LEFT JOIN news n ON c.news_id = n.id
       WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error fetching comment:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.createComment = async (req, res) => {
  try {
    const {
      news_id,
      reader_name,
      reader_email,
      content,
      status = "waiting",
    } = req.body;

    if (!news_id || !reader_name || !content) {
      return res.status(400).json({
        success: false,
        message: "News ID, reader name, and content are required",
      });
    }

    const newsCheck = await pool.query("SELECT id FROM news WHERE id = $1", [
      news_id,
    ]);
    if (newsCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "News article not found",
      });
    }

    const moderationResult = {
      analyzed: false,
      reason: "Manual review required",
    };
    const moderationScore = 0.5;

    const result = await pool.query(
      `INSERT INTO comments (
        news_id, reader_name, reader_email, content, status, 
        moderation_result, moderation_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING *`,
      [
        news_id,
        reader_name,
        reader_email,
        content,
        status,
        moderationResult,
        moderationScore,
      ]
    );

    const commentWithNews = await pool.query(
      `SELECT 
        c.*,
        n.title as news_title
       FROM comments c
       LEFT JOIN news n ON c.news_id = n.id
       WHERE c.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json({
      success: true,
      message: "Comment created successfully",
      data: commentWithNews.rows[0],
    });
  } catch (error) {
    console.error("Error creating comment:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      reader_name,
      reader_email,
      content,
      status,
      moderation_result,
      moderation_score,
    } = req.body;

    const existingComment = await pool.query(
      "SELECT * FROM comments WHERE id = $1",
      [id]
    );
    if (existingComment.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    const updateFields = [];
    const queryParams = [];
    let paramCount = 0;

    if (reader_name !== undefined) {
      paramCount++;
      updateFields.push(`reader_name = $${paramCount}`);
      queryParams.push(reader_name);
    }

    if (reader_email !== undefined) {
      paramCount++;
      updateFields.push(`reader_email = $${paramCount}`);
      queryParams.push(reader_email);
    }

    if (content !== undefined) {
      paramCount++;
      updateFields.push(`content = $${paramCount}`);
      queryParams.push(content);
    }

    if (status !== undefined) {
      paramCount++;
      updateFields.push(`status = $${paramCount}`);
      queryParams.push(status);

      if (status === "published") {
        paramCount++;
        updateFields.push(`published_at = $${paramCount}`);
        queryParams.push(new Date());
      }
    }

    if (moderation_result !== undefined) {
      paramCount++;
      updateFields.push(`moderation_result = $${paramCount}`);
      queryParams.push(moderation_result);
    }

    if (moderation_score !== undefined) {
      paramCount++;
      updateFields.push(`moderation_score = $${paramCount}`);
      queryParams.push(moderation_score);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      });
    }

    paramCount++;
    queryParams.push(id);

    const query = `
      UPDATE comments 
      SET ${updateFields.join(", ")}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, queryParams);

    const commentWithNews = await pool.query(
      `SELECT 
        c.*,
        n.title as news_title
       FROM comments c
       LEFT JOIN news n ON c.news_id = n.id
       WHERE c.id = $1`,
      [id]
    );

    res.json({
      success: true,
      message: "Comment updated successfully",
      data: commentWithNews.rows[0],
    });
  } catch (error) {
    console.error("Error updating comment:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM comments WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    res.json({
      success: true,
      message: "Comment deleted successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.bulkDeleteComments = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Comment IDs array is required",
      });
    }

    const placeholders = ids.map((_, index) => `$${index + 1}`).join(",");
    const query = `DELETE FROM comments WHERE id IN (${placeholders}) RETURNING *`;

    const result = await pool.query(query, ids);

    res.json({
      success: true,
      message: `${result.rows.length} comments deleted successfully`,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error bulk deleting comments:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.bulkUpdateStatus = async (req, res) => {
  try {
    const { ids, status } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Comment IDs array is required",
      });
    }

    if (!status || !["waiting", "published", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Valid status is required (waiting, published, rejected)",
      });
    }

    const placeholders = ids.map((_, index) => `$${index + 2}`).join(",");
    let query = `UPDATE comments SET status = $1`;

    if (status === "published") {
      query += `, published_at = CURRENT_TIMESTAMP`;
    }

    query += ` WHERE id IN (${placeholders}) RETURNING *`;

    const queryParams = [status, ...ids];
    const result = await pool.query(query, queryParams);

    res.json({
      success: true,
      message: `${result.rows.length} comments updated successfully`,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error bulk updating comments:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.approveComment = async (req, res) => {
  try {
    const { id } = req.params;

    const existingComment = await pool.query(
      "SELECT * FROM comments WHERE id = $1",
      [id]
    );
    if (existingComment.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    const result = await pool.query(
      `UPDATE comments 
       SET status = 'published', 
           published_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 
       RETURNING *`,
      [id]
    );

    res.json({
      success: true,
      message: "Comment approved successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error approving comment:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.rejectComment = async (req, res) => {
  try {
    const { id } = req.params;

    const existingComment = await pool.query(
      "SELECT * FROM comments WHERE id = $1",
      [id]
    );
    if (existingComment.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    const result = await pool.query(
      `UPDATE comments 
       SET status = 'rejected',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 
       RETURNING *`,
      [id]
    );

    res.json({
      success: true,
      message: "Comment rejected successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error rejecting comment:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
