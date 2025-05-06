let editMode = false;
let data = {};

const urlParams = new URLSearchParams(window.location.search);
const monthParam = urlParams.get("month");
const isNew = urlParams.get("new") === "true";



async function fetchData() {
  if (isNew) {
    try {
      // Try to fetch last month's data
      const res = await fetch(`/latest`);
      if (!res.ok) throw new Error("No latest data");
      const lastMonth = await res.json();

      // Prepare new month's data from last month
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
        // ✅ Add this:
  editMode = true;
  document.getElementById("saveBtn").style.display = "inline-block";
  document.getElementById("calculateBtn").style.display = "inline-block";
  document.getElementById("editBtn").innerText = "Cancel Edit";
  document.getElementById("download").style.display = "none";

    } catch (err) {
      // Fallback to default names if last month is not available
      const defaultNames = ["SHUBHAM", "KUNAL", "RUPAM", "SABIR", "SAMIR", "SUDIP", "ANGSHU"];
      data = {
        meta: {
          month: monthParam,
          billAmount: 0,
          totalUnit: 0,
          extraMoney: 0,
        },
        users: defaultNames.map(name => ({
          name,
          new: 0,
          old: 0,
          water: 0
        }))
      };
    }

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

document.addEventListener("keydown", function (event) {
  if (editMode && event.key === "Enter") {
    event.preventDefault(); // prevent default form submission or input jumping
    document.getElementById("calculateBtn")?.click();
  }
});




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
      <td class="yellow-name"><input class="yellow-names" value="${user.name}" ${!editMode ? "disabled" : ""} onchange="updateField(${i}, 'name', this.value)" /></td>
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
    document.getElementById(`bill-${i}`).innerText = `₹ ${bill}`;
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

async function toggleEdit() {
  const editBtn = document.getElementById("editBtn");

  if (!editMode) {
    const pass = prompt("Enter password:");
    if (pass !== "ADMIN") {
      alert("Wrong password");
      return;
    }

    editMode = true;
    document.getElementById("saveBtn").style.display = "inline-block";
    document.getElementById("calculateBtn").style.display = "inline-block";  // 👈 Show calculate button
    editBtn.innerText = "Cancel Edit";
    document.getElementById("download").style.display = "none";
    populateUI();
  } else {
    editMode = false;
    document.getElementById("saveBtn").style.display = "none";
    document.getElementById("calculateBtn").style.display = "none";  // 👈 Hide calculate button
    editBtn.innerText = "Edit";
    await fetchData(); // Reload original data
  }
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

  // Clone the element
  const element = document.querySelector(".container").cloneNode(true);
  element.style.height = "10.3in"; // Limit to roughly 1 A4 page height
  element.style.overflow = "hidden";

  // Create a hidden wrapper to render the clone
  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.top = "-9999px";
  wrapper.appendChild(element);
  document.body.appendChild(wrapper);

  const opt = {
    margin: 0.5,
    filename: `${month}_Electricity_Bill.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, scrollY: 0 },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  };

  html2pdf().set(opt).from(element).save().then(() => {
    document.body.removeChild(wrapper); // Clean up
  });
}


fetchData();
