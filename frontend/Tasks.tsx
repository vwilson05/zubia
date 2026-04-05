import React, { useState, useEffect } from "react";
import { Icons } from "./Icons";

interface Task {
  id: number;
  user_id: number;
  listing_id: number | null;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: "low" | "medium" | "high";
  status: "todo" | "in_progress" | "done";
  listing_address: string | null;
  listing_city: string | null;
  created_at: string;
  updated_at: string;
}

interface Listing {
  id: number;
  address: string;
  city: string;
}

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "todo" | "done">("all");
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [linkedListing, setLinkedListing] = useState<string>("");

  useEffect(() => {
    loadTasks();
    loadListings();
  }, []);

  const loadTasks = async () => {
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (e) {
      console.error("Failed to load tasks:", e);
    }
    setLoading(false);
  };

  const loadListings = async () => {
    try {
      const res = await fetch("/api/listings");
      if (res.ok) {
        const data = await res.json();
        setListings(data);
      }
    } catch (e) {
      console.error("Failed to load listings:", e);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          due_date: dueDate || null,
          priority,
          listing_id: linkedListing ? parseInt(linkedListing) : null,
        }),
      });

      if (res.ok) {
        const task = await res.json();
        setTasks((prev) => [task, ...prev]);
        setTitle("");
        setDescription("");
        setDueDate("");
        setPriority("medium");
        setLinkedListing("");
        setShowForm(false);
      }
    } catch (e) {
      console.error("Failed to add task:", e);
    }
  };

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === "done" ? "todo" : "done";
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
      }
    } catch (e) {
      console.error("Failed to update task:", e);
    }
  };

  const deleteTask = async (id: number) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (e) {
      console.error("Failed to delete task:", e);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === "todo") return t.status !== "done";
    if (filter === "done") return t.status === "done";
    return true;
  });

  const priorityLabel = (p: string) => {
    if (p === "high") return "High";
    if (p === "medium") return "Med";
    return "Low";
  };

  const priorityClass = (p: string) => {
    if (p === "high") return "priority-high";
    if (p === "medium") return "priority-medium";
    return "priority-low";
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = d.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return { text: `${Math.abs(days)}d overdue`, overdue: true };
    if (days === 0) return { text: "Today", overdue: false };
    if (days === 1) return { text: "Tomorrow", overdue: false };
    return {
      text: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      overdue: false,
    };
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="tasks-page">
      {/* Header */}
      <div className="tasks-header">
        <div className="tasks-header-left">
          <h2>Tasks</h2>
          <span className="tasks-count">
            {tasks.filter((t) => t.status !== "done").length} open
          </span>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Cancel" : "+ Add Task"}
        </button>
      </div>

      {/* Add Task Form */}
      {showForm && (
        <form className="task-form card" onSubmit={handleAddTask}>
          <div className="task-form-row">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="input-field task-title-input"
              autoFocus
              required
            />
          </div>
          <div className="task-form-row">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details (optional)"
              className="input-field task-desc-input"
              rows={2}
            />
          </div>
          <div className="task-form-meta">
            <div className="task-form-field">
              <label>Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input-field"
              />
            </div>
            <div className="task-form-field">
              <label>Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="input-field"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="task-form-field">
              <label>Link to listing</label>
              <select
                value={linkedListing}
                onChange={(e) => setLinkedListing(e.target.value)}
                className="input-field"
              >
                <option value="">None</option>
                {listings.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.address}, {l.city}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="task-form-actions">
            <button type="submit" className="btn btn-primary" disabled={!title.trim()}>
              Add Task
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="tasks-filters">
        {(["all", "todo", "done"] as const).map((f) => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? "active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "All" : f === "todo" ? "Open" : "Done"}
          </button>
        ))}
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="empty-state">
          <Icons.Applications />
          <p>
            {filter === "done"
              ? "No completed tasks yet."
              : filter === "todo"
              ? "All caught up -- no open tasks."
              : "No tasks yet. Add one to get started."}
          </p>
        </div>
      ) : (
        <div className="tasks-list">
          {filteredTasks.map((task) => {
            const due = formatDate(task.due_date);
            return (
              <div
                key={task.id}
                className={`task-card card ${task.status === "done" ? "task-done" : ""}`}
              >
                <button
                  className={`task-check ${task.status === "done" ? "checked" : ""}`}
                  onClick={() => toggleTaskStatus(task)}
                  title={task.status === "done" ? "Mark as open" : "Mark as done"}
                >
                  {task.status === "done" && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
                <div className="task-content">
                  <div className="task-title-row">
                    <span className="task-title">{task.title}</span>
                    <span className={`task-priority ${priorityClass(task.priority)}`}>
                      {priorityLabel(task.priority)}
                    </span>
                  </div>
                  {task.description && (
                    <p className="task-description">{task.description}</p>
                  )}
                  <div className="task-meta">
                    {due && (
                      <span className={`task-due ${due.overdue ? "overdue" : ""}`}>
                        {due.text}
                      </span>
                    )}
                    {task.listing_address && (
                      <span className="task-listing-link">
                        {task.listing_address}
                        {task.listing_city ? `, ${task.listing_city}` : ""}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  className="task-delete"
                  onClick={() => deleteTask(task.id)}
                  title="Delete task"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
