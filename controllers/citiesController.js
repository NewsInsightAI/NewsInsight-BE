const pool = require("../db");

// Helper function to convert UPPERCASE names to Title Case
const toTitleCase = (str) => {
  if (!str) return str;
  
  // Handle special cases for common Indonesian words
  const lowerCaseWords = ['dan', 'di', 'ke', 'dari', 'untuk', 'dengan', 'oleh', 'pada', 'dalam', 'atas', 'bawah', 'tengah'];
  const upperCaseWords = ['ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];
  
  return str.toLowerCase()
    .split(' ')
    .map((word, index) => {
      // First word is always capitalized
      if (index === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      
      // Check if word should remain lowercase
      if (lowerCaseWords.includes(word.toLowerCase())) {
        return word.toLowerCase();
      }
      
      // Check if word should be uppercase (Roman numerals)
      if (upperCaseWords.includes(word.toLowerCase())) {
        return word.toUpperCase();
      }
      
      // Default: capitalize first letter
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

// Get all provinces
const getProvinces = async (req, res) => {
  try {
    const query = `
      SELECT id, name
      FROM provinces
      ORDER BY name ASC
    `;
    
    const result = await pool.query(query);
    
    // Format the names to Title Case
    const formattedData = result.rows.map(province => ({
      ...province,
      name: toTitleCase(province.name)
    }));
    
    res.status(200).json({
      status: "success",
      message: "Provinces retrieved successfully",
      data: formattedData
    });
  } catch (error) {
    console.error("Error fetching provinces:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
};

// Get all regencies by province ID
const getRegenciesByProvince = async (req, res) => {
  try {
    const { provinceId } = req.params;
    
    const query = `
      SELECT id, province_id, name
      FROM regencies
      WHERE province_id = $1
      ORDER BY name ASC
    `;
    
    const result = await pool.query(query, [provinceId]);
    
    // Format the names to Title Case
    const formattedData = result.rows.map(regency => ({
      ...regency,
      name: toTitleCase(regency.name)
    }));
    
    res.status(200).json({
      status: "success",
      message: "Regencies retrieved successfully",
      data: formattedData
    });
  } catch (error) {
    console.error("Error fetching regencies:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
};

// Get all regencies from all provinces
const getAllRegencies = async (req, res) => {
  try {
    const query = `
      SELECT r.id, r.province_id, r.name, p.name as province_name
      FROM regencies r
      JOIN provinces p ON r.province_id = p.id
      ORDER BY r.name ASC
    `;
    
    const result = await pool.query(query);
    
    // Format the names to Title Case
    const formattedData = result.rows.map(regency => ({
      ...regency,
      name: toTitleCase(regency.name),
      province_name: toTitleCase(regency.province_name)
    }));
    
    res.status(200).json({
      status: "success",
      message: "All regencies retrieved successfully",
      data: formattedData
    });
  } catch (error) {
    console.error("Error fetching all regencies:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
};

// Search regencies by name
const searchRegencies = async (req, res) => {
  try {
    const { search } = req.query;
    
    if (!search || search.trim().length < 2) {
      return res.status(400).json({
        status: "error",
        message: "Search query must be at least 2 characters long"
      });
    }
    
    const query = `
      SELECT r.id, r.province_id, r.name, p.name as province_name
      FROM regencies r
      JOIN provinces p ON r.province_id = p.id
      WHERE LOWER(r.name) LIKE LOWER($1)
      ORDER BY r.name ASC
      LIMIT 50
    `;
    
    const result = await pool.query(query, [`%${search.trim()}%`]);
    
    // Format the names to Title Case
    const formattedData = result.rows.map(regency => ({
      ...regency,
      name: toTitleCase(regency.name),
      province_name: toTitleCase(regency.province_name)
    }));
    
    res.status(200).json({
      status: "success",
      message: "Search results retrieved successfully",
      data: formattedData
    });
  } catch (error) {
    console.error("Error searching regencies:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
};

module.exports = {
  getProvinces,
  getRegenciesByProvince,
  getAllRegencies,
  searchRegencies
};
