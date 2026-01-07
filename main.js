const state = {
  skills: [],
  tasks: [],
  currentSkillId: null,
  filters: {
    category: 'all',
    status: 'all'
  }
};

const SELECTORS = {
  skillsContainer: '#skills-container',
  tasksContainer: '#tasks-container',
  statsContainer: '#stats-container',
  categoryFilter: '#category-filter',
  statusFilter: '#status-filter'
};

const CATEGORIES = {
  ALL: 'all',
  FRONTEND: 'frontend',
  BACKEND: 'backend',
  TOOLS: 'tools'
};

const STATUS = {
  ALL: 'all',
  DONE: 'done',
  IN_PROGRESS: 'in-progress'
};

async function loadData() {
  try {
    const response = await fetch('data/db.json');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    if (!data.skills || !Array.isArray(data.skills)) {
      throw new Error('Invalid data structure: skills array not found');
    }
    if (!data.tasks || !Array.isArray(data.tasks)) {
      throw new Error('Invalid data structure: tasks array not found');
    }
    state.skills = data.skills;
    state.tasks = data.tasks;
    render();
    console.log('Data loaded successfully:', { 
      skills: state.skills.length, 
      tasks: state.tasks.length 
    });
  } catch (error) {
    console.error('Error loading data:', error);
    showError('Failed to load data. Please check that data/db.json exists and is valid.');
  }
}

function render() {
  const filteredSkills = getFilteredSkills();
  renderSkills(filteredSkills);
  updateStats();
  if (state.currentSkillId !== null) {
    const filteredTasks = getFilteredTasks();
    renderTasks(filteredTasks);
  } else {
    const container = document.querySelector(SELECTORS.tasksContainer);
    if (container) container.innerHTML = '';
  }
}

function renderSkills(skillsArray) {
  const container = document.querySelector(SELECTORS.skillsContainer);
  if (!container) return;
  if (skillsArray.length === 0) {
    container.innerHTML = '<p class="no-data">No skills found matching your filters.</p>';
    return;
  }
  container.innerHTML = '';
  skillsArray.forEach(skill => container.appendChild(createSkillCard(skill)));
}

function createSkillCard(skill) {
  const card = document.createElement('div');
  card.className = 'skill-card';
  card.dataset.skillId = skill.id;
  if (state.currentSkillId === skill.id) card.classList.add('active');
  card.innerHTML = `
    <h3>${escapeHtml(skill.name)}</h3>
    <p>Category: <span class="category-badge">${escapeHtml(skill.category)}</span></p>
    <div class="progress-bar">
      <div class="progress" style="width: ${Math.min(100, Math.max(0, skill.level))}%">
        ${skill.level}%
      </div>
    </div>
  `;
  card.addEventListener('click', () => handleSkillClick(skill.id));
  return card;
}

function renderTasks(tasksArray) {
  const container = document.querySelector(SELECTORS.tasksContainer);
  if (!container) return;
  if (tasksArray.length === 0) {
    container.innerHTML = '<p class="no-data">No tasks found for this skill.</p>';
    return;
  }
  container.innerHTML = '';
  sortTasks(tasksArray).forEach(task => container.appendChild(createTaskElement(task)));
}

function createTaskElement(task) {
  const taskDiv = document.createElement('div');
  taskDiv.className = `task-item priority-${task.priority}`;
  taskDiv.dataset.taskId = task.id;
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = task.done;
  checkbox.id = `task-${task.id}`;
  const label = document.createElement('label');
  label.htmlFor = `task-${task.id}`;
  label.className = task.done ? 'done' : '';
  label.textContent = `${task.text} `;
  const priorityBadge = document.createElement('span');
  priorityBadge.className = 'priority-badge';
  priorityBadge.textContent = task.priority;
  label.appendChild(priorityBadge);
  checkbox.addEventListener('change', () => handleTaskToggle(task.id, checkbox.checked));
  taskDiv.appendChild(checkbox);
  taskDiv.appendChild(label);
  return taskDiv;
}

function handleSkillClick(skillId) {
  state.currentSkillId = skillId;
  state.filters.status = STATUS.ALL;
  const statusFilter = document.querySelector(SELECTORS.statusFilter);
  if (statusFilter) statusFilter.value = STATUS.ALL;
  render();
}

function handleTaskToggle(taskId, isChecked) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;
  task.done = isChecked;
  render();
}

function handleCategoryFilterChange(category) {
  state.filters.category = category;
  state.currentSkillId = null;
  render();
}

function handleStatusFilterChange(status) {
  state.filters.status = status;
  render();
}

function getFilteredSkills() {
  if (state.filters.category === CATEGORIES.ALL) return state.skills;
  return state.skills.filter(skill => skill.category === state.filters.category);
}

function getFilteredTasks() {
  let filtered = state.tasks.filter(task => task.skillId === state.currentSkillId);
  if (state.filters.status === STATUS.DONE) filtered = filtered.filter(task => task.done);
  else if (state.filters.status === STATUS.IN_PROGRESS) filtered = filtered.filter(task => !task.done);
  return filtered;
}

function updateStats() {
  const container = document.querySelector(SELECTORS.statsContainer);
  if (!container) return;
  const totalSkills = state.skills.length;
  const averageLevel = totalSkills > 0
    ? state.skills.reduce((sum, skill) => sum + skill.level, 0) / totalSkills
    : 0;
  const totalTasks = state.tasks.length;
  const completedTasks = state.tasks.filter(task => task.done).length;
  const completionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0;
  container.innerHTML = `
    <div class="stat-grid">
      <div class="stat-item">
        <span class="stat-label">Total Skills:\u00A0</span>
        <span class="stat-value">${totalSkills}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Average Level:\u00A0</span>
        <span class="stat-value">${averageLevel.toFixed(1)}%</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Completed Tasks:\u00A0</span>
        <span class="stat-value">${completedTasks} / ${totalTasks}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Completion Rate:\u00A0</span>
        <span class="stat-value">${completionRate}%</span>
      </div>
    </div>
  `;
}

function sortTasks(tasksArray) {
  const priorityOrder = { high: 1, medium: 2, low: 3 };
  return [...tasksArray].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return (priorityOrder[a.priority] || 999) - (priorityOrder[b.priority] || 999);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showError(message) {
  const body = document.body;
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  body.insertBefore(errorDiv, body.firstChild);
  
  setTimeout(() => errorDiv.remove(), 5000);
}

function initializeEventListeners() {
  const categoryFilter = document.querySelector(SELECTORS.categoryFilter);
  const statusFilter = document.querySelector(SELECTORS.statusFilter);
  if (categoryFilter) categoryFilter.addEventListener('change', e => handleCategoryFilterChange(e.target.value));
  if (statusFilter) statusFilter.addEventListener('change', e => handleStatusFilterChange(e.target.value));
}

function init() {
  initializeEventListeners();
  loadData();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
