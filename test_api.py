import requests
try:
    resp = requests.post("http://localhost:5000/api/inventory", json={
      "division": "SKT",
      "category": "TestPy",
      "productName": "Test Item Python",
      "specification": "Spec",
      "carriedOver": 10,
      "incoming": 5,
      "outgoing": 2,
      "remaining": 13,
      "unitPrice": 100,
      "totalAmount": 1300
    })
    print(f"Status: {resp.status_code}")
    print(f"Body: {resp.text}")
except Exception as e:
    print(e)
