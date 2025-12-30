
import { apiRequest } from "../client/src/lib/queryClient";

async function run() {
    const items = [
        {
            division: "SKT",
            category: "SKT",
            productName: "광접속함체 두24C",
            specification: "", // Empty based on screenshot
            outgoing: 100,
            remaining: 9,
            unitPrice: 147882,
            totalAmount: 1330938
        },
        {
            division: "SKT",
            category: "SKT",
            productName: "광접속함체 돔형 24C",
            specification: "",
            outgoing: 1302,
            remaining: 5,
            unitPrice: 40150,
            totalAmount: 200750
        }
    ];

    console.log("Sending items:", JSON.stringify(items, null, 2));

    try {
        const response = await fetch("http://localhost:5001/api/inventory/bulk", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ items })
        });

        console.log("Status:", response.status);
        const text = await response.text();
        console.log("Response:", text);
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
