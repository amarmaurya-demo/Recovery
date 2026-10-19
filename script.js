(() => {
  "use strict";

  const STORAGE_KEY = "my-calendar-marks-v1";
  const $ = (id) => document.getElementById(id);
  const grid = $("calendarGrid");
  const monthLabel = $("monthLabel");
  const selectedDateLabel = $("selectedDateLabel");
  const noteInput = $("noteInput");
  const removeBtn = $("removeBtn");
  const statusMessage = $("statusMessage");
  const markedList = $("markedList");
  const markCount = $("markCount");
  const monthTotalLabel = $("monthTotalLabel");
  const monthTotal = $("monthTotal");
  const allTimeTotal = $("allTimeTotal");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth();
  let selectedKey = toKey(today);
  let marks = loadMarks();

  function toKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function fromKey(key) {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function loadMarks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
      console.error("Could not load saved calendar marks:", error);
      return {};
    }
  }

  function persistMarks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(marks));
      return true;
    } catch (error) {
      console.error("Could not save calendar marks:", error);
      statusMessage.textContent = "Could not save. Browser storage may be disabled or full.";
      statusMessage.style.color = "var(--danger)";
      return false;
    }
  }

  function formatDate(date, options = { weekday: "long", year: "numeric", month: "long", day: "numeric" }) {
    return new Intl.DateTimeFormat(undefined, options).format(date);
  }

  function renderCalendar() {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    monthLabel.textContent = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(viewYear, viewMonth, 1));
    grid.replaceChildren();

    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement("div");
      empty.className = "day empty";
      empty.setAttribute("aria-hidden", "true");
      grid.append(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(viewYear, viewMonth, day);
      const key = toKey(date);
      const mark = marks[key];
      const button = document.createElement("button");
      button.type = "button";
      button.className = "day";
      if (key === toKey(today)) button.classList.add("today");
      if (mark) button.classList.add("marked");
      if (key === selectedKey) button.classList.add("selected");
      button.setAttribute("aria-label", `${formatDate(date)}${mark ? `, marked${mark.note ? ": " + mark.note : ""}` : ""}`);
      if (key === selectedKey) button.setAttribute("aria-pressed", "true");
      else button.setAttribute("aria-pressed", "false");

      const number = document.createElement("span");
      number.className = "number";
      number.textContent = day;
      button.append(number);

      if (mark && mark.note) {
        const preview = document.createElement("span");
        preview.className = "note-preview";
        preview.textContent = mark.note;
        button.append(preview);
      }
      button.addEventListener("click", () => selectDate(key));
      grid.append(button);
    }
  }

  function selectDate(key) {
    selectedKey = key;
    const date = fromKey(key);
    viewYear = date.getFullYear();
    viewMonth = date.getMonth();
    selectedDateLabel.textContent = formatDate(date);
    noteInput.value = marks[key]?.note || "";
    removeBtn.hidden = !marks[key];
    statusMessage.textContent = "";
    statusMessage.style.color = "";
    renderCalendar();
  }

  function getValidMarkKeys() {
    return Object.keys(marks)
      .filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key) && marks[key] && typeof marks[key] === "object")
      .sort((a, b) => a.localeCompare(b));
  }

  function renderStats() {
    const keys = getValidMarkKeys();
    const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-`;
    const thisMonthCount = keys.filter(key => key.startsWith(monthPrefix)).length;
    monthTotalLabel.textContent = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(viewYear, viewMonth, 1));
    monthTotal.textContent = String(thisMonthCount);
    allTimeTotal.textContent = String(keys.length);
  }

  function renderMarkedList() {
    const keys = getValidMarkKeys();
    markedList.replaceChildren();

    if (!keys.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "No dates marked yet. Select a date above to add your first mark.";
      markedList.append(empty);
      return;
    }

    keys.forEach(key => {
      const item = document.createElement("div");
      item.className = "marked-item";
      const info = document.createElement("div");
      const date = document.createElement("div");
      date.className = "marked-date";
      date.textContent = formatDate(fromKey(key), { year: "numeric", month: "short", day: "numeric", weekday: "short" });
      info.append(date);
      const note = document.createElement("div");
      note.className = "marked-note";
      note.textContent = marks[key].note || "Marked date";
      info.append(note);
      const open = document.createElement("button");
      open.type = "button";
      open.textContent = "Open";
      open.addEventListener("click", () => {
        selectDate(key);
        $("markForm").scrollIntoView({ behavior: "smooth", block: "center" });
      });
      item.append(info, open);
      markedList.append(item);
    });
  }

  $("markForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const note = noteInput.value.trim();
    marks[selectedKey] = { note, updatedAt: new Date().toISOString() };
    if (persistMarks()) {
      removeBtn.hidden = false;
      statusMessage.style.color = "";
      statusMessage.textContent = "Date saved. It will still be here when you reopen this browser.";
      renderCalendar();
      renderStats();
      renderMarkedList();
    }
  });

  removeBtn.addEventListener("click", () => {
    if (!marks[selectedKey]) return;
    delete marks[selectedKey];
    if (persistMarks()) {
      noteInput.value = "";
      removeBtn.hidden = true;
      statusMessage.style.color = "";
      statusMessage.textContent = "Mark removed.";
      renderCalendar();
      renderStats();
      renderMarkedList();
    }
  });

  $("prevBtn").addEventListener("click", () => {
    const date = new Date(viewYear, viewMonth - 1, 1);
    viewYear = date.getFullYear();
    viewMonth = date.getMonth();
    renderCalendar();
    renderStats();
  });

  $("nextBtn").addEventListener("click", () => {
    const date = new Date(viewYear, viewMonth + 1, 1);
    viewYear = date.getFullYear();
    viewMonth = date.getMonth();
    renderCalendar();
    renderStats();
  });

  $("todayBtn").addEventListener("click", () => {
    selectDate(toKey(today));
  });

  $("exportBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), marks }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "my-calendar-backup.json";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    statusMessage.textContent = "Backup exported.";
  });

  selectDate(selectedKey);
  renderStats();
  renderMarkedList();
})();
