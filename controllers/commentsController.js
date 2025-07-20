const pool = require("../db");

// Get comments for a specific news article with likes and replies
exports.getCommentsForNews = async (req, res) => {
  try {
    const { newsId } = req.params;
    const { user_email } = req.query;

    if (!newsId) {
      return res.status(400).json({
        success: false,
        message: "News ID is required",
      });
    }

    // Get main comments (parent_id is null)
    // Show approved comments for everyone + waiting comments for the owner
    const commentsQuery = `
      SELECT 
        c.id,
        c.news_id,
        c.reader_name,
        c.reader_email,
        c.content,
        c.status,
        c.created_at,
        c.updated_at,
        c.parent_id,
        COALESCE(likes.like_count, 0) as likes,
        COALESCE(dislikes.dislike_count, 0) as dislikes,
        user_likes.like_type as user_like_type
      FROM comments c
      LEFT JOIN (
        SELECT comment_id, COUNT(*) as like_count 
        FROM comment_likes 
        WHERE like_type = 'like' 
        GROUP BY comment_id
      ) likes ON c.id = likes.comment_id
      LEFT JOIN (
        SELECT comment_id, COUNT(*) as dislike_count 
        FROM comment_likes 
        WHERE like_type = 'dislike' 
        GROUP BY comment_id
      ) dislikes ON c.id = dislikes.comment_id
      LEFT JOIN comment_likes user_likes ON c.id = user_likes.comment_id AND user_likes.user_email = $2
      WHERE c.news_id = $1 AND c.parent_id IS NULL 
        AND (c.status = 'approved' OR (c.status = 'waiting' AND c.reader_email = $2))
      ORDER BY c.created_at DESC
    `;

    const mainComments = await pool.query(commentsQuery, [newsId, user_email || null]);

    // Get replies for each main comment
    const repliesQuery = `
      SELECT 
        c.id,
        c.news_id,
        c.reader_name,
        c.reader_email,
        c.content,
        c.status,
        c.created_at,
        c.updated_at,
        c.parent_id,
        COALESCE(likes.like_count, 0) as likes,
        COALESCE(dislikes.dislike_count, 0) as dislikes,
        user_likes.like_type as user_like_type
      FROM comments c
      LEFT JOIN (
        SELECT comment_id, COUNT(*) as like_count 
        FROM comment_likes 
        WHERE like_type = 'like' 
        GROUP BY comment_id
      ) likes ON c.id = likes.comment_id
      LEFT JOIN (
        SELECT comment_id, COUNT(*) as dislike_count 
        FROM comment_likes 
        WHERE like_type = 'dislike' 
        GROUP BY comment_id
      ) dislikes ON c.id = dislikes.comment_id
      LEFT JOIN comment_likes user_likes ON c.id = user_likes.comment_id AND user_likes.user_email = $2
      WHERE c.news_id = $1 AND c.parent_id = $3 
        AND (c.status = 'approved' OR (c.status = 'waiting' AND c.reader_email = $2))
      ORDER BY c.created_at ASC
    `;

    const commentsWithReplies = [];
    for (const comment of mainComments.rows) {
      const replies = await pool.query(repliesQuery, [newsId, user_email || null, comment.id]);
      commentsWithReplies.push({
        ...comment,
        replies: replies.rows
      });
    }

    res.json({
      success: true,
      data: {
        comments: commentsWithReplies,
        total: mainComments.rows.length
      }
    });
  } catch (error) {
    console.error("Error fetching comments for news:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

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
        c.parent_id,
        n.title as news_title,
        COALESCE(likes.like_count, 0) as likes,
        COALESCE(dislikes.dislike_count, 0) as dislikes,
        COALESCE(reports.report_count, 0) as reports,
        parent_comment.content as parent_content,
        parent_comment.reader_name as parent_reader_name,
        COUNT(*) OVER() as total_count
      FROM comments c
      LEFT JOIN news n ON c.news_id = n.id
      LEFT JOIN comments parent_comment ON c.parent_id = parent_comment.id
      LEFT JOIN (
        SELECT comment_id, COUNT(*) as like_count 
        FROM comment_likes 
        WHERE like_type = 'like' 
        GROUP BY comment_id
      ) likes ON c.id = likes.comment_id
      LEFT JOIN (
        SELECT comment_id, COUNT(*) as dislike_count 
        FROM comment_likes 
        WHERE like_type = 'dislike' 
        GROUP BY comment_id
      ) dislikes ON c.id = dislikes.comment_id
      LEFT JOIN (
        SELECT comment_id, COUNT(*) as report_count 
        FROM comment_reports 
        GROUP BY comment_id
      ) reports ON c.id = reports.comment_id
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

// Like or dislike a comment
exports.likeComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_email, like_type } = req.body;

    if (!user_email || !like_type) {
      return res.status(400).json({
        success: false,
        message: "User email and like type are required",
      });
    }

    if (!['like', 'dislike'].includes(like_type)) {
      return res.status(400).json({
        success: false,
        message: "Like type must be 'like' or 'dislike'",
      });
    }

    // Check if comment exists
    const commentCheck = await pool.query("SELECT id FROM comments WHERE id = $1", [id]);
    if (commentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Check if user already liked/disliked this comment
    const existingLike = await pool.query(
      "SELECT * FROM comment_likes WHERE comment_id = $1 AND user_email = $2",
      [id, user_email]
    );

    let result;
    if (existingLike.rows.length > 0) {
      if (existingLike.rows[0].like_type === like_type) {
        // Same action - remove the like/dislike
        await pool.query(
          "DELETE FROM comment_likes WHERE comment_id = $1 AND user_email = $2",
          [id, user_email]
        );
        result = { action: 'removed', like_type: null };
      } else {
        // Different action - update the like/dislike
        result = await pool.query(
          "UPDATE comment_likes SET like_type = $1, updated_at = CURRENT_TIMESTAMP WHERE comment_id = $2 AND user_email = $3 RETURNING *",
          [like_type, id, user_email]
        );
        result = { action: 'updated', like_type, data: result.rows[0] };
      }
    } else {
      // New like/dislike
      result = await pool.query(
        "INSERT INTO comment_likes (comment_id, user_email, like_type) VALUES ($1, $2, $3) RETURNING *",
        [id, user_email, like_type]
      );
      result = { action: 'created', like_type, data: result.rows[0] };
    }

    // Get updated like counts
    const likeCounts = await pool.query(
      `SELECT 
        COUNT(CASE WHEN like_type = 'like' THEN 1 END) as likes,
        COUNT(CASE WHEN like_type = 'dislike' THEN 1 END) as dislikes
       FROM comment_likes WHERE comment_id = $1`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...result,
        likes: parseInt(likeCounts.rows[0].likes),
        dislikes: parseInt(likeCounts.rows[0].dislikes)
      }
    });
  } catch (error) {
    console.error("Error liking comment:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get comment likes
exports.getCommentLikes = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        COUNT(CASE WHEN like_type = 'like' THEN 1 END) as likes,
        COUNT(CASE WHEN like_type = 'dislike' THEN 1 END) as dislikes
       FROM comment_likes WHERE comment_id = $1`,
      [id]
    );

    res.json({
      success: true,
      data: {
        likes: parseInt(result.rows[0].likes),
        dislikes: parseInt(result.rows[0].dislikes)
      }
    });
  } catch (error) {
    console.error("Error fetching comment likes:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Create a reply to a comment
exports.createReply = async (req, res) => {
  try {
    const { parent_id } = req.params;
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

    // Check if parent comment exists
    const parentCheck = await pool.query("SELECT id, news_id FROM comments WHERE id = $1", [parent_id]);
    if (parentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Parent comment not found",
      });
    }

    // Ensure the reply is for the same news article
    if (parentCheck.rows[0].news_id !== parseInt(news_id)) {
      return res.status(400).json({
        success: false,
        message: "Reply must be for the same news article as the parent comment",
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
        moderation_result, moderation_score, parent_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *`,
      [
        news_id,
        reader_name,
        reader_email,
        content,
        status,
        JSON.stringify(moderationResult),
        moderationScore,
        parent_id,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Reply created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error creating reply:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Report a comment
exports.reportComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_email, reason } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Comment ID is required",
      });
    }

    if (!user_email || !reason) {
      return res.status(400).json({
        success: false,
        message: "User email and reason are required",
      });
    }

    // Check if comment exists
    const commentCheck = await pool.query(
      "SELECT id FROM comments WHERE id = $1",
      [id]
    );

    if (commentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Check if user has already reported this comment
    const existingReport = await pool.query(
      "SELECT id FROM comment_reports WHERE comment_id = $1 AND reporter_email = $2",
      [id, user_email]
    );

    if (existingReport.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "You have already reported this comment",
      });
    }

    // Create the comment_reports table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comment_reports (
        id SERIAL PRIMARY KEY,
        comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
        reporter_email VARCHAR(255) NOT NULL,
        reason TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert the report
    const result = await pool.query(
      `INSERT INTO comment_reports (comment_id, reporter_email, reason) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [id, user_email, reason]
    );

    res.status(201).json({
      success: true,
      message: "Comment reported successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error reporting comment:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
