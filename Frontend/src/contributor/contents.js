import { apiService } from "../services/api.js";

document.addEventListener("DOMContentLoaded", async () => {
  const tableBody = document.getElementById("content-table-body");
  const errorAlert = document.getElementById("error-message");

  try {
    const contributorId = localStorage.getItem("contributorId");

    const contents = await apiService.getContentsByContributorId(contributorId);

    tableBody.innerHTML = ""; // Clear loading text

    // 3. Populate the table
    if (contents.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">You haven't submitted any contents yet.</td></tr>`;
      return;
    }

    contents.forEach((content) => {
      const row = document.createElement("tr");

      // Map backend Enum Status to Bootstrap badge colors
      let badgeClass = "bg-secondary";
      if (content.status === "APPROVED") {
        badgeClass = "bg-success";
      } else if (content.status === "REJECTED") {
        badgeClass = "bg-danger";
      } else if (content.status === "PENDING_REVIEW") {
        badgeClass = "bg-warning text-dark";
      }

      // Format dates neatly
      const submittedDate = new Date(content.submittedAt).toLocaleString();

      row.innerHTML = `
                <td class="fw-bold">${content.title}</td>
                <td>${content.topic ? content.topic.topicName : "N/A"}</td>
                <td><span class="badge ${badgeClass}">${content.status}</span></td>
                <td>${submittedDate}</td>
            `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error("Error loading contents:", error);
    tableBody.innerHTML = ""; // Clear loading text
    errorAlert.textContent = error.message;
    errorAlert.classList.remove("d-none");
  }
});