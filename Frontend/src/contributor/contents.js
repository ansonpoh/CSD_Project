import { apiService, getFriendlyErrorMessage } from "../services/api.js";
import { supabase } from "../config/supabaseClient.js";

function showTableError(message) {
  const el = document.getElementById("error-message");
  el.textContent = message;
  el.classList.remove("d-none");
}

function renderRow(content) {
  let badgeClass = "bg-secondary";
  if (content.status === "APPROVED") badgeClass = "bg-success";
  else if (content.status === "REJECTED") badgeClass = "bg-danger";
  else if (content.status === "PENDING_REVIEW") badgeClass = "bg-warning text-dark";

  const submittedDate = new Date(content.submittedAt).toLocaleString();

  const row = document.createElement("tr");

  const titleCell = document.createElement("td");
  titleCell.className = "fw-bold";
  titleCell.textContent = content.title || "";

  const topicCell = document.createElement("td");
  topicCell.textContent = content.topic ? (content.topic.topicName || "N/A") : "N/A";

  const statusCell = document.createElement("td");
  const badge = document.createElement("span");
  badge.className = `badge ${badgeClass}`;
  badge.textContent = content.status || "";
  statusCell.appendChild(badge);

  const dateCell = document.createElement("td");
  dateCell.textContent = submittedDate;

  row.append(titleCell, topicCell, statusCell, dateCell);
  return row;
}

async function resolveContributorId() {
  const storedId = localStorage.getItem("contributorId");
  if (storedId) return storedId;

  const { data: { session } } = await supabase.auth.getSession();
  const supabaseUserId = session?.user?.id;
  if (!supabaseUserId) {
    throw new Error("No active contributor session found.");
  }

  const profile = await apiService.getContributorBySupabaseId(supabaseUserId);
  if (!profile?.contributorId) {
    throw new Error("Contributor profile missing.");
  }

  return profile.contributorId;
}

async function loadContents() {
  const tableBody = document.getElementById("content-table-body");
  const contributorId = await resolveContributorId();

  const contents = await apiService.getContentsByContributorId(contributorId);

  tableBody.innerHTML = "";

  if (contents.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">You haven't submitted any contents yet.</td></tr>`;
    return;
  }

  contents.forEach((c) => tableBody.appendChild(renderRow(c)));
}

async function loadTopics() {
  const select = document.getElementById("content-topic");
  const topics = await apiService.getAllTopics();

  select.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select a topic...";
  select.appendChild(placeholder);

  topics.forEach((topic) => {
    const option = document.createElement("option");
    option.value = String(topic?.topicId || "");
    option.textContent = topic?.topicName || "Untitled Topic";
    select.appendChild(option);
  });
}

async function handleSubmit() {
  const submitError = document.getElementById("submit-error");
  const submitSuccess = document.getElementById("submit-success");
  const submitBtn = document.getElementById("submit-btn");

  submitError.classList.add("d-none");
  submitSuccess.classList.add("d-none");

  const title = document.getElementById("content-title").value.trim();
  const topicId = document.getElementById("content-topic").value;
  const description = document.getElementById("content-description").value.trim();

  if (!title || !topicId || !description) {
    submitError.textContent = "Please fill in all fields.";
    submitError.classList.remove("d-none");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  try {
    const contributorId = await resolveContributorId();
    await apiService.submitContent({ contributorId, topicId, title, description });

    submitSuccess.textContent = "Content submitted successfully!";
    submitSuccess.classList.remove("d-none");

    document.getElementById("content-title").value = "";
    document.getElementById("content-topic").value = "";
    document.getElementById("content-description").value = "";

    await loadContents();
  } catch (error) {
    submitError.textContent = getFriendlyErrorMessage(error, "Submission failed. Please try again.");
    submitError.classList.remove("d-none");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit";
  }
}

async function handleLogout() {
  await supabase.auth.signOut();
  localStorage.removeItem("contributorId");
  localStorage.removeItem("gameState");
  window.location.href = "/";
}

document.addEventListener("DOMContentLoaded", async () => {
  const tableBody = document.getElementById("content-table-body");

  loadTopics().catch(() => {
    document.getElementById("content-topic").innerHTML =
      `<option value="">Failed to load topics</option>`;
  });

  document.getElementById("logout-btn").addEventListener("click", handleLogout);
  document.getElementById("submit-btn").addEventListener("click", handleSubmit);

  try {
    await loadContents();
  } catch (error) {
    console.error("Error loading contents:", error);
    tableBody.innerHTML = "";
    showTableError(getFriendlyErrorMessage(error, "Unable to load your submitted content."));
  }
});
