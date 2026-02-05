// ===== STATE MANAGEMENT =====
let tasks = [];
let currentFilter = 'all';
let currentSort = 'default';
let editingTaskId = null;

// ===== INITIALIZE APP =====
document.addEventListener('DOMContentLoaded', () => {
    loadTasksFromStorage();
    initializeEventListeners();
    setMinDate();
    updateUI();
});

// ===== EVENT LISTENERS =====
function initializeEventListeners() {
    // Form submission
    const todoForm = document.getElementById('todoForm');
    todoForm.addEventListener('submit', handleFormSubmit);

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', debounce(handleSearch, 300));

    // Filter dropdown
    const filterBtn = document.getElementById('filterBtn');
    const filterMenu = document.getElementById('filterMenu');
    filterBtn.addEventListener('click', toggleFilterDropdown);

    // Filter options
    const filterItems = document.querySelectorAll('.dropdown-item');
    filterItems.forEach(item => {
        item.addEventListener('click', (e) => handleFilterChange(e.target.dataset.filter));
    });

    // Sort buttons
    const sortButtons = document.querySelectorAll('.sort-btn');
    sortButtons.forEach(btn => {
        btn.addEventListener('click', (e) => handleSortChange(e.target.dataset.sort));
    });

    // Delete all button
    const deleteAllBtn = document.getElementById('deleteAllBtn');
    deleteAllBtn.addEventListener('click', handleDeleteAll);

    // Modal buttons
    const cancelBtn = document.getElementById('cancelBtn');
    const confirmBtn = document.getElementById('confirmBtn');
    cancelBtn.addEventListener('click', closeModal);
    confirmBtn.addEventListener('click', confirmModalAction);

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.filter-dropdown')) {
            closeFilterDropdown();
        }
    });

    // Close modal when clicking outside
    const modal = document.getElementById('confirmModal');
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
}

// ===== FORM VALIDATION & SUBMISSION =====
function handleFormSubmit(e) {
    e.preventDefault();
    
    const todoInput = document.getElementById('todoInput');
    const dateInput = document.getElementById('dateInput');
    const todoError = document.getElementById('todoError');
    const dateError = document.getElementById('dateError');
    
    // Clear previous errors
    todoError.textContent = '';
    dateError.textContent = '';
    
    const todoValue = todoInput.value.trim();
    const dateValue = dateInput.value;
    
    let isValid = true;
    
    // Validate todo input
    if (todoValue === '') {
        todoError.textContent = '⚠️ Please enter a task';
        isValid = false;
    } else if (todoValue.length < 3) {
        todoError.textContent = '⚠️ Task must be at least 3 characters';
        isValid = false;
    } else if (todoValue.length > 100) {
        todoError.textContent = '⚠️ Task must be less than 100 characters';
        isValid = false;
    }
    
    // Validate date input
    if (dateValue === '') {
        dateError.textContent = '⚠️ Please select a date';
        isValid = false;
    } else {
        const selectedDate = new Date(dateValue);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
            dateError.textContent = '⚠️ Date cannot be in the past';
            isValid = false;
        }
    }
    
    if (!isValid) {
        return;
    }
    
    // Add or update task
    if (editingTaskId !== null) {
        updateTask(editingTaskId, todoValue, dateValue);
        editingTaskId = null;
    } else {
        addTask(todoValue, dateValue);
    }
    
    // Clear form
    todoInput.value = '';
    dateInput.value = '';
    todoInput.focus();
    
    // Update UI
    updateUI();
}

// ===== TASK OPERATIONS =====
function addTask(text, dueDate) {
    const task = {
        id: Date.now(),
        text: text,
        dueDate: dueDate,
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    tasks.unshift(task);
    saveTasksToStorage();
    showNotification('✨ Task added successfully!', 'success');
}

function updateTask(id, text, dueDate) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.text = text;
        task.dueDate = dueDate;
        saveTasksToStorage();
        showNotification('✏️ Task updated successfully!', 'success');
    }
}

function deleteTask(id) {
    const taskElement = document.querySelector(`[data-task-id="${id}"]`);
    if (taskElement) {
        taskElement.classList.add('fade-out');
        setTimeout(() => {
            tasks = tasks.filter(task => task.id !== id);
            saveTasksToStorage();
            updateUI();
            showNotification('🗑️ Task deleted successfully!', 'success');
        }, 300);
    }
}

function toggleTaskStatus(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTasksToStorage();
        updateUI();
        
        if (task.completed) {
            showNotification('🎉 Task completed! Great job!', 'success');
        }
    }
}

function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        editingTaskId = id;
        document.getElementById('todoInput').value = task.text;
        document.getElementById('dateInput').value = task.dueDate;
        document.getElementById('todoInput').focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// ===== FILTER & SORT =====
function handleFilterChange(filter) {
    currentFilter = filter;
    closeFilterDropdown();
    updateUI();
    showNotification(`🎯 Filter: ${getFilterLabel(filter)}`, 'info');
}

function handleSortChange(sort) {
    currentSort = sort;
    
    // Update active button
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    updateUI();
    showNotification(`📊 Sorted by: ${getSortLabel(sort)}`, 'info');
}

function getFilteredTasks() {
    let filtered = [...tasks];
    
    // Apply search filter
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    if (searchTerm) {
        filtered = filtered.filter(task => 
            task.text.toLowerCase().includes(searchTerm)
        );
    }
    
    // Apply status filter
    switch (currentFilter) {
        case 'completed':
            filtered = filtered.filter(task => task.completed);
            break;
        case 'pending':
            filtered = filtered.filter(task => !task.completed);
            break;
        case 'today':
            const today = new Date().toISOString().split('T')[0];
            filtered = filtered.filter(task => task.dueDate === today);
            break;
    }
    
    return filtered;
}

function getSortedTasks(filteredTasks) {
    let sorted = [...filteredTasks];
    
    switch (currentSort) {
        case 'date-asc':
            sorted.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
            break;
        case 'date-desc':
            sorted.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
            break;
        case 'name-asc':
            sorted.sort((a, b) => a.text.localeCompare(b.text));
            break;
        case 'default':
            sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
    }
    
    return sorted;
}

// ===== SEARCH =====
function handleSearch() {
    updateUI();
}

// ===== DELETE ALL =====
function handleDeleteAll() {
    if (tasks.length === 0) {
        showNotification('⚠️ No tasks to delete', 'warning');
        return;
    }
    
    showModal(
        '🗑️ Delete All Tasks',
        'Are you sure you want to delete all tasks? This action cannot be undone.',
        () => {
            tasks = [];
            saveTasksToStorage();
            updateUI();
            showNotification('🗑️ All tasks deleted!', 'success');
        }
    );
}

// ===== UI UPDATES =====
function updateUI() {
    updateStatistics();
    renderTasks();
}

function updateStatistics() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
    
    document.getElementById('totalTasks').textContent = total;
    document.getElementById('completedTasks').textContent = completed;
    document.getElementById('pendingTasks').textContent = pending;
    document.getElementById('progressPercent').textContent = progress + '%';
}

function renderTasks() {
    const tasksList = document.getElementById('tasksList');
    const filteredTasks = getFilteredTasks();
    const sortedTasks = getSortedTasks(filteredTasks);
    
    if (sortedTasks.length === 0) {
        tasksList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🌸</div>
                <p class="empty-text">No tasks found</p>
                <p class="empty-subtext">Add your first task to get started!</p>
            </div>
        `;
        return;
    }
    
    tasksList.innerHTML = sortedTasks.map(task => createTaskHTML(task)).join('');
    
    // Add event listeners to task items
    sortedTasks.forEach(task => {
        const taskElement = document.querySelector(`[data-task-id="${task.id}"]`);
        
        // Checkbox
        const checkbox = taskElement.querySelector('.task-checkbox');
        checkbox.addEventListener('click', () => toggleTaskStatus(task.id));
        
        // Edit button
        const editBtn = taskElement.querySelector('.edit-btn');
        editBtn.addEventListener('click', () => editTask(task.id));
        
        // Delete button
        const deleteBtn = taskElement.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => {
            showModal(
                '🗑️ Delete Task',
                `Are you sure you want to delete "${task.text}"?`,
                () => deleteTask(task.id)
            );
        });
    });
}

function createTaskHTML(task) {
    const formattedDate = formatDate(task.dueDate);
    const statusClass = task.completed ? 'status-completed' : 'status-pending';
    const statusText = task.completed ? '✓ Completed' : '⏰ Pending';
    const completedClass = task.completed ? 'completed' : '';
    const checkboxClass = task.completed ? 'checked' : '';
    
    return `
        <div class="task-item ${completedClass}" data-task-id="${task.id}">
            <div class="task-content">
                <div class="task-checkbox ${checkboxClass}"></div>
                <span class="task-text">${escapeHtml(task.text)}</span>
            </div>
            <div class="task-date">${formattedDate}</div>
            <div>
                <span class="task-status ${statusClass}">${statusText}</span>
            </div>
            <div class="task-actions">
                <button class="action-btn edit-btn" title="Edit task">✏️</button>
                <button class="action-btn delete-btn" title="Delete task">🗑️</button>
            </div>
        </div>
    `;
}

// ===== MODAL =====
let modalCallback = null;

function showModal(title, message, callback) {
    const modal = document.getElementById('confirmModal');
    const modalTitle = document.querySelector('.modal-title');
    const modalMessage = document.getElementById('modalMessage');
    
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalCallback = callback;
    
    modal.classList.add('show');
}

function closeModal() {
    const modal = document.getElementById('confirmModal');
    modal.classList.remove('show');
    modalCallback = null;
}

function confirmModalAction() {
    if (modalCallback) {
        modalCallback();
    }
    closeModal();
}

// ===== FILTER DROPDOWN =====
function toggleFilterDropdown() {
    const dropdown = document.querySelector('.filter-dropdown');
    dropdown.classList.toggle('active');
}

function closeFilterDropdown() {
    const dropdown = document.querySelector('.filter-dropdown');
    dropdown.classList.remove('active');
}

// ===== NOTIFICATIONS =====
function showNotification(message, type = 'success') {
    // Remove existing notifications
    const existingNotif = document.querySelector('.notification');
    if (existingNotif) {
        existingNotif.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'linear-gradient(135deg, #81c784, #66bb6a)' : 
                     type === 'warning' ? 'linear-gradient(135deg, #ffd54f, #ffca28)' :
                     'linear-gradient(135deg, #64b5f6, #42a5f5)'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        font-weight: 600;
        z-index: 2000;
        animation: slideInRight 0.3s ease-out;
        font-family: 'Quicksand', sans-serif;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add notification animations to CSS dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100px);
        }
    }
`;
document.head.appendChild(style);

// ===== STORAGE =====
function saveTasksToStorage() {
    try {
        localStorage.setItem('cuteTodoTasks', JSON.stringify(tasks));
    } catch (error) {
        console.error('Error saving tasks:', error);
        showNotification('⚠️ Error saving tasks', 'warning');
    }
}

function loadTasksFromStorage() {
    try {
        const stored = localStorage.getItem('cuteTodoTasks');
        if (stored) {
            tasks = JSON.parse(stored);
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
        tasks = [];
    }
}

// ===== UTILITY FUNCTIONS =====
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function setMinDate() {
    const dateInput = document.getElementById('dateInput');
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function getFilterLabel(filter) {
    const labels = {
        'all': 'All Tasks',
        'completed': 'Completed',
        'pending': 'Pending',
        'today': 'Due Today'
    };
    return labels[filter] || filter;
}

function getSortLabel(sort) {
    const labels = {
        'date-asc': 'Date (Old → New)',
        'date-desc': 'Date (New → Old)',
        'name-asc': 'Name (A → Z)',
        'default': 'Default'
    };
    return labels[sort] || sort;
}

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('searchInput').focus();
    }
    
    // Escape to close modal or dropdown
    if (e.key === 'Escape') {
        closeModal();
        closeFilterDropdown();
    }
});
