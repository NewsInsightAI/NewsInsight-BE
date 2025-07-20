const { google } = require("googleapis");

// Perspective API configuration
const API_KEY = process.env.PERSPECTIVE_API_KEY;
const DISCOVERY_URL =
  "https://commentanalyzer.googleapis.com/$discovery/rest?version=v1alpha1";

// Toxicity threshold (0.7 = 70% probability of being toxic)
const TOXICITY_THRESHOLD = 0.7;

// Initialize Perspective API client
let perspectiveClient = null;

const initializePerspectiveClient = async () => {
  if (!perspectiveClient) {
    try {
      perspectiveClient = await google.discoverAPI(DISCOVERY_URL);
    } catch (error) {
      console.error("Failed to initialize Perspective API client:", error);
      throw error;
    }
  }
  return perspectiveClient;
};

/**
 * Analyze comment toxicity using Perspective API
 */
const analyzeComment = async (req, res) => {
  try {
    const { text } = req.body;

    // Validate input
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Text is required and must be a non-empty string",
      });
    }

    // Check if API key is configured
    if (!API_KEY) {
      return res.status(500).json({
        success: false,
        error: "Perspective API key is not configured",
      });
    }

    // Initialize client
    const client = await initializePerspectiveClient();

    // Prepare analysis request
    const analyzeRequest = {
      comment: {
        text: text.trim(),
      },
      requestedAttributes: {
        TOXICITY: {},
        SEVERE_TOXICITY: {},
        IDENTITY_ATTACK: {},
        INSULT: {},
        PROFANITY: {},
        THREAT: {},
      },
      languages: ["id", "en"], // Support Indonesian and English
    };

    // Make the API call
    const response = await new Promise((resolve, reject) => {
      client.comments.analyze(
        {
          key: API_KEY,
          resource: analyzeRequest,
        },
        (err, response) => {
          if (err) {
            reject(err);
          } else {
            resolve(response);
          }
        }
      );
    });

    // Return the original Perspective API response
    return res.json({
      success: true,
      data: {
        attributeScores: response.data.attributeScores,
        languages: response.data.languages,
      },
    });
  } catch (error) {
    console.error("Error analyzing comment:", error);

    // Handle specific API errors
    if (error.code === 400) {
      return res.status(400).json({
        success: false,
        error: "Invalid request to Perspective API",
        details: error.message,
      });
    } else if (error.code === 403) {
      return res.status(403).json({
        success: false,
        error: "Perspective API access denied. Check your API key and quota.",
        details: error.message,
      });
    } else if (error.code === 429) {
      return res.status(429).json({
        success: false,
        error: "Perspective API rate limit exceeded. Please try again later.",
        details: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: "Failed to analyze comment",
      details: error.message,
    });
  }
};

/**
 * Batch analyze multiple comments
 */
const batchAnalyzeComments = async (req, res) => {
  try {
    const { texts } = req.body;

    // Validate input
    if (!Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({
        success: false,
        error: "texts must be a non-empty array",
      });
    }

    if (texts.length > 10) {
      return res.status(400).json({
        success: false,
        error: "Maximum 10 texts can be analyzed at once",
      });
    }

    // Check if API key is configured
    if (!API_KEY) {
      return res.status(500).json({
        success: false,
        error: "Perspective API key is not configured",
      });
    }

    // Initialize client
    const client = await initializePerspectiveClient();

    // Analyze each text
    const results = [];
    const errors = [];

    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];

      if (!text || typeof text !== "string" || text.trim().length === 0) {
        errors.push({
          index: i,
          text,
          error: "Text must be a non-empty string",
        });
        continue;
      }

      try {
        const analyzeRequest = {
          comment: {
            text: text.trim(),
          },
          requestedAttributes: {
            TOXICITY: {},
            SEVERE_TOXICITY: {},
            IDENTITY_ATTACK: {},
            INSULT: {},
            PROFANITY: {},
            THREAT: {},
          },
          languages: ["id", "en"],
        };

        const response = await new Promise((resolve, reject) => {
          client.comments.analyze(
            {
              key: API_KEY,
              resource: analyzeRequest,
            },
            (err, response) => {
              if (err) {
                reject(err);
              } else {
                resolve(response);
              }
            }
          );
        });

        // Store original response data
        results.push({
          index: i,
          text: text.trim(),
          attributeScores: response.data.attributeScores,
          languages: response.data.languages,
        });

        // Add small delay between requests to avoid rate limiting
        if (i < texts.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Error analyzing comment ${i}:`, error);
        errors.push({
          index: i,
          text,
          error: error.message,
        });
      }
    }

    return res.json({
      success: true,
      data: {
        results,
        errors,
        totalAnalyzed: results.length,
        totalErrors: errors.length,
      },
    });
  } catch (error) {
    console.error("Error in batch analysis:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to batch analyze comments",
      details: error.message,
    });
  }
};

/**
 * Get analysis configuration
 */
const getAnalysisConfig = async (req, res) => {
  try {
    return res.json({
      success: true,
      data: {
        threshold: TOXICITY_THRESHOLD,
        attributes: [
          "TOXICITY",
          "SEVERE_TOXICITY",
          "IDENTITY_ATTACK",
          "INSULT",
          "PROFANITY",
          "THREAT",
        ],
        supportedLanguages: ["id", "en"],
        apiConfigured: !!API_KEY,
      },
    });
  } catch (error) {
    console.error("Error getting analysis config:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get analysis configuration",
    });
  }
};

module.exports = {
  analyzeComment,
  batchAnalyzeComments,
  getAnalysisConfig,
};
