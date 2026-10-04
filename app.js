const STORAGE_KEYS = {
  accounts: "udh304.accounts",
  session: "udh304.session",
  bills: "udh304.bills",
  payments: "udh304.payments",
  stays: "udh304.stays",
  chart: "udh304.chart",
};

const SHARED_TYPES = ["electricity", "wifi", "water"];
const activityColors = ["coral", "mint", "blue-bg", "yellow"];
const read = (key, fallback) => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const formatMoney = (value) => Number(value || 0).toLocaleString("en-PH", { style: "currency", currency: "PHP" });
const getSession = () => localStorage.getItem(STORAGE_KEYS.session);
const getAuth = () => read("udh304.auth", null);
const getAuthToken = () => getAuth()?.accessToken || null;
const getAccounts = () => {
  const accounts = read(STORAGE_KEYS.accounts, []);
  const profile = read("udh304.profile", null);
  return accounts.length || !profile ? accounts : [profile];
};
const getBills = () => read(STORAGE_KEYS.bills, []);
const getPayments = () => read(STORAGE_KEYS.payments, []);
const getStays = () => read(STORAGE_KEYS.stays, {});

let calendarMonth = new Date();
let draftStayDates = new Set();

const modal = document.querySelector("#bill-modal");
const calendarModal = document.querySelector("#calendar-modal");
const profileModal = document.querySelector("#profile-modal");
const billForm = document.querySelector("#bill-form");
const chartForm = document.querySelector("#chart-form");
const profileForm = document.querySelector("#profile-form");
const toast = document.querySelector("#toast");
const period = document.querySelector("#period");

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2800);
}

function setModal(target, open) {
  target.hidden = !open;
  if (open) target.querySelector("input, button").focus();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>\'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function setRoleVisibility(role) {
  document.querySelectorAll(".admin-only").forEach((element) => { element.hidden = role !== "admin"; });
}

function updateDateAndGreeting() {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const profile = read("udh304.profile", null);
  const account = getAccounts().find((item) => item.username === getSession() || item.email === getSession()) || profile;
  const fullName = account?.full_name || account?.name || "";
  const firstName = fullName.split(" ")[0] || "there";
  document.querySelector("#today-label").textContent = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).toUpperCase();
  document.querySelector("#greeting").textContent = greeting;
  document.querySelector("#greeting-name").textContent = firstName;
  document.querySelector("#profile-name").textContent = fullName || "Your account";
  document.querySelector("#profile-avatar").textContent = fullName ? fullName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() : "--";
  setRoleVisibility(account?.role);
}

function updatePeriodOptions() {
  const now = new Date();
  const options = Array.from({ length: 4 }, (_, index) => new Date(now.getFullYear(), now.getMonth() - index, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" }));
  period.innerHTML = options.map((value) => `<option>${value}</option>`).join("");
  document.querySelector("#balance-period").textContent = `${period.value} · Your private payment view`;
}

function getCurrentBills() {
  return getBills().filter((bill) => bill.period === period.value);
}

function getPersonalShare(bill) {
  return Number(bill.amount || 0) / Math.max(getAccounts().filter((account) => account.role === "renter").length, 1);
}

function renderSummary() {
  const bills = getCurrentBills();
  const payments = getPayments().filter((payment) => payment.period === period.value && payment.email === getSession());
  const myTotal = bills.reduce((sum, bill) => sum + getPersonalShare(bill), 0);
  const sharedBills = bills.filter((bill) => SHARED_TYPES.includes(bill.type));
  const collected = sharedBills.reduce((sum, bill) => sum + payments.filter((payment) => payment.billId === bill.id).reduce((total, payment) => total + payment.amount, 0), 0);
  const sharedTotal = sharedBills.reduce((sum, bill) => sum + Number(bill.amount || 0), 0);
  const rent = bills.find((bill) => bill.type === "rent");
  const rentPaid = Boolean(rent && payments.some((payment) => payment.billId === rent.id));
  const collectedPercent = sharedTotal ? Math.min(100, Math.round((collected / sharedTotal) * 100)) : 0;
  document.querySelector("#my-total").textContent = formatMoney(myTotal);
  document.querySelector("#my-total-status").textContent = bills.length ? "Personal share" : "No balance yet";
  document.querySelector("#collected-total").textContent = formatMoney(collected);
  document.querySelector("#collected-progress").style.width = `${collectedPercent}%`;
  document.querySelector("#collected-percent").textContent = `${collectedPercent}% collected`;
  document.querySelector("#rent-status").textContent = rent ? (rentPaid ? "Paid" : "Due") : "Not added";
  document.querySelector("#rent-amount").textContent = rent ? formatMoney(getPersonalShare(rent)) : formatMoney(0);
  document.querySelector("#cycle-status").textContent = period.value;
  const renterCount = getAccounts().filter((account) => account.role === "renter").length;
  document.querySelector("#cycle-members").textContent = `${renterCount} renter${renterCount === 1 ? "" : "s"} · ${getAccounts().filter((account) => account.role === "admin").length} admin${getAccounts().filter((account) => account.role === "admin").length === 1 ? "" : "s"}`;
}

function renderBills() {
  const bills = getCurrentBills();
  const grid = document.querySelector("#bill-grid");
  if (!bills.length) {
    grid.innerHTML = '<div class="empty-state">No bills added for this period. An admin can add the first one.</div>';
    return;
  }
  grid.innerHTML = bills.map((bill) => {
    const paid = getPayments().some((payment) => payment.billId === bill.id && payment.email === getSession());
    return `<article class="bill-card"><div><span class="bill-type">${escapeHtml(bill.type)}</span><h3>${escapeHtml(bill.name)}</h3><p>${escapeHtml(bill.splitLabel)} · Started ${escapeHtml(bill.started || "not set")} · Due ${escapeHtml(bill.due || "not set")}</p></div><strong>${formatMoney(bill.amount)}</strong><button class="small-button ${paid ? "paid-button" : ""}" data-pay-bill="${bill.id}" ${paid ? "disabled" : ""}>${paid ? "Paid" : `Pay my ${formatMoney(getPersonalShare(bill))}`}</button></article>`;
  }).join("");
  grid.querySelectorAll("[data-pay-bill]").forEach((button) => button.addEventListener("click", () => recordPayment(button.dataset.payBill)));
}

function renderPersonalBreakdown() {
  const bills = getCurrentBills();
  const breakdown = document.querySelector("#personal-breakdown");
  if (!bills.length) {
    breakdown.innerHTML = '<div class="empty-state">Add bills to see your personal breakdown.</div>';
    return;
  }
  breakdown.innerHTML = `<div class="breakdown-row breakdown-head"><span>Bill</span><span>My share</span><span>Status</span></div>${bills.map((bill) => {
    const paid = getPayments().some((payment) => payment.billId === bill.id && payment.email === getSession());
    return `<div class="breakdown-row"><span>${escapeHtml(bill.name)}<small>${escapeHtml(bill.type)} · Due ${escapeHtml(bill.due || "not set")}</small></span><strong>${formatMoney(getPersonalShare(bill))}</strong><span class="pill ${paid ? "paid" : "pending"}">${paid ? "Paid" : "Pending"}</span></div>`;
  }).join("")}`;
  const selectedDays = getStays()[getSession()]?.[period.value] || [];
  document.querySelector("#stay-summary").textContent = selectedDays.length ? `${selectedDays.length} stay day${selectedDays.length === 1 ? "" : "s"} selected` : "No stay dates selected";
}

function renderMembers() {
  const list = document.querySelector("#member-list");
  if (!list) return;
  const accounts = getAccounts();
  list.innerHTML = accounts.length ? accounts.map((account) => `<div class="member-row"><span>${escapeHtml(account.full_name || account.name)}<small>${escapeHtml(account.email)}</small></span><span class="pill ${account.role === "admin" ? "paid" : "pending"}">${account.role}</span></div>`).join("") : '<div class="empty-state">No members connected yet.</div>';
}

function renderActivity() {
  const activity = read("udh304.activity", []);
  const list = document.querySelector("#activity-list");
  list.innerHTML = activity.length ? activity.slice(0, 6).map((item) => `<div class="activity-item"><div class="activity-avatar ${item.color}">${escapeHtml(item.initials)}</div><div class="activity-copy"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.detail)}</span></div><b>${escapeHtml(item.amount)}</b></div>`).join("") : '<div class="empty-state">No activity recorded yet.</div>';
}

function renderChart() {
  const quarter = document.querySelector("#quarter-select").value;
  const values = read(STORAGE_KEYS.chart, {})[quarter] || [];
  const bars = document.querySelector("#quarter-bars");
  if (!values.length) {
    bars.innerHTML = '<div class="empty-state chart-empty">No monthly values entered for this quarter.</div>';
    return;
  }
  const maxValue = Math.max(...values.map((item) => item.total), 1);
  bars.innerHTML = values.map((item) => `<div class="bar-group"><div class="bar-pair"><div class="bar electricity" style="height:${Math.max(8, (item.total / maxValue) * 100)}%"><span>${formatMoney(item.total)}</span></div><div class="bar water" style="height:${Math.max(8, (item.share / maxValue) * 100)}%"><span>${formatMoney(item.share)}</span></div></div><small>${escapeHtml(item.month)}</small></div>`).join("");
}

function renderCalendar() {
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  document.querySelector("#calendar-month").textContent = calendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const grid = document.querySelector("#calendar-grid");
  grid.innerHTML = Array.from({ length: firstDay + daysInMonth }, (_, index) => {
    if (index < firstDay) return "<span></span>";
    const day = index - firstDay + 1;
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return `<button type="button" class="calendar-day ${draftStayDates.has(key) ? "selected" : ""}" data-date="${key}">${day}</button>`;
  }).join("");
  grid.querySelectorAll("[data-date]").forEach((button) => button.addEventListener("click", () => {
    if (draftStayDates.has(button.dataset.date)) draftStayDates.delete(button.dataset.date); else draftStayDates.add(button.dataset.date);
    button.classList.toggle("selected");
  }));
}

function recordPayment(billId) {
  const bill = getBills().find((item) => item.id === billId);
  const payments = getPayments();
  if (!bill || payments.some((payment) => payment.billId === billId && payment.email === getSession())) return;
  payments.push({ billId, email: getSession(), amount: getPersonalShare(bill), period: period.value, createdAt: new Date().toISOString() });
  write(STORAGE_KEYS.payments, payments);
  const account = getAccounts().find((item) => item.username === getSession() || item.email === getSession());
  const accountName = account?.full_name || account?.name || "A housemate";
  const activity = read("udh304.activity", []);
  activity.unshift({ initials: accountName.split(" ").map((part) => part[0]).join("").slice(0, 2), title: `${accountName} marked a payment`, detail: `${bill.type} · Just now`, amount: formatMoney(getPersonalShare(bill)), color: activityColors[activity.length % activityColors.length] });
  write("udh304.activity", activity);
  renderAll();
  showToast("Payment marked as paid");
}

function renderAll() {
  updateDateAndGreeting();
  renderSummary();
  renderBills();
  renderPersonalBreakdown();
  renderMembers();
  renderActivity();
  renderChart();
}

function showAuthError(message) {
  document.querySelector("#auth-error").textContent = message;
}

// Sign in through the backend and keep only the returned session tokens in the browser.
async function handleAuth(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const username = String(data.get("username") || "").trim().toLowerCase();
  const password = String(data.get("password") || "");
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to sign in.");

    // Load the profile with the new bearer token so the dashboard knows the user's role and name.
    const profileResponse = await fetch("/api/me", { headers: { Authorization: `Bearer ${result.accessToken}` } });
    const profileResult = await profileResponse.json();
    if (!profileResponse.ok) throw new Error(profileResult.error || "Unable to load your profile.");
    write("udh304.auth", { accessToken: result.accessToken, refreshToken: result.refreshToken, username: result.username });
    write("udh304.profile", profileResult.profile);
    localStorage.setItem(STORAGE_KEYS.session, result.username);
    document.querySelector("#auth-shell").hidden = true;
    document.querySelector(".app-shell").classList.add("authenticated");
    renderAll();
  } catch (error) {
    showAuthError(error.message);
  }
}

document.querySelector("#auth-form").addEventListener("submit", handleAuth);
document.querySelector("#logout").addEventListener("click", () => { localStorage.removeItem(STORAGE_KEYS.session); localStorage.removeItem("udh304.auth"); localStorage.removeItem("udh304.profile"); window.location.reload(); });
document.querySelector("#edit-profile").addEventListener("click", () => {
  profileForm.elements.fullName.value = read("udh304.profile", null)?.full_name || "";
  setModal(profileModal, true);
});
document.querySelector("#close-profile-modal").addEventListener("click", () => setModal(profileModal, false));
profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAuthToken()}` },
      body: JSON.stringify({ fullName: new FormData(profileForm).get("fullName") }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to update your name.");
    write("udh304.profile", result.profile);
    setModal(profileModal, false);
    renderAll();
    showToast("Name updated");
  } catch (error) {
    showToast(error.message);
  }
});
document.querySelector("#open-bill-modal").addEventListener("click", () => setModal(modal, true));
document.querySelector("#close-bill-modal").addEventListener("click", () => setModal(modal, false));
document.querySelector("#open-calendar-modal").addEventListener("click", () => { draftStayDates = new Set(getStays()[getSession()]?.[period.value] || []); renderCalendar(); setModal(calendarModal, true); });
document.querySelector("#open-calendar-link").addEventListener("click", () => { draftStayDates = new Set(getStays()[getSession()]?.[period.value] || []); renderCalendar(); setModal(calendarModal, true); });
document.querySelector("#close-calendar-modal").addEventListener("click", () => setModal(calendarModal, false));
document.querySelectorAll(".modal-backdrop").forEach((backdrop) => backdrop.addEventListener("click", (event) => { if (event.target === backdrop) setModal(backdrop, false); }));
document.querySelector("#previous-month").addEventListener("click", () => { calendarMonth.setMonth(calendarMonth.getMonth() - 1); renderCalendar(); });
document.querySelector("#next-month").addEventListener("click", () => { calendarMonth.setMonth(calendarMonth.getMonth() + 1); renderCalendar(); });
document.querySelector("#save-stay-dates").addEventListener("click", () => { const stays = getStays(); stays[getSession()] ||= {}; stays[getSession()][period.value] = [...draftStayDates].sort(); write(STORAGE_KEYS.stays, stays); setModal(calendarModal, false); renderPersonalBreakdown(); showToast("Stay dates saved"); });
document.querySelector("#quarter-select").addEventListener("change", renderChart);
chartForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(chartForm);
  const chartValues = read(STORAGE_KEYS.chart, {});
  const quarter = document.querySelector("#quarter-select").value;
  chartValues[quarter] ||= [];
  chartValues[quarter] = chartValues[quarter].filter((item) => item.month.toLowerCase() !== data.get("month").trim().toLowerCase());
  chartValues[quarter].push({ month: data.get("month").trim(), total: Number(data.get("total")), share: Number(data.get("share")) });
  write(STORAGE_KEYS.chart, chartValues);
  chartForm.reset();
  renderChart();
  showToast(`${data.get("month")} added to ${quarter}`);
});
document.querySelector("#theme-toggle").addEventListener("click", () => { document.body.classList.toggle("dark"); localStorage.setItem("udh304.dark", document.body.classList.contains("dark")); });
document.querySelector("#view-report").addEventListener("click", () => showToast("Monthly chart values can be connected to bill entries next."));
document.querySelector("#view-activity").addEventListener("click", () => showToast("All activity is shown for this account."));
period.addEventListener("change", () => { document.querySelector("#balance-period").textContent = `${period.value} · Your private payment view`; renderAll(); });

billForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(billForm);
  const type = data.get("type");
  const bills = getBills();
  if (bills.some((bill) => bill.period === period.value && bill.type === type)) return showToast(`A ${type} bill already exists for ${period.value}.`);
  bills.push({ id: crypto.randomUUID(), type, name: data.get("name").trim(), amount: Number(data.get("amount")), splitLabel: data.get("split"), started: data.get("started"), due: data.get("due"), notes: data.get("notes").trim(), period: period.value });
  write(STORAGE_KEYS.bills, bills);
  billForm.reset();
  setModal(modal, false);
  renderAll();
  showToast(`${type} bill added`);
});

if (localStorage.getItem("udh304.dark") === "true") document.body.classList.add("dark");
updatePeriodOptions();
const isAuthenticated = Boolean(getAuthToken());
document.querySelector("#auth-shell").hidden = isAuthenticated;
if (isAuthenticated) { document.querySelector(".app-shell").classList.add("authenticated"); renderAll(); }
window.setInterval(updateDateAndGreeting, 60000);
