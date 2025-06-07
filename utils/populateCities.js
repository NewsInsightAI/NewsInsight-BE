const pool = require("../db");


const provinces = [
  { id: "11", name: "Aceh" },
  { id: "12", name: "Sumatera Utara" },
  { id: "13", name: "Sumatera Barat" },
  { id: "14", name: "Riau" },
  { id: "15", name: "Jambi" },
  { id: "16", name: "Sumatera Selatan" },
  { id: "17", name: "Bengkulu" },
  { id: "18", name: "Lampung" },
  { id: "19", name: "Kepulauan Bangka Belitung" },
  { id: "21", name: "Kepulauan Riau" },
  { id: "31", name: "DKI Jakarta" },
  { id: "32", name: "Jawa Barat" },
  { id: "33", name: "Jawa Tengah" },
  { id: "34", name: "DI Yogyakarta" },
  { id: "35", name: "Jawa Timur" },
  { id: "36", name: "Banten" },
  { id: "51", name: "Bali" },
  { id: "52", name: "Nusa Tenggara Barat" },
  { id: "53", name: "Nusa Tenggara Timur" },
  { id: "61", name: "Kalimantan Barat" },
  { id: "62", name: "Kalimantan Tengah" },
  { id: "63", name: "Kalimantan Selatan" },
  { id: "64", name: "Kalimantan Timur" },
  { id: "65", name: "Kalimantan Utara" },
  { id: "71", name: "Sulawesi Utara" },
  { id: "72", name: "Sulawesi Tengah" },
  { id: "73", name: "Sulawesi Selatan" },
  { id: "74", name: "Sulawesi Tenggara" },
  { id: "75", name: "Gorontalo" },
  { id: "76", name: "Sulawesi Barat" },
  { id: "81", name: "Maluku" },
  { id: "82", name: "Maluku Utara" },
  { id: "91", name: "Papua Barat" },
  { id: "94", name: "Papua" }
];

async function populateProvinces() {
  try {
    console.log("Starting to populate provinces...");
    
    for (const province of provinces) {
      const checkQuery = "SELECT id FROM provinces WHERE id = $1";
      const existingProvince = await pool.query(checkQuery, [province.id]);
      
      if (existingProvince.rows.length === 0) {
        const insertQuery = "INSERT INTO provinces (id, name) VALUES ($1, $2)";
        await pool.query(insertQuery, [province.id, province.name]);
        console.log(`✓ Inserted province: ${province.name}`);
      } else {
        console.log(`- Province already exists: ${province.name}`);
      }
    }
    
    console.log("Provinces population completed!");
  } catch (error) {
    console.error("Error populating provinces:", error);
    throw error;
  }
}

async function fetchAndPopulateRegencies() {
  try {
    console.log("Starting to populate regencies...");
    
    for (const province of provinces) {
      console.log(`Fetching regencies for ${province.name}...`);
      
      try {
        const response = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${province.id}.json`);
        
        if (!response.ok) {
          console.log(`Failed to fetch regencies for province ${province.name}: ${response.status}`);
          continue;
        }
        
        const regencies = await response.json();
        
        for (const regency of regencies) {
          const checkQuery = "SELECT id FROM regencies WHERE id = $1";
          const existingRegency = await pool.query(checkQuery, [regency.id]);
          
          if (existingRegency.rows.length === 0) {
            const insertQuery = "INSERT INTO regencies (id, province_id, name) VALUES ($1, $2, $3)";
            await pool.query(insertQuery, [regency.id, regency.province_id, regency.name]);
            console.log(`  ✓ Inserted regency: ${regency.name}`);
          } else {
            console.log(`  - Regency already exists: ${regency.name}`);
          }
        }

        
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (fetchError) {
        console.error(`Error fetching regencies for province ${province.name}:`, fetchError);
        continue;
      }
    }
    
    console.log("Regencies population completed!");
  } catch (error) {
    console.error("Error populating regencies:", error);
    throw error;
  }
}

async function populateCitiesData() {
  try {
    console.log("🚀 Starting cities data population...");
    
    
    await populateProvinces();
    
    
    await fetchAndPopulateRegencies();
    
    
    const provincesCount = await pool.query("SELECT COUNT(*) FROM provinces");
    const regenciesCount = await pool.query("SELECT COUNT(*) FROM regencies");
    
    console.log("\n📊 Population Summary:");
    console.log(`- Provinces: ${provincesCount.rows[0].count}`);
    console.log(`- Regencies: ${regenciesCount.rows[0].count}`);
    console.log("✅ Cities data population completed successfully!");
    
  } catch (error) {
    console.error("❌ Error during cities data population:", error);
  }
}


if (require.main === module) {
  populateCitiesData()
    .then(() => {
      console.log("Script completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Script failed:", error);
      process.exit(1);
    });
}

module.exports = {
  populateProvinces,
  fetchAndPopulateRegencies,
  populateCitiesData
};
