const fetch = require("node-fetch");

class FactCheckController {
  // Check a single news article for fact verification
  static async checkNews(req, res) {
    try {
      const { newsId } = req.params;
      const { query, languageCode = "id" } = req.body;

      if (!query) {
        return res.status(400).json({
          success: false,
          message: "Query text is required for fact checking",
        });
      }

      // Get the API key from environment
      const apiKey = process.env.PERSPECTIVE_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          success: false,
          message: "Fact Check API key not configured",
        });
      }

      // Call Google Fact Check Tools API
      const factCheckUrl = `https://factchecktools.googleapis.com/v1alpha1/claims:search`;
      const params = new URLSearchParams({
        key: apiKey,
        query: query,
        languageCode: languageCode,
        maxAgeDays: "7", // Check claims from last 7 days, adjust as needed
      });

      const response = await fetch(`${factCheckUrl}?${params}`);
      const data = await response.json();

      if (!response.ok) {
        console.error("Fact Check API Error:", data);
        return res.status(response.status).json({
          success: false,
          message: data.error?.message || "Failed to check facts",
          details: data,
        });
      }

      // Process the fact check results
      const factCheckResults = {
        query: query,
        totalClaims: data.claims ? data.claims.length : 0,
        claims: [],
      };

      if (data.claims && data.claims.length > 0) {
        factCheckResults.claims = data.claims.map((claim) => {
          // Get the first claim review (there can be multiple)
          const claimReview =
            claim.claimReview && claim.claimReview.length > 0
              ? claim.claimReview[0]
              : null;

          return {
            text: claim.text || "",
            claimant: claim.claimant || "Unknown",
            claimDate: claim.claimDate || null,
            reviewPublisher: claimReview?.publisher?.name || "Unknown",
            reviewTitle: claimReview?.title || "",
            reviewUrl: claimReview?.url || "",
            rating: claimReview?.textualRating || "Not rated",
            languageCode: claimReview?.languageCode || languageCode,
          };
        });
      }

      // Calculate overall trustworthiness score
      let trustScore = null;
      if (factCheckResults.totalClaims > 0) {
        const ratings = factCheckResults.claims
          .map((claim) => claim.rating.toLowerCase())
          .filter((rating) => rating);

        // Simple scoring system - can be enhanced
        let falseCount = 0;
        let trueCount = 0;
        let mixedCount = 0;

        ratings.forEach((rating) => {
          if (
            rating.includes("false") ||
            rating.includes("salah") ||
            rating.includes("hoax")
          ) {
            falseCount++;
          } else if (
            rating.includes("true") ||
            rating.includes("benar") ||
            rating.includes("akurat")
          ) {
            trueCount++;
          } else {
            mixedCount++;
          }
        });

        const totalRatings = falseCount + trueCount + mixedCount;
        if (totalRatings > 0) {
          trustScore = Math.round(
            (trueCount * 100 + mixedCount * 50) / totalRatings
          );
        }
      }

      return res.json({
        success: true,
        data: {
          newsId: newsId,
          factCheck: {
            ...factCheckResults,
            trustScore: trustScore,
            isVerified: factCheckResults.totalClaims > 0,
            checkedAt: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      console.error("Fact check error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error during fact checking",
        error: error.message,
      });
    }
  }

  // Batch fact check multiple news articles
  static async batchCheckNews(req, res) {
    try {
      const { newsItems } = req.body;

      if (!Array.isArray(newsItems) || newsItems.length === 0) {
        return res.status(400).json({
          success: false,
          message: "newsItems array is required",
        });
      }

      if (newsItems.length > 10) {
        return res.status(400).json({
          success: false,
          message: "Maximum 10 news items can be checked at once",
        });
      }

      const results = [];
      const apiKey = process.env.PERSPECTIVE_API_KEY;

      if (!apiKey) {
        return res.status(500).json({
          success: false,
          message: "Fact Check API key not configured",
        });
      }

      // Process each news item
      for (const newsItem of newsItems) {
        try {
          const { id, query, languageCode = "id" } = newsItem;

          if (!query) {
            results.push({
              newsId: id,
              success: false,
              error: "Query is required",
            });
            continue;
          }

          // Call Google Fact Check Tools API
          const factCheckUrl = `https://factchecktools.googleapis.com/v1alpha1/claims:search`;
          const params = new URLSearchParams({
            key: apiKey,
            query: query,
            languageCode: languageCode,
            maxAgeDays: "7",
          });

          const response = await fetch(`${factCheckUrl}?${params}`);
          const data = await response.json();

          if (!response.ok) {
            results.push({
              newsId: id,
              success: false,
              error: data.error?.message || "Failed to check facts",
            });
            continue;
          }

          // Process results (same logic as single check)
          const factCheckResults = {
            query: query,
            totalClaims: data.claims ? data.claims.length : 0,
            claims: [],
          };

          if (data.claims && data.claims.length > 0) {
            factCheckResults.claims = data.claims.map((claim) => {
              const claimReview =
                claim.claimReview && claim.claimReview.length > 0
                  ? claim.claimReview[0]
                  : null;

              return {
                text: claim.text || "",
                claimant: claim.claimant || "Unknown",
                claimDate: claim.claimDate || null,
                reviewPublisher: claimReview?.publisher?.name || "Unknown",
                reviewTitle: claimReview?.title || "",
                reviewUrl: claimReview?.url || "",
                rating: claimReview?.textualRating || "Not rated",
                languageCode: claimReview?.languageCode || languageCode,
              };
            });
          }

          // Calculate trust score
          let trustScore = null;
          if (factCheckResults.totalClaims > 0) {
            const ratings = factCheckResults.claims
              .map((claim) => claim.rating.toLowerCase())
              .filter((rating) => rating);

            let falseCount = 0;
            let trueCount = 0;
            let mixedCount = 0;

            ratings.forEach((rating) => {
              if (
                rating.includes("false") ||
                rating.includes("salah") ||
                rating.includes("hoax")
              ) {
                falseCount++;
              } else if (
                rating.includes("true") ||
                rating.includes("benar") ||
                rating.includes("akurat")
              ) {
                trueCount++;
              } else {
                mixedCount++;
              }
            });

            const totalRatings = falseCount + trueCount + mixedCount;
            if (totalRatings > 0) {
              trustScore = Math.round(
                (trueCount * 100 + mixedCount * 50) / totalRatings
              );
            }
          }

          results.push({
            newsId: id,
            success: true,
            factCheck: {
              ...factCheckResults,
              trustScore: trustScore,
              isVerified: factCheckResults.totalClaims > 0,
              checkedAt: new Date().toISOString(),
            },
          });

          // Add delay between requests to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          results.push({
            newsId: newsItem.id,
            success: false,
            error: error.message,
          });
        }
      }

      return res.json({
        success: true,
        data: {
          totalChecked: newsItems.length,
          results: results,
        },
      });
    } catch (error) {
      console.error("Batch fact check error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error during batch fact checking",
        error: error.message,
      });
    }
  }

  // Get fact check history for a specific news article
  static async getFactCheckHistory(req, res) {
    try {
      const { newsId } = req.params;

      // This could be extended to store fact check results in database
      // For now, we'll return a simple response
      return res.json({
        success: true,
        data: {
          newsId: newsId,
          message:
            "Fact check history feature can be implemented with database storage",
          suggestion:
            "Consider storing fact check results in database for history tracking",
        },
      });
    } catch (error) {
      console.error("Get fact check history error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // Check if news has fact check history
  static async hasFactCheck(req, res) {
    try {
      const { newsId } = req.params;

      if (!newsId) {
        return res.status(400).json({
          success: false,
          message: "News ID is required",
        });
      }

      const pool = require("../db");

      // Check if there's any fact check history for this news
      const query = `
        SELECT 
          id,
          created_at,
          trust_score,
          total_claims
        FROM fact_check_history 
        WHERE news_id = $1 
        ORDER BY created_at DESC 
        LIMIT 1
      `;

      const result = await pool.query(query, [newsId]);

      const hasFactCheck = result.rows.length > 0;
      const latestCheck = hasFactCheck ? result.rows[0] : null;

      return res.status(200).json({
        success: true,
        data: {
          hasFactCheck,
          latestCheck: latestCheck
            ? {
                id: latestCheck.id,
                checkedAt: latestCheck.created_at,
                trustScore: latestCheck.trust_score,
                totalClaims: latestCheck.total_claims,
              }
            : null,
        },
      });
    } catch (error) {
      console.error("Check fact check status error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
}

module.exports = FactCheckController;
