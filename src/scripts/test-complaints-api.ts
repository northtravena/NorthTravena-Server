async function testApi() {
  console.log("Testing backend complaints endpoint...");
  try {
    const res = await fetch("http://localhost:5000/api/v1/admin/complaints");
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
  } catch (error) {
    console.error("Error connecting to server:", error instanceof Error ? error.message : "Unknown error");
  }
}

testApi();
