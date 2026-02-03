function saveTransaction() {
  const dateValue = document.getElementById("date").value;
  const date = new Date(dateValue);
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const day = days[date.getDay()];

  fetch("http://127.0.0.1:8000/transactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      day: day,
      date: dateValue,
      description: document.getElementById("desc").value,
      category: document.getElementById("category").value,
      type: document.getElementById("type").value,
      amount: parseFloat(document.getElementById("amount").value)
    })
  })
  .then(res => res.json())
  .then(data => alert("Saved!"));
}
