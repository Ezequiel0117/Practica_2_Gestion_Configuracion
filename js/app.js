const STORAGE_KEY = "mini-task-manager.tasks";

const state = {
  tasks: loadTasks(),
  filter: "all",
  editingTaskId: null,
};

const elements = {
  form: document.querySelector("#task-form"),
  titleInput: document.querySelector("#task-title"),
  priorityInput: document.querySelector("#task-priority"),
  submitButton: document.querySelector("#form-submit"),
  cancelEdit: document.querySelector("#cancel-edit"),
  taskList: document.querySelector("#task-list"),
  emptyState: document.querySelector("#empty-state"),
  emptyTitle: document.querySelector("#empty-title"),
  emptyCopy: document.querySelector("#empty-copy"),
  formMessage: document.querySelector("#form-message"),
  taskCount: document.querySelector("#task-count"),
  progressValue: document.querySelector("#progress-value"),
  currentDate: document.querySelector("#current-date"),
  clearCompleted: document.querySelector("#clear-completed"),
  filterButtons: document.querySelectorAll("[data-filter]"),
};

const priorityLabels = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};

initialize();

function initialize() {
  elements.currentDate.textContent = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  elements.form.addEventListener("submit", handleCreateTask);
  elements.cancelEdit.addEventListener("click", cancelEditing);
  elements.taskList.addEventListener("click", handleTaskAction);
  elements.clearCompleted.addEventListener("click", clearCompletedTasks);
  elements.filterButtons.forEach((button) => {
    button.addEventListener("click", () => setFilter(button.dataset.filter));
  });

  render();
}

function loadTasks() {
  try {
    const savedTasks = localStorage.getItem(STORAGE_KEY);
    return savedTasks ? JSON.parse(savedTasks) : [];
  } catch (error) {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
}

function handleCreateTask(event) {
  event.preventDefault();
  const title = elements.titleInput.value.trim();

  if (!title) {
    showFormMessage("Escribe una tarea antes de agregarla.");
    elements.titleInput.focus();
    return;
  }

  const taskAlreadyExists = state.tasks.some(
    (task) =>
      task.id !== state.editingTaskId &&
      normalizeTitle(task.title) === normalizeTitle(title),
  );

  if (taskAlreadyExists) {
    showFormMessage("Ya existe una tarea con ese nombre.");
    elements.titleInput.focus();
    return;
  }

  if (state.editingTaskId) {
    const task = state.tasks.find((item) => item.id === state.editingTaskId);

    if (task) {
      task.title = title;
      task.priority = elements.priorityInput.value;
    }
  } else {
    state.tasks.unshift({
      id: crypto.randomUUID(),
      title,
      priority: elements.priorityInput.value,
      completed: false,
      createdAt: new Date().toISOString(),
    });
  }

  saveTasks();
  resetForm();
  elements.titleInput.focus();
  showFormMessage("");
  render();
}

function normalizeTitle(title) {
  return title.trim().toLocaleLowerCase();
}

function handleTaskAction(event) {
  const actionButton = event.target.closest("[data-action]");

  if (!actionButton) {
    return;
  }

  const { action, id } = actionButton.dataset;
  const task = state.tasks.find((item) => item.id === id);

  if (action === "edit" && task) {
    startEditing(task);
    return;
  }

  if (action === "toggle" && task) {
    task.completed = !task.completed;
  }

  if (action === "delete") {
    state.tasks = state.tasks.filter((item) => item.id !== id);
  }

  saveTasks();
  render();
}

function startEditing(task) {
  state.editingTaskId = task.id;
  elements.titleInput.value = task.title;
  elements.priorityInput.value = task.priority;
  elements.submitButton.innerHTML =
    '<span aria-hidden="true">+</span> Guardar cambios';
  elements.cancelEdit.hidden = false;
  showFormMessage("Editando tarea.");
  elements.titleInput.focus();
}

function cancelEditing() {
  resetForm();
  showFormMessage("");
  elements.titleInput.focus();
}

function resetForm() {
  state.editingTaskId = null;
  elements.form.reset();
  elements.submitButton.innerHTML =
    '<span aria-hidden="true">+</span> Agregar tarea';
  elements.cancelEdit.hidden = true;
}

function clearCompletedTasks() {
  const completedTasks = state.tasks.filter((task) => task.completed);

  if (completedTasks.length === 0) {
    return;
  }

  state.tasks = state.tasks.filter((task) => !task.completed);
  saveTasks();
  render();
}

function setFilter(filter) {
  state.filter = filter;
  elements.filterButtons.forEach((button) => {
    const isActive = button.dataset.filter === filter;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  render();
}

function getVisibleTasks() {
  if (state.filter === "active") {
    return state.tasks.filter((task) => !task.completed);
  }

  if (state.filter === "completed") {
    return state.tasks.filter((task) => task.completed);
  }

  return state.tasks;
}

function render() {
  const visibleTasks = getVisibleTasks();
  elements.taskList.innerHTML = visibleTasks.map(createTaskMarkup).join("");
  updateSummary();
  updateEmptyState(visibleTasks.length);
}

function createTaskMarkup(task) {
  const completedClass = task.completed ? " is-completed" : "";
  const checkedLabel = task.completed
    ? "Marcar como pendiente"
    : "Marcar como completada";

  return `
    <li class="task-item${completedClass}">
      <button class="task-check" type="button" data-action="toggle" data-id="${task.id}" aria-label="${checkedLabel}" title="${checkedLabel}"></button>
      <div class="task-content">
        <p class="task-title">${escapeHtml(task.title)}</p>
        <div class="task-meta">
          <span class="priority-dot ${task.priority}" aria-hidden="true"></span>
          <span>Prioridad ${priorityLabels[task.priority]}</span>
        </div>
      </div>
      <button class="edit-button" type="button" data-action="edit" data-id="${task.id}" aria-label="Editar tarea" title="Editar tarea">Editar</button>
      <button class="delete-button" type="button" data-action="delete" data-id="${task.id}" aria-label="Eliminar tarea" title="Eliminar tarea">&times;</button>
    </li>
  `;
}

function updateSummary() {
  const totalTasks = state.tasks.length;
  const completedTasks = state.tasks.filter((task) => task.completed).length;
  const progress =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  const pendingTasks = totalTasks - completedTasks;

  elements.progressValue.textContent = `${progress}%`;
  elements.taskCount.textContent = `${totalTasks} ${totalTasks === 1 ? "tarea" : "tareas"}`;
  elements.clearCompleted.disabled = completedTasks === 0;
  elements.clearCompleted.style.opacity = completedTasks === 0 ? "0.45" : "1";
  elements.clearCompleted.style.cursor =
    completedTasks === 0 ? "default" : "pointer";
  elements.taskList.setAttribute(
    "aria-label",
    `${pendingTasks} tareas pendientes`,
  );
}

function updateEmptyState(visibleTaskCount) {
  const hasTasks = state.tasks.length > 0;
  const isFiltered = state.filter !== "all";

  elements.emptyState.hidden = visibleTaskCount > 0;

  if (!hasTasks) {
    elements.emptyTitle.textContent = "No hay tareas todavía";
    elements.emptyCopy.textContent =
      "Agrega tu primera tarea y empieza a avanzar.";
    return;
  }

  if (isFiltered) {
    elements.emptyTitle.textContent = "Nada por aquí";
    elements.emptyCopy.textContent =
      state.filter === "completed"
        ? "Aún no has completado ninguna tarea."
        : "No tienes tareas pendientes.";
  }
}

function showFormMessage(message) {
  elements.formMessage.textContent = message;
}

function escapeHtml(value) {
  const container = document.createElement("div");
  container.textContent = value;
  return container.innerHTML;
}
