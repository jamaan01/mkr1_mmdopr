const $ = id => document.getElementById(id);

let tasks = [];
let resources = [];
let historyItems = [];
let editingId = null;

function escapeHtml(value) {
  const symbols = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };

  return String(value ?? "").replace(
    /[&<>"']/g,
    symbol => symbols[symbol]
  );
}

function showMessage(text, error = false) {
  $("message").textContent = text;
  $("message").className = error ? "message error" : "message";
}

async function action(callback) {
  try {
    await callback();
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function request(url, method = "GET", data) {
  const options = {
    method,
    headers: { "Content-Type": "application/json" }
  };

  if (data !== undefined) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);

  if (response.status === 204) {
    return null;
  }

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Помилка запиту.");
  }

  return result;
}

function formatDate(date) {
  return date.split("-").reverse().join(".");
}

function dayDate(startDate, offset) {
  const date = new Date(`${startDate}T00:00:00Z`);

  date.setUTCDate(date.getUTCDate() + offset);

  return date.toISOString().slice(0, 10);
}

function selectedValues(id) {
  return Array.from(
    $(id).selectedOptions,
    option => option.value
  );
}

function fillSelect(id, items, selected = []) {
  $(id).innerHTML = items.map(item => `
    <option
      value="${escapeHtml(item.value)}"
      ${selected.includes(item.value) ? "selected" : ""}
    >
      ${escapeHtml(item.label)}
    </option>
  `).join("");
}

function fillForm(task = null) {
  $("task-form").reset();
  editingId = task ? task.id : null;

  $("form-title").textContent = task
    ? `Редагування роботи ${task.id}`
    : "Додавання роботи";

  $("task-id").value = task?.id ?? "";
  $("task-id").readOnly = Boolean(task);
  $("task-name").value = task?.name ?? "";
  $("task-duration").value = task?.duration ?? 1;
  $("task-priority").value = task?.priority ?? 3;
  $("task-hours").value = task?.hours ?? 8;

  fillSelect(
    "task-predecessors",
    tasks
      .filter(item => item.id !== editingId)
      .map(item => ({
        value: item.id,
        label: `${item.id} — ${item.name}`
      })),
    task?.predecessors ?? []
  );

  const specializations = [
    ...new Set(resources.map(item => item.specialization))
  ];

  fillSelect(
    "task-specializations",
    specializations.map(value => ({ value, label: value })),
    task?.requiredSpecializations ?? []
  );

  fillSelect(
    "task-assignees",
    resources.map(item => ({
      value: item.id,
      label: `${item.id} — ${item.specialization}`
    })),
    task?.assignees ?? []
  );
}

function renderTasks() {
  $("tasks-body").innerHTML = tasks.map(task => `
    <tr>
      <td>${escapeHtml(task.id)}</td>
      <td>${escapeHtml(task.name)}</td>
      <td>${task.duration}</td>
      <td>${task.priority}</td>
      <td>${task.hours}</td>
      <td>${escapeHtml(task.predecessors.join(", ") || "—")}</td>
      <td>${escapeHtml(task.requiredSpecializations.join(", "))}</td>
      <td>${escapeHtml(task.assignees.join(", ") || "—")}</td>
      <td>
        <button data-action="edit" data-id="${escapeHtml(task.id)}">
          Змінити
        </button>
        <button class="danger"
                data-action="delete"
                data-id="${escapeHtml(task.id)}">
          Видалити
        </button>
      </td>
    </tr>
  `).join("");
}

function renderResources() {
  $("resources-body").innerHTML = resources.map(resource => `
    <tr>
      <td>${escapeHtml(resource.id)}</td>
      <td>${escapeHtml(resource.specialization)}</td>
      <td>
        <input type="number"
               min="0" max="8" step="0.5"
               value="${resource.availability}"
               aria-label="Доступність ${escapeHtml(resource.id)}">
      </td>
      <td>
        <button data-id="${escapeHtml(resource.id)}">
          Зберегти
        </button>
      </td>
    </tr>
  `).join("");
}

function renderHistory() {
  $("history").innerHTML = historyItems.length
    ? historyItems.map(item => `
        <option value="${escapeHtml(item.id)}">
          ${escapeHtml(new Date(item.createdAt).toLocaleString("uk-UA"))}
          — ${item.duration} дн.
          — початок ${formatDate(item.startDate)}
        </option>
      `).join("")
    : '<option value="">Історія порожня</option>';

  $("open-history").disabled = historyItems.length === 0;
}

async function loadHistory() {
  historyItems = await request("/api/schedule/history");
  renderHistory();
}

async function loadData() {
  [tasks, resources] = await Promise.all([
    request("/api/tasks"),
    request("/api/resources")
  ]);

  renderTasks();
  renderResources();
  fillForm();

  await loadHistory();
}

function invalidatePlan() {
  $("plan").textContent =
    "Дані змінено. Сформуйте календарний план повторно.";
}

function renderPlan(schedule) {
  const critical = schedule.tasks
    .filter(task => task.critical)
    .map(task => task.id)
    .join(", ");

  const dates = Array.from(
    { length: schedule.duration },
    (_, day) => dayDate(schedule.startDate, day)
  );

  const calendarRows = schedule.tasks.map(task => `
    <tr>
      <td class="${task.critical ? "critical-text" : ""}">
        ${escapeHtml(task.id)}
      </td>
      <td>${escapeHtml(task.name)}</td>
      <td>${formatDate(task.startDate)}</td>
      <td>${formatDate(task.finishDate)}</td>
      <td>${task.plannedDuration}</td>
      <td>${escapeHtml(task.assignees.join(", "))}</td>
      <td>${task.reserve}</td>
    </tr>
  `).join("");

  const width = schedule.duration * 28;

  const gantt = `
    <div class="gantt-row">
      <div class="gantt-label">Дата</div>
      <div class="track date-track" style="width:${width}px">
        ${dates.map(date => `
          <span title="${formatDate(date)}">${date.slice(5)}</span>
        `).join("")}
      </div>
    </div>

    ${schedule.tasks.map(task => `
      <div class="gantt-row">
        <div class="gantt-label">${escapeHtml(task.id)}</div>
        <div class="track" style="width:${width}px">
          <span
            class="bar ${task.critical ? "critical" : ""}"
            style="
              left:${task.startDay * 28}px;
              width:${task.plannedDuration * 28}px
            "
            title="${escapeHtml(task.name)}:
              ${formatDate(task.startDate)} —
              ${formatDate(task.finishDate)}"
          >
            ${escapeHtml(task.id)}
          </span>
        </div>
      </div>
    `).join("")}
  `;

  const loadRows = schedule.resources.map(resource => {
    const values = schedule.loads[resource.id];
    const total = values.reduce((sum, value) => sum + value, 0);
    const capacity = schedule.duration * resource.availability;

    const utilization = capacity > 0
      ? `${(total / capacity * 100).toFixed(1)}%`
      : "—";

    return `
      <tr>
        <td>${escapeHtml(resource.id)}</td>
        <td>${resource.availability}</td>
        <td>${total.toFixed(1)}</td>
        <td>${utilization}</td>
        ${values.map(value => `<td>${value.toFixed(1)}</td>`).join("")}
      </tr>
    `;
  }).join("");

  const conflicts = schedule.conflicts.length > 0
    ? `<ul>${schedule.conflicts.map(text =>
        `<li>${escapeHtml(text)}</li>`
      ).join("")}</ul>`
    : "<p>Конфліктів ресурсів не виявлено.</p>";

  $("plan").innerHTML = `
    <div class="summary">
      <p>
        <strong>Період:</strong>
        ${formatDate(schedule.startDate)} —
        ${formatDate(schedule.finishDate)}
      </p>
      <p>
        <strong>Загальна тривалість:</strong>
        ${schedule.duration} робочих днів.
      </p>
      <p>
        <strong>Тривалість за залежностями без конкуренції ресурсів:</strong>
        ${schedule.baselineDuration} дн.
      </p>
      <p>
        <strong>Порядок розгляду робіт:</strong>
        ${escapeHtml(schedule.order.join(" → "))}
      </p>
      <p>
        <strong>Критичні роботи за залежностями:</strong>
        ${escapeHtml(critical)}
      </p>
    </div>

    <h3>Календарний план</h3>

    <div class="scroll">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Робота</th>
            <th>Початок</th>
            <th>Завершення</th>
            <th>Днів</th>
            <th>Виконавці</th>
            <th>Резерв за залежностями, днів</th>
          </tr>
        </thead>
        <tbody>${calendarRows}</tbody>
      </table>
    </div>

    <h3>Діаграма Ганта</h3>
    <p class="hint">
      Червоним позначено критичні роботи за графом залежностей.
      Резерви розраховані без конкуренції за ресурси.
    </p>
    <div class="gantt">${gantt}</div>

    <h3>Завантаження виконавців</h3>

    <div class="scroll">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Ліміт, год/день</th>
            <th>Усього годин</th>
            <th>Завантаження</th>
            ${dates.map(date =>
              `<th>${formatDate(date)}</th>`
            ).join("")}
          </tr>
        </thead>
        <tbody>${loadRows}</tbody>
      </table>
    </div>

    <h3>Конфлікти та зміни плану</h3>
    ${conflicts}
  `;
}

$("task-form").addEventListener("submit", event => {
  event.preventDefault();

  action(async () => {
    const task = {
      id: $("task-id").value.trim(),
      name: $("task-name").value.trim(),
      duration: Number($("task-duration").value),
      priority: Number($("task-priority").value),
      hours: Number($("task-hours").value),
      predecessors: selectedValues("task-predecessors"),
      requiredSpecializations: selectedValues("task-specializations"),
      assignees: selectedValues("task-assignees")
    };

    const url = editingId
      ? `/api/tasks/${encodeURIComponent(editingId)}`
      : "/api/tasks";

    await request(url, editingId ? "PUT" : "POST", task);
    await loadData();

    invalidatePlan();
    showMessage("Роботу збережено.");
  });
});

$("reset-form").addEventListener("click", () => fillForm());

$("tasks-body").addEventListener("click", event => {
  const button = event.target.closest("button");

  if (!button) return;

  const id = button.dataset.id;

  if (button.dataset.action === "edit") {
    fillForm(tasks.find(task => task.id === id));
    $("task-form").scrollIntoView({ behavior: "smooth" });
    return;
  }

  action(async () => {
    await request(`/api/tasks/${encodeURIComponent(id)}`, "DELETE");
    await loadData();

    invalidatePlan();
    showMessage("Роботу видалено.");
  });
});

$("resources-body").addEventListener("click", event => {
  const button = event.target.closest("button");

  if (!button) return;

  action(async () => {
    const input = button.closest("tr").querySelector("input");

    await request(
      `/api/resources/${encodeURIComponent(button.dataset.id)}`,
      "PUT",
      { availability: Number(input.value) }
    );

    await loadData();

    invalidatePlan();
    showMessage("Доступність виконавця збережено.");
  });
});

$("validate").addEventListener("click", () => {
  action(async () => {
    const result = await request("/api/schedule/validate", "POST");

    if (!result.valid) {
      showMessage(result.errors.join("\n"), true);
      return;
    }

    showMessage(
      "Залежності коректні. Циклів не виявлено.\n" +
      "Порядок розгляду: " + result.order.join(" → ")
    );
  });
});

$("generate").addEventListener("click", () => {
  action(async () => {
    $("plan").textContent = "Формування плану…";

    try {
      const schedule = await request(
        "/api/schedule/generate",
        "POST",
        { startDate: $("start-date").value }
      );

      renderPlan(schedule);
      await loadHistory();

      showMessage("Календарний план сформовано та збережено.");
    } catch (error) {
      $("plan").textContent =
        "План не сформовано. Виправте зазначену помилку.";

      throw error;
    }
  });
});

$("open-history").addEventListener("click", () => {
  const schedule = historyItems.find(
    item => item.id === $("history").value
  );

  if (schedule) {
    renderPlan(schedule);
    showMessage("Відображено збережений план з історії.");
  }
});

const today = new Date();
today.setMinutes(today.getMinutes() - today.getTimezoneOffset());

$("start-date").value = today.toISOString().slice(0, 10);

action(loadData);