async function testAdminComplaints() {
  console.log("Signing in as admin...");
  try {
    const loginRes = await fetch("http://localhost:5000/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@gmail.com", password: "admin123" }),
    });

    const loginJson = (await loginRes.json()) as any;
    if (!loginJson.success) {
      console.error("Login failed:", loginJson.message);
      return;
    }

    const token = loginJson.data.token;
    console.log("Login successful. Fetching complaints...");

    const res = await fetch("http://localhost:5000/api/v1/admin/complaints", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : "Unknown error");
  }
  process.exit(0);
}

testAdminComplaints();
