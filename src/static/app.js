document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const adminForm = document.getElementById("admin-form");
  const adminSubmitButton = document.getElementById("admin-submit-button");
  const cancelEditButton = document.getElementById("cancel-edit");

  let editMode = false;
  let editActivityName = null;

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and active options
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = "<option value=\"\">-- Select an activity --</option>";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="card-actions">
            <button class="edit-activity-btn" data-activity="${name}">Edit</button>
            <button class="delete-activity-btn" data-activity="${name}">Delete</button>
          </div>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });

      // Add event listeners to admin buttons
      document.querySelectorAll(".edit-activity-btn").forEach((button) => {
        button.addEventListener("click", handleEditActivity);
      });

      document.querySelectorAll(".delete-activity-btn").forEach((button) => {
        button.addEventListener("click", handleDeleteActivity);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  async function handleEditActivity(event) {
    const activity = event.target.getAttribute("data-activity");
    const response = await fetch("/activities");
    const activities = await response.json();

    if (!activities[activity]) {
      showMessage("Activity not found.", "error");
      return;
    }

    const details = activities[activity];

    document.getElementById("admin-activity-name").value = activity;
    document.getElementById("admin-description").value = details.description;
    document.getElementById("admin-schedule").value = details.schedule;
    document.getElementById("admin-max-participants").value = details.max_participants;
    document.getElementById("admin-activity-name").disabled = true;

    editMode = true;
    editActivityName = activity;
    adminSubmitButton.textContent = "Update Activity";
    cancelEditButton.classList.remove("hidden");
  }

  async function handleDeleteActivity(event) {
    const activity = event.target.getAttribute("data-activity");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        resetAdminForm();
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to delete activity. Please try again.", "error");
      console.error("Error deleting activity:", error);
    }
  }

  function resetAdminForm() {
    adminForm.reset();
    editMode = false;
    editActivityName = null;
    adminSubmitButton.textContent = "Add Activity";
    cancelEditButton.classList.add("hidden");
    document.getElementById("admin-activity-name").disabled = false;
  }

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  adminForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.getElementById("admin-activity-name").value.trim();
    const description = document.getElementById("admin-description").value.trim();
    const schedule = document.getElementById("admin-schedule").value.trim();
    const maxParticipants = Number(
      document.getElementById("admin-max-participants").value
    );

    const payload = {
      name,
      description,
      schedule,
      max_participants: maxParticipants,
    };

    const url = editMode
      ? `/activities/${encodeURIComponent(editActivityName)}`
      : "/activities";
    const method = editMode ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        resetAdminForm();
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to save activity. Please try again.", "error");
      console.error("Error saving activity:", error);
    }
  });

  cancelEditButton.addEventListener("click", () => {
    resetAdminForm();
  });

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  // Initialize app
  fetchActivities();
});
