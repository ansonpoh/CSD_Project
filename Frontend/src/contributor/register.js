import { supabase } from "../config/supabaseClient.js";
import { apiService } from "../services/api.js";

document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("register-form");
  const alertContainer = document.getElementById("alert-container");
  const submitBtn = document.getElementById("submit-btn");

  // Helper function to show alerts
  const showAlert = (message, type) => {
    alertContainer.textContent = message;
    alertContainer.className = `alert alert-${type} mt-3`;
    alertContainer.classList.remove("d-none");
  };

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Disable button to prevent double submissions
    submitBtn.disabled = true;
    submitBtn.textContent = "Registering...";
    alertContainer.classList.add("d-none"); // Hide previous alerts

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const fullName = document.getElementById("fullName").value;
    const bio = document.getElementById("bio").value;

    try {
      // Step 1: Sign up the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (authError) {
        throw new Error(`Supabase Error: ${authError.message}`);
      }

      const supabaseUserId = authData.user.id;

      // Step 2: Create the Contributor profile in Spring Boot backend
      const payload = {
        supabaseUserId,
        email: email,
        fullName: fullName,
        bio: bio,
      };

      await apiService.addContributor(payload);

      // Success!
      showAlert("Registration successful! You can now log in.", "success");
      registerForm.reset();

      // Optional: Redirect user to login page after a few seconds
      // setTimeout(() => window.location.href = '/login.html', 2000);
    } catch (error) {
      console.error("Registration failed:", error);
      showAlert(error.message, "danger");
    } finally {
      // Re-enable the submit button
      submitBtn.disabled = false;
      submitBtn.textContent = "Register";
    }
  });
});