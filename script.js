const STORAGE_KEY = "mini-app-reminders";
const THEME_KEY = "mini-app-theme";

function loadReminders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      id: item.id ?? crypto.randomUUID?.() ?? String(Date.now()),
      title: String(item.title ?? "").slice(0, 200),
      datetime: item.datetime ?? null,
      completed: Boolean(item.completed),
    }));
  } catch {
    return [];
  }
}

function saveReminders(reminders) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
}

function formatDateTime(value) {
  if (!value) return "Без даты";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Некорректная дата";

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTimeBadge(datetime) {
  if (!datetime) return { text: "Без даты", type: "future" };
  const target = new Date(datetime);
  if (Number.isNaN(target.getTime())) return { text: "Некорректная дата", type: "future" };

  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / (60 * 1000));

  if (diffMinutes < 0) {
    return { text: "Просрочено", type: "overdue" };
  }
  if (diffMinutes <= 60) {
    return { text: "В течение часа", type: "soon" };
  }
  if (diffMinutes <= 24 * 60) {
    return { text: "Сегодня", type: "future" };
  }
  return { text: "Позже", type: "future" };
}

function createReminderElement(reminder, { onToggle, onDelete }) {
  const li = document.createElement("li");
  li.className = "reminder";
  li.dataset.id = reminder.id;

  if (reminder.completed) {
    li.classList.add("reminder--completed");
  }

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "reminder__toggle";
  toggle.setAttribute("aria-label", "Отметить выполненным");
  toggle.textContent = "✓";

  const main = document.createElement("div");
  main.className = "reminder__main";

  const title = document.createElement("h3");
  title.className = "reminder__title";
  title.textContent = reminder.title;

  const meta = document.createElement("div");
  meta.className = "reminder__meta";

  const badgeInfo = getTimeBadge(reminder.datetime);
  const badge = document.createElement("span");
  badge.className = `reminder__meta-badge reminder__meta-badge--${badgeInfo.type}`;
  badge.textContent = badgeInfo.text;

  const datetimeText = document.createElement("span");
  datetimeText.textContent = formatDateTime(reminder.datetime);

  meta.appendChild(badge);
  meta.appendChild(datetimeText);

  main.appendChild(title);
  main.appendChild(meta);

  const controls = document.createElement("div");
  controls.className = "reminder__controls";

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "reminder__delete";
  deleteBtn.setAttribute("aria-label", "Удалить напоминание");
  deleteBtn.textContent = "×";

  controls.appendChild(deleteBtn);

  li.appendChild(toggle);
  li.appendChild(main);
  li.appendChild(controls);

  toggle.addEventListener("click", () => onToggle(reminder.id));
  deleteBtn.addEventListener("click", () => onDelete(reminder.id));

  return li;
}

function renderReminders(reminders) {
  const listEl = document.getElementById("reminders-list");
  const emptyState = document.getElementById("empty-state");

  listEl.innerHTML = "";

  if (!reminders.length) {
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  const sorted = [...reminders].sort((a, b) => {
    const aDate = a.datetime ? new Date(a.datetime).getTime() : Infinity;
    const bDate = b.datetime ? new Date(b.datetime).getTime() : Infinity;
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    return aDate - bDate;
  });

  const handlers = {
    onToggle(id) {
      const current = loadReminders();
      const updated = current.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      );
      saveReminders(updated);
      renderReminders(updated);
    },
    onDelete(id) {
      const current = loadReminders();
      const updated = current.filter((item) => item.id !== id);
      saveReminders(updated);
      renderReminders(updated);
    },
  };

  for (const reminder of sorted) {
    const el = createReminderElement(reminder, handlers);
    listEl.appendChild(el);
  }
}

function getInitialTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") {
    return saved;
  }
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
    return "light";
  }
  return "dark";
}

function applyTheme(theme) {
  const body = document.body;
  body.setAttribute("data-theme", theme);

  const iconEl = document.getElementById("theme-toggle-icon");
  const labelEl = document.getElementById("theme-toggle-label");

  if (!iconEl || !labelEl) return;

  if (theme === "light") {
    iconEl.textContent = "☀️";
    labelEl.textContent = "Светлая";
  } else {
    iconEl.textContent = "🌙";
    labelEl.textContent = "Тёмная";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("reminder-form");
  const titleInput = document.getElementById("title");
  const datetimeInput = document.getElementById("datetime");
  const clearCompletedBtn = document.getElementById("clear-completed");
  const themeToggleBtn = document.getElementById("theme-toggle");

  const initialTheme = getInitialTheme();
  applyTheme(initialTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const current = document.body.getAttribute("data-theme") === "light" ? "light" : "dark";
      const next = current === "light" ? "dark" : "light";
      localStorage.setItem(THEME_KEY, next);
      applyTheme(next);
    });
  }

  renderReminders(loadReminders());

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const title = titleInput.value.trim();
    const datetime = datetimeInput.value || null;

    if (!title) {
      titleInput.focus();
      return;
    }

    const newReminder = {
      id: crypto.randomUUID?.() ?? String(Date.now()),
      title: title.slice(0, 200),
      datetime,
      completed: false,
    };

    const current = loadReminders();
    const updated = [...current, newReminder];

    saveReminders(updated);
    renderReminders(updated);

    form.reset();
    titleInput.focus();
  });

  clearCompletedBtn.addEventListener("click", () => {
    const current = loadReminders();
    const updated = current.filter((item) => !item.completed);
    saveReminders(updated);
    renderReminders(updated);
  });
});

