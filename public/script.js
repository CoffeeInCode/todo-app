document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('taskInput');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskList = document.getElementById('taskList');
    const API_URL = '/api/tasks'; // Relative path, ALB will route it

    async function fetchTasks() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message || response.statusText}`);
            }
            const tasks = await response.json();
            renderTasks(tasks);
        } catch (error) {
            console.error("Failed to fetch tasks:", error);
            taskList.innerHTML = `<li>Error loading tasks: ${error.message}. Please check console.</li>`;
        }
    }

    function renderTasks(tasks) {
        taskList.innerHTML = '';
        if (!tasks || tasks.length === 0) {
            taskList.innerHTML = '<li>No tasks yet! Add one above.</li>';
            return;
        }
        tasks.forEach(task => {
            const li = document.createElement('li');
            li.dataset.id = task.id;
            if (task.is_completed) {
                li.classList.add('completed');
            }

            const taskSpan = document.createElement('span');
            taskSpan.classList.add('task-text'); // Added class for styling/selection
            taskSpan.textContent = task.task_name;
            // Event listener on span is fine, or make the whole li clickable
            taskSpan.addEventListener('click', () => toggleComplete(task.id, !task.is_completed));

            const actionsDiv = document.createElement('div');
            actionsDiv.classList.add('actions');

            const completeBtn = document.createElement('button');
            completeBtn.classList.add('complete-btn');
            completeBtn.textContent = task.is_completed ? 'Undo' : 'Complete';
            completeBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent li click event if buttons are inside span
                toggleComplete(task.id, !task.is_completed);
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteTask(task.id);
            });

            actionsDiv.appendChild(completeBtn);
            actionsDiv.appendChild(deleteBtn);
            li.appendChild(taskSpan);
            li.appendChild(actionsDiv);
            taskList.appendChild(li);
        });
    }

    async function addTask() {
        const taskName = taskInput.value.trim();
        if (!taskName) {
            alert('Please enter a task name.');
            return;
        }
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task_name: taskName })
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message || response.statusText}`);
            }
            taskInput.value = '';
            fetchTasks(); // Refresh the list
        } catch (error) {
            console.error("Failed to add task:", error);
            alert(`Failed to add task: ${error.message}`);
        }
    }

    async function toggleComplete(id, is_completed) {
        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_completed })
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message || response.statusText}`);
            }
            fetchTasks(); // Refresh the list
        } catch (error) {
            console.error("Failed to update task:", error);
            alert(`Failed to update task: ${error.message}`);
        }
    }

    async function deleteTask(id) {
        if (!confirm('Are you sure you want to delete this task?')) return;
        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message || response.statusText}`);
            }
            fetchTasks(); // Refresh the list
        } catch (error) {
            console.error("Failed to delete task:", error);
            alert(`Failed to delete task: ${error.message}`);
        }
    }

    addTaskBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent form submission if inside a form
            addTask();
        }
    });

    fetchTasks(); // Initial load
});
