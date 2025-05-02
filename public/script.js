let editMode = false;
let data = {};

const urlParams = new URLSearchParams(window.location.search);
const monthParam = urlParams.get("month");
const isNew = urlParams.get("new") === "true";

async function fetchData() {
  if (isNew) {
    // Get last month's data
    const res = await fetch(`/latest`);
    const lastMonth = await res.json();

    // Prepare new month's data
    data = {
      meta: {
        month: monthParam,
        billAmount: 0,
        totalUnit: 0,
        extraMoney: 0,
      },
      users: lastMonth.users.map(u => ({
        name: u.name,
        new: 0,
        old: u.new,
        water: 0
      }))
    };
    editMode = true;
    populateUI();
    return;
  }

  // Normal loading for existing months
  const res = await fetch(`/data?month=${monthParam}`);
  if (!res.ok) {
    alert("Month not found!");
    return;
  }
  data = await res.json();
  populateUI();
}



function populateUI() {
  const meta = data.meta;

  const metaFields = ["month", "billAmount", "totalUnit", "extraMoney"];
  metaFields.forEach(id => {
    const el = document.getElementById(id);
    el.value = meta[id];
    el.disabled = !editMode;
  });

  const tableBody = document.getElementById("tableBody");
  tableBody.innerHTML = "";

  let totalUnitDiff = 0;
  let totalWaterMembers = 0;

  data.users.forEach((user, i) => {
    const unitDiff = user.new - user.old;
    totalUnitDiff += unitDiff;
    totalWaterMembers += user.water;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${i + 1}</td>
      <td><input class="yellow-inputs"value="${user.name}" ${!editMode ? "disabled" : ""} onchange="updateField(${i}, 'name', this.value)" /></td>
      <td><input type="number" value="${user.water}" ${!editMode ? "disabled" : ""} onchange="updateField(${i}, 'water', this.value)" /></td>
      <td><input type="number" value="${user.new}" ${!editMode ? "disabled" : ""} onchange="updateField(${i}, 'new', this.value)" /></td>
      <td><input type="number" value="${user.old}" ${!editMode ? "disabled" : ""} onchange="updateField(${i}, 'old', this.value)" /></td>
      <td>${unitDiff}</td>
      <td id="bill-${i}"class="yellow-inputs"></td>
    `;
    tableBody.appendChild(row);
  });

  const rupeesPerUnit = +((meta.billAmount - meta.extraMoney) / meta.totalUnit).toFixed(1);
  const unitForWater = meta.totalUnit - totalUnitDiff;
  const waterHead = totalWaterMembers > 0 ? +((unitForWater * rupeesPerUnit) / totalWaterMembers).toFixed(2) : 0;

  document.getElementById("rupeesPerUnit").value = rupeesPerUnit;
  document.getElementById("unitForWater").value = unitForWater;
  document.getElementById("membersForWater").value = totalWaterMembers;
  document.getElementById("waterHead").value = waterHead;

  let totalCollected = 0;

  data.users.forEach((user, i) => {
    const unitDiff = user.new - user.old;
    const bill = Math.round(unitDiff * rupeesPerUnit + user.water * waterHead);
    document.getElementById(`bill-${i}`).innerText = bill;
    totalCollected += bill;
  });

  document.getElementById("totalUsed").value = totalUnitDiff;
  document.getElementById("extraCollected").value = totalCollected +  data.meta.extraMoney - meta.billAmount;
  document.getElementById("totalCollected").value = totalCollected + data.meta.extraMoney;

}

function updateField(index, key, value) {
  if (key === "name") {
    data.users[index][key] = value.trim();
  } else {
    const parsed = parseInt(value);
    if (!isNaN(parsed)) {
      data.users[index][key] = parsed;
    }
  }
  populateUI();
}

function toggleEdit() {
  if (!editMode) {
    const pass = prompt("Enter password:");
    if (pass !== "ADMIN") {
      alert("Wrong password");
      return;
    }
    document.getElementById("saveBtn").style.display = "inline-block";
  } else {
    document.getElementById("saveBtn").style.display = "none";
  }

  editMode = !editMode;
  populateUI();
}


async function saveData() {
  const meta = {
    month: document.getElementById("month").value,
    billAmount: +document.getElementById("billAmount").value,
    totalUnit: +document.getElementById("totalUnit").value,
    extraMoney: +document.getElementById("extraMoney").value,
  };

  try {
    const res = await fetch("/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meta, users: data.users }),
    });

    if (res.ok) {
      alert("Data saved successfully!");
    } else {
      throw new Error("Failed to save data.");
    }
  } catch (err) {
    console.error("Save error:", err);
    alert("Could not save data.");
  }
}

function downloadPDF() {
  const month = document.getElementById("month").value || "bill";

  const element = document.querySelector(".container");
  const opt = {
    margin: 0.5,
    filename: `${month}_Electricity_Bill.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  };

  html2pdf().from(element).set(opt).save();
}

fetchData();
