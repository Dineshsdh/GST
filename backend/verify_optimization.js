const fetch = require('node-fetch');

async function testBackend() {
    console.log("Testing Backend Route: /api/invoices");
    const startTime = Date.now();
    try {
        const res = await fetch('http://localhost:5000/api/invoices?page=1&limit=5');
        const endTime = Date.now();
        const duration = endTime - startTime;

        if (!res.ok) {
            console.error("Failed with status:", res.status);
            return;
        }

        const data = await res.json();
        console.log(`Response Time: ${duration}ms`);
        console.log("Total Count:", data.totalCount);
        console.log("Total Pages:", data.totalPages);
        console.log("Current Page:", data.currentPage);
        console.log("Array size:", data.invoices.length);

        if (data.invoices.length > 0) {
            console.log("\nSample Invoice Object:");
            console.log(JSON.stringify(data.invoices[0], null, 2));
        }

        if (duration < 200) {
            console.log("✅ Performance OK");
        } else {
            console.log("⚠️ Performance needs improvement");
        }
    } catch (e) {
        console.error("Test failed", e.message);
    }
}

testBackend();
