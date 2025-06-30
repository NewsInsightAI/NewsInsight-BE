const API_BASE_URL = "http://localhost:5000/api";

const TEST_TOKEN = "your-jwt-token-here";

async function testBookmarkAPI() {
  console.log("🧪 Testing Bookmark API...");

  try {
    console.log("1. Testing GET bookmarks...");
    const bookmarksResponse = await fetch(`${API_BASE_URL}/bookmarks`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (bookmarksResponse.ok) {
      const bookmarksData = await bookmarksResponse.json();
      console.log("✅ Get bookmarks successful:", bookmarksData);
    } else {
      console.log("❌ Get bookmarks failed:", bookmarksResponse.status);
    }

    console.log("2. Testing POST bookmark...");
    const addResponse = await fetch(`${API_BASE_URL}/bookmarks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ news_id: 1 }),
    });

    if (addResponse.ok) {
      const addData = await addResponse.json();
      console.log("✅ Add bookmark successful:", addData);
    } else {
      console.log("❌ Add bookmark failed:", addResponse.status);
    }

    console.log("3. Testing GET check bookmark...");
    const checkResponse = await fetch(`${API_BASE_URL}/bookmarks/check/1`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (checkResponse.ok) {
      const checkData = await checkResponse.json();
      console.log("✅ Check bookmark successful:", checkData);
    } else {
      console.log("❌ Check bookmark failed:", checkResponse.status);
    }
  } catch (error) {
    console.error("❌ Bookmark API test failed:", error);
  }
}

async function testReadingHistoryAPI() {
  console.log("🧪 Testing Reading History API...");

  try {
    console.log("1. Testing GET reading history...");
    const historyResponse = await fetch(`${API_BASE_URL}/reading-history`, {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (historyResponse.ok) {
      const historyData = await historyResponse.json();
      console.log("✅ Get reading history successful:", historyData);
    } else {
      console.log("❌ Get reading history failed:", historyResponse.status);
    }

    console.log("2. Testing POST reading history...");
    const addResponse = await fetch(`${API_BASE_URL}/reading-history`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        news_id: 1,
        read_duration: 120,
        read_percentage: 75,
      }),
    });

    if (addResponse.ok) {
      const addData = await addResponse.json();
      console.log("✅ Add reading history successful:", addData);
    } else {
      console.log("❌ Add reading history failed:", addResponse.status);
    }
  } catch (error) {
    console.error("❌ Reading History API test failed:", error);
  }
}

console.log("📝 API Test Suite");
console.log("Note: Replace TEST_TOKEN with a valid JWT token from your app");
console.log("Server should be running on http://localhost:5000");
