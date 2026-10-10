"use strict";

const STORAGE_KEY = "campusTrackAttendance_v1";
const THEME_KEY = "campusTrackTheme_v1";

const sampleStudents = [
  { id: "s001", name: "Ayesha Khan", roll: "CS-001" },
  { id: "s002", name: "Hamza Ali", roll: "CS-002" },
  { id: "s003", name: "Fatima Noor", roll: "CS-003" },
  { id: "s004", name: "Ahmed Raza", roll: "CS-004" },
  { id: "s005", name: "Zainab Shah", roll: "CS-005" },
  { id: "s006", name: "Usman Tariq", roll: "CS-006" },
  { id: "s007", name: "Hira Malik", roll: "CS-007" },
  { id: "s008", name: "Bilal Ahmed", roll: "CS-008" },
  { id: "s009", name: "Maryam Iqbal", roll: "CS-009" },
  { id: "s010", name: "Saad Hussain", roll: "CS-010" }
];

const $ = selector => document.querySelector(selector);

function getToday() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);

      if (Array.isArray(data.students) &&
          data.attendance &&
          typeof data.attendance === "object") {
        return data;
      }
    }
  } catch (error) {
    console.error("Could not load saved data:", error);
  }

  return {
    students: sampleStudents.map(student => ({ ...student })),
    attendance: {}
  };
}

let state = loadData();
let selectedDate = getToday();
let searchTerm = "";

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error("Could not save data:", error);
    notify("Storage error", "Browser could not save your data.", true);
    return false;
  }
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function initials(name) {
  return name.trim().split(/\s+/)
    .slice(0, 2)
    .map(part => part[0])
    .join("")
    .toUpperCase();
}

function formatDate(dateString) {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function getStatus(studentId, date = selectedDate) {
  return state.attendance[date]?.[studentId] || "";
}

function getStudentStats(studentId) {
  let present = 0;
  let marked = 0;

  Object.values(state.attendance).forEach(day => {
    if (!day) return;

    if (day[studentId] === "present" ||
        day[studentId] === "absent") {
      marked++;
      if (day[studentId] === "present") present++;
    }
  });

  return {
    present,
    marked,
    percentage: marked ? Math.round(present / marked * 100) : 0
  };
}

function getDailyStats() {
  const records = state.attendance[selectedDate] || {};
  let present = 0;
  let absent = 0;

  state.students.forEach(student => {
    if (records[student.id] === "present") present++;
    if (records[student.id] === "absent") absent++;
  });

  const marked = present + absent;

  return {
    present,
    absent,
    marked,
    unmarked: state.students.length - marked,
    percentage: marked ? Math.round(present / marked * 100) : 0
  };
}

function notify(title, message, isError = false) {
  const toast = document.createElement("div");
  toast.className = `toast${isError ? " error" : ""}`;

  const heading = document.createElement("strong");
  heading.textContent = title;

  const detail = document.createElement("p");
  detail.textContent = message;

  toast.append(heading, detail);
  $("#toastRegion").appendChild(toast);

  setTimeout(() => toast.remove(), 3500);
}

function render() {
  const stats = getDailyStats();

  $("#totalStudents").textContent = state.students.length;
  $("#presentCount").textContent = stats.present;
  $("#absentCount").textContent = stats.absent;
  $("#attendanceRate").textContent = stats.percentage + "%";

  $("#reportRate").textContent = stats.percentage + "%";
  $("#donutText").textContent = stats.percentage + "%";
  $("#reportPresent").textContent = stats.present;
  $("#reportAbsent").textContent = stats.absent;
  $("#reportUnmarked").textContent = stats.unmarked;

  $("#donut").style.background =
    `conic-gradient(var(--primary) ${stats.percentage}%, var(--line) ${stats.percentage}%)`;

  $("#attendanceSummary").textContent = stats.marked
    ? `${stats.marked} of ${state.students.length} students marked for ${formatDate(selectedDate)}.`
    : "No attendance marked for this date yet.";

  renderTable();
  renderDirectory();
}

function renderTable() {
  const students = state.students.filter(student =>
    `${student.name} ${student.roll}`
      .toLowerCase()
      .includes(searchTerm.trim().toLowerCase())
  );

  $("#resultCount").textContent =
    `${students.length} student${students.length === 1 ? "" : "s"}`;

  $("#emptyState").classList.toggle("hidden", students.length !== 0);

  $("#studentTable").innerHTML = students.map(student => {
    const status = getStatus(student.id);
    const stats = getStudentStats(student.id);
    const statusClass = status || "unmarked";
    const statusText = status
      ? status.charAt(0).toUpperCase() + status.slice(1)
      : "Not marked";

    return `
      <tr>
        <td>
          <div class="student-cell">
            <div class="avatar">${escapeHTML(initials(student.name))}</div>
            <span class="student-name">${escapeHTML(student.name)}</span>
          </div>
        </td>
        <td><span class="roll">${escapeHTML(student.roll)}</span></td>
        <td><span class="status ${statusClass}">${statusText}</span></td>
        <td>
          <div class="progress-cell">
            <div class="progress-label">
              <span>Overall</span><strong>${stats.percentage}%</strong>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width:${stats.percentage}%"></div>
            </div>
          </div>
        </td>
        <td>
          <div class="actions">
            <button class="mark-btn present ${status === "present" ? "selected" : ""}"
              data-action="mark" data-status="present" data-id="${escapeHTML(student.id)}"
              aria-label="Mark ${escapeHTML(student.name)} present" title="Present">P</button>
            <button class="mark-btn absent ${status === "absent" ? "selected" : ""}"
              data-action="mark" data-status="absent" data-id="${escapeHTML(student.id)}"
              aria-label="Mark ${escapeHTML(student.name)} absent" title="Absent">A</button>
            <button class="delete-btn" data-action="delete" data-id="${escapeHTML(student.id)}"
              aria-label="Delete ${escapeHTML(student.name)}" title="Delete student">×</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function renderDirectory() {
  const students = [...state.students]
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 5);

  if (students.length === 0) {
    $("#studentDirectory").innerHTML =
      '<p class="muted">No students yet. Add a student to begin.</p>';
    return;
  }

  $("#studentDirectory").innerHTML = students.map(student => {
    const stats = getStudentStats(student.id);

    return `
      <div class="directory-row">
        <div class="avatar">${escapeHTML(initials(student.name))}</div>
        <div class="directory-info">
          <strong>${escapeHTML(student.name)}</strong>
          <small>${escapeHTML(student.roll)}</small>
        </div>
        <span class="directory-rate">${stats.percentage}%</span>
      </div>
    `;
  }).join("");
}

function markStudent(id, status) {
  if (!state.students.some(student => student.id === id)) return;

  if (!state.attendance[selectedDate]) {
    state.attendance[selectedDate] = {};
  }

  const records = state.attendance[selectedDate];

  // Clicking the same button again clears that mark.
  if (records[id] === status) {
    delete records[id];
  } else {
    records[id] = status;
  }

  saveData();
  render();
}

function deleteStudent(id) {
  const student = state.students.find(item => item.id === id);
  if (!student) return;

  const confirmed = confirm(
    `Delete ${student.name} (${student.roll})?\n\n` +
    "Their attendance history will also be deleted."
  );

  if (!confirmed) return;

  state.students = state.students.filter(item => item.id !== id);

  Object.values(state.attendance).forEach(day => {
    if (day) delete day[id];
  });

  saveData();
  render();
  notify("Student deleted", `${student.name} was removed.`);
}

function openModal() {
  $("#studentModal").classList.remove("hidden");
  $("#studentName").focus();
}

function closeModal() {
  $("#studentModal").classList.add("hidden");
  $("#studentForm").reset();
}

function addStudent(event) {
  event.preventDefault();

  const name = $("#studentName").value.trim().replace(/\s+/g, " ");
  const roll = $("#studentRoll").value.trim().toUpperCase();

  if (!name || !roll) {
    notify("Missing information", "Enter the student's name and roll number.", true);
    return;
  }

  const duplicate = state.students.some(student =>
    student.roll.toLowerCase() === roll.toLowerCase()
  );

  if (duplicate) {
    notify("Duplicate roll number", "Please enter a unique roll number.", true);
    $("#studentRoll").focus();
    return;
  }

  state.students.push({
    id: "s_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
    name,
    roll
  });

  saveData();
  closeModal();
  render();
  notify("Student added", `${name} was added successfully.`);
}

function markAllPresent() {
  if (state.students.length === 0) {
    notify("No students", "Add students before marking attendance.", true);
    return;
  }

  const confirmed = confirm(
    `Mark all ${state.students.length} students PRESENT on ${formatDate(selectedDate)}?\n\n` +
    "Existing marks for this date will be overwritten."
  );

  if (!confirmed) return;

  if (!state.attendance[selectedDate]) {
    state.attendance[selectedDate] = {};
  }

  state.students.forEach(student => {
    state.attendance[selectedDate][student.id] = "present";
  });

  saveData();
  render();
  notify("Attendance updated", "All students marked present.");
}

function saveAttendance() {
  const saved = saveData();
  render();

  if (saved) {
    notify("Attendance saved", `Records saved for ${formatDate(selectedDate)}.`);
  }
}

function downloadReport() {
  const records = state.attendance[selectedDate] || {};

  const rows = [
    ["Date", "Student Name", "Roll Number", "Status", "Overall Attendance Percentage"]
  ];

  state.students.forEach(student => {
    const status = records[student.id] || "Not marked";
    const stats = getStudentStats(student.id);

    rows.push([
      selectedDate,
      student.name,
      student.roll,
      status,
      stats.percentage + "%"
    ]);
  });

  const csv = rows.map(row =>
    row.map(value => {
      // Prevent spreadsheet formula injection in exported text.
      let text = String(value);
      if (/^[=+\-@\t\r]/.test(text) &&
          !/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        text = "'" + text;
      }
      return '"' + text.replace(/"/g, '""') + '"';
    }).join(",")
  ).join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `attendance-report-${selectedDate}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  notify("Report downloaded", "Your CSV report is ready.");
}

function setTheme(theme) {
  const dark = theme === "dark";

  document.body.classList.toggle("dark", dark);
  $("#themeBtn").textContent = dark ? "☀" : "☾";
  $("#themeBtn").title = dark ? "Switch to light mode" : "Switch to dark mode";
  $("#themeBtn").setAttribute(
    "aria-label",
    dark ? "Switch to light mode" : "Switch to dark mode"
  );

  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (error) {
    console.warn("Could not save theme preference:", error);
  }
}

function bindEvents() {
  $("#attendanceDate").value = selectedDate;

  $("#attendanceDate").addEventListener("change", event => {
    if (!event.target.value) {
      event.target.value = selectedDate;
      return;
    }

    selectedDate = event.target.value;
    render();
  });

  $("#searchInput").addEventListener("input", event => {
    searchTerm = event.target.value;
    renderTable();
  });

  $("#studentTable").addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    if (button.dataset.action === "mark") {
      markStudent(button.dataset.id, button.dataset.status);
    } else if (button.dataset.action === "delete") {
      deleteStudent(button.dataset.id);
    }
  });

  $("#markAllBtn").addEventListener("click", markAllPresent);
  $("#saveBtn").addEventListener("click", saveAttendance);
  $("#downloadBtn").addEventListener("click", downloadReport);

  $("#addStudentBtn").addEventListener("click", openModal);
  $("#closeModal").addEventListener("click", closeModal);
  $("#cancelModal").addEventListener("click", closeModal);
  $("#studentForm").addEventListener("submit", addStudent);

  $("#studentModal").addEventListener("click", event => {
    if (event.target === $("#studentModal")) closeModal();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeModal();
  });

  $("#themeBtn").addEventListener("click", () => {
    const next = document.body.classList.contains("dark") ? "light" : "dark";
    setTheme(next);
    render();
  });

  $("#menuBtn").addEventListener("click", () => {
    $("#sidebar").classList.toggle("open");
  });

  document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
      document.querySelectorAll(".nav-link").forEach(item =>
        item.classList.remove("active")
      );
      link.classList.add("active");
      $("#sidebar").classList.remove("open");
    });
  });
}

$("#year").textContent = new Date().getFullYear();

let savedTheme = "light";
try {
  savedTheme = localStorage.getItem(THEME_KEY) || "light";
} catch (error) {
  console.warn("Could not read theme preference:", error);
}

setTheme(savedTheme);
bindEvents();
render();