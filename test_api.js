
fetch("http://localhost:5000/api/inventory", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
    },
    body: JSON.stringify({
        division: "SKT",
        category: "TestNode",
        productName: "Test Item Node",
        specification: "Spec",
        carriedOver: 10,
        incoming: 5,
        outgoing: 2,
        remaining: 13,
        unitPrice: 100,
        totalAmount: 1300,
    }),
})
    .then(async (res) => {
        console.log("Status:", res.status);
        console.log("Body:", await res.text());
    })
    .catch((err) => console.error(err));
