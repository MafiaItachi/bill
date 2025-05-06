let editMode = false;
let data = {};

const urlParams = new URLSearchParams(window.location.search);
const monthParam = urlParams.get("month");
const isNew = urlParams.get("new") === "true";

async function fetchData() {
  if (isNew) {
    try {
      const res = await fetch(`/latest`);
      if (!res.ok) throw new Error("No latest data");
      const lastMonth = await res.json();

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

    } catch (err) {
      const defaultNames = ["SHUBHAM", "KUNAL", "RUPAM", "SABIR", "AAKASH","SAMIR", "SUDIP", "ANGSHU"];
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
    toggleUIForEdit(true);
    populateUI();
    return;
  }

  const res = await fetch(`/data?month=${monthParam}`);
  if (!res.ok) {
    alert("Month not found!");
    return;
  }
  data = await res.json();
  populateUI();
}

function toggleUIForEdit(enable) {
  editMode = enable;
  document.getElementById("saveBtn").style.display = enable ? "inline-block" : "none";
  document.getElementById("calculateBtn").style.display = enable ? "inline-block" : "none";
  document.getElementById("editBtn").innerText = enable ? "Cancel Edit" : "Edit";
  document.getElementById("download").style.display = enable ? "none" : "inline-block";
}

function populateUI() {
  const meta = data.meta;
  const metaFields = ["month", "billAmount", "totalUnit", "extraMoney"];
  metaFields.forEach(id => {
    const el = document.getElementById(id);
    if (!editMode) {
      el.value = meta[id];
    }
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
      <td class="yellow-name">
        <input class="yellow-names" value="${user.name}" ${!editMode ? "disabled" : ""} onchange="updateField(${i}, 'name', this.value)" />
      </td>
      <td><input type="number" value="${user.water}" ${!editMode ? "disabled" : ""} onchange="updateField(${i}, 'water', this.value)" /></td>
      <td><input type="number" value="${user.new}" ${!editMode ? "disabled" : ""} onchange="updateField(${i}, 'new', this.value)" /></td>
      <td><input type="number" value="${user.old}" ${!editMode ? "disabled" : ""} onchange="updateField(${i}, 'old', this.value)" /></td>
      <td>${unitDiff}</td>
      <td id="bill-${i}" class="yellow-inputs"></td>
    `;
    tableBody.appendChild(row);
  });

  const liveBillAmount = +document.getElementById("billAmount").value || 0;
  const liveExtraMoney = +document.getElementById("extraMoney").value || 0;
  const liveTotalUnit = +document.getElementById("totalUnit").value || 0;
  
  const rupeesPerUnit = +((liveBillAmount - liveExtraMoney) / liveTotalUnit || 0).toFixed(1);
  const unitForWater = liveTotalUnit - totalUnitDiff;
  
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
  document.getElementById("extraCollected").value = totalCollected + meta.extraMoney - meta.billAmount;
  document.getElementById("totalCollected").value = totalCollected + meta.extraMoney;
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
  // Just update the table and calculations — don’t overwrite meta
  populateUI();
}

async function toggleEdit() {
  if (!editMode) {
    const pass = prompt("Enter password:");
    if (pass !== "ADMIN") {
      alert("Wrong password");
      return;
    }
    toggleUIForEdit(true);
    populateUI();
  } else {
    toggleUIForEdit(false);
    await fetchData(); // Re-fetch to discard changes
  }
}

async function saveData() {
  const meta = {
    month: document.getElementById("month").value,
    billAmount: +document.getElementById("billAmount").value,
    totalUnit: +document.getElementById("totalUnit").value,
    extraMoney: +document.getElementById("extraMoney").value,
    timestamp: Date.now() // <-- Add timestamp in milliseconds
  };

  try {
    const res = await fetch("/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meta, users: data.users }),
    });

    if (res.ok) {
      alert("Data saved successfully!");

      disableEditMode();

      // Remove ?new=true from URL without reloading
      const url = new URL(window.location);
      url.searchParams.delete("new");
      window.history.replaceState({}, document.title, url.toString());

      // Reload page
      window.location.reload();
    } else {
      throw new Error("Failed to save data.");
    }
  } catch (err) {
    console.error("Save error:", err);
    alert("Could not save data.");
  }
}

function disableEditMode() {
  // Disable all input elements
  const inputs = document.querySelectorAll("input, textarea, select");
  inputs.forEach(input => input.disabled = true);

  // Hide save button
  const saveBtn = document.getElementById("saveBtn");
  if (saveBtn) saveBtn.style.display = "none";

  // Show edit button
  const editBtn = document.getElementById("editBtn");
  if (editBtn) editBtn.style.display = "inline-block";

  // Optional: remove edit-mode class if you're using one
  const editableContainer = document.getElementById("editableContainer");
  if (editableContainer) editableContainer.classList.remove("edit-mode");
}


function downloadPDF() {
  const month = document.getElementById("month").value || "bill";

  const element = document.querySelector(".container").cloneNode(true);
  element.style.height = "10.3in";
  element.style.overflow = "hidden";

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
    document.body.removeChild(wrapper);
  });
}

// Initial call
fetchData();
