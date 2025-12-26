import { apiInsertInventoryItemSchema } from "./shared/schema";

const testData = {
    division: "SKT",
    category: "SKT",
    productName: "Test Item",
    specification: "1.0",
    unitPrice: 1000,
    type: "general",
    attributes: "{}",
    carriedOver: 0,
    incoming: 0,
    outgoing: 0,
    remaining: 0,
    totalAmount: 0
};

console.log("Testing apiInsertInventoryItemSchema validation...");
const result = apiInsertInventoryItemSchema.safeParse(testData);

if (result.success) {
    console.log("Success! Schema correctly validates data without tenantId.");
    console.log("Validated data:", JSON.stringify(result.data, null, 2));
} else {
    console.log("Failed! Schema still requires some fields or has errors.");
    console.log("Errors:", JSON.stringify(result.error.format(), null, 2));
}
