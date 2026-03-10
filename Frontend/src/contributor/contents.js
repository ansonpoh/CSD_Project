import { apiService } from "../services/api.js";
import { supabase } from "../config/supabaseClient.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

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
  row.innerHTML = `
    <td class="fw-bold">${content.title}</td>
    <td>${content.topic ? content.topic.topicName : "N/A"}</td>
    <td><span class="badge ${badgeClass}">${content.status}</span></td>
    <td>${submittedDate}</td>
  `;
  return row;
}

// ── Load table ────────────────────────────────────────────────────────────────

async function loadContents() {
  const tableBody = document.getElementById("content-table-body");
  const contributorId = localStorage.getItem("contributorId");

  const contents = await apiService.getContentsByContributorId(contributorId);

  tableBody.innerHTML = "";

  if (contents.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">You haven't submitted any contents yet.</td></tr>`;
    return;
  }

  contents.forEach((c) => tableBody.appendChild(renderRow(c)));
}

// ── Load topic dropdown ───────────────────────────────────────────────────────

async function loadTopics() {
  const select = document.getElementById("content-topic");
  const topics = await apiService.getAllTopics();
  select.innerHTML = `<option value="">Select a topic…</option>` +
    topics.map((t) => `<option value="${t.topicId}">${t.topicName}</option>`).join("");
}

// ── Submit content ────────────────────────────────────────────────────────────

async function handleSubmit() {
  const submitError   = document.getElementById("submit-error");
  const submitSuccess = document.getElementById("submit-success");
  const submitBtn     = document.getElementById("submit-btn");

  submitError.classList.add("d-none");
  submitSuccess.classList.add("d-none");

  const title       = document.getElementById("content-title").value.trim();
  const topicId     = document.getElementById("content-topic").value;
  const description = document.getElementById("content-description").value.trim();

  if (!title || !topicId || !description) {
    submitError.textContent = "Please fill in all fields.";
    submitError.classList.remove("d-none");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting…";

  try {
    const contributorId = localStorage.getItem("contributorId");
    await apiService.submitContent({ contributorId, topicId, title, description });

    submitSuccess.textContent = "Content submitted successfully!";
    submitSuccess.classList.remove("d-none");

    // Reset form
    document.getElementById("content-title").value = "";
    document.getElementById("content-topic").value = "";
    document.getElementById("content-description").value = "";

    // Refresh table
    await loadContents();
  } catch (error) {
    submitError.textContent = error.message || "Submission failed.";
    submitError.classList.remove("d-none");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit";
  }
}

// ── Logout ────────────────────────────────────────────────────────────────────

async function handleLogout() {
  await supabase.auth.signOut();
  localStorage.removeItem("contributorId");
  localStorage.removeItem("gameState");
  window.location.href = "/";
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  const tableBody = document.getElementById("content-table-body");

  // Load topics for modal dropdown
  loadTopics().catch(() => {
    document.getElementById("content-topic").innerHTML =
      `<option value="">Failed to load topics</option>`;
  });

  // Wire up buttons
  document.getElementById("logout-btn").addEventListener("click", handleLogout);
  document.getElementById("submit-btn").addEventListener("click", handleSubmit);

  // Load contents table
  try {
    await loadContents();
  } catch (error) {
    console.error("Error loading contents:", error);
    tableBody.innerHTML = "";
    showTableError(error.message);
  }
});