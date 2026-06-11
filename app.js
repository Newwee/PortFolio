const initialData = {
  story: [
    {
      period: "2009 / Origin",
      title: "Born to explore",
      body: "New JA was born on 06/23/09. The early story is simple but important: as a kid, he loved playing, trying things, and following curiosity wherever it went."
    },
    {
      period: "Kindergarten - Grade 6",
      title: "Bangpleepat School",
      body: "Studied at Bangpleepat School from kindergarten to primary school Grade 6. This was the first chapter of learning, friendship, and building the habit of trying new things."
    },
    {
      period: "Grade 7 - Grade 12",
      title: "Navamindarajudis Triamudomsuksapattanakarn School",
      body: "Continued in the Science-Math program through high school. This period turned curiosity into clearer goals: coding, design, content creation, and technology."
    },
    {
      period: "Dream University",
      title: "Why KMITL",
      body: "KMITL has been the dream university since childhood. Its strength in technology makes it the place New wants to grow into a stronger developer and creator."
    },
    {
      period: "Now",
      title: "From playing to building",
      body: "The personal motto is: as a kid I loved to play; now I love to build. Today New builds websites, explores AI workflows, creates content, and develops a Roblox MMO RPG project."
    }
  ],
  skills: [
    { name: "YouTube Content Creator", score: 9, body: "Strong at creating ideas, planning content, and presenting stories for online audiences." },
    { name: "Lua Roblox", score: 8, body: "Roblox scripting skill for gameplay systems, RPG mechanics, and interactive worlds." },
    { name: "Premiere Pro", score: 8, body: "Video editing skill for pacing, storytelling, transitions, and content polish." },
    { name: "HTML / CSS / JS", score: 7, body: "Frontend development for portfolio pages, UI interactions, and smooth web experiences." },
    { name: "UI/UX Design", score: 7, body: "Interface design, layout thinking, visual hierarchy, and user-friendly flow." },
    { name: "Photoshop", score: 6, body: "Graphic editing, visual assets, thumbnails, and creative compositions." },
    { name: "Python", score: 5, body: "Programming foundation for automation, logic, and AI-assisted development." },
    { name: "C in Unity", score: 4, body: "Basic game development knowledge for Unity logic and gameplay experiments." },
    { name: "AI Workflow", score: 10, body: "Uses AI as a creative partner to learn faster, build faster, and turn ideas into real products." }
  ],
  aiTools: [
    { name: "ChatGPT", body: "Used for planning, coding help, debugging, writing, and fast idea development." },
    { name: "Claude", body: "Used for long-form thinking, document cleanup, structured reasoning, and writing polish." },
    { name: "Gemini", body: "Used for research support, multimodal ideas, and comparing answers across AI models." },
    { name: "Grok", body: "Used for quick exploration, trend-aware thinking, and creative prompt experiments." }
  ],
  projects: [
    {
      id: "portfolio-site",
      title: "Personal Portfolio Website",
      type: "Website / Frontend / Portfolio",
      status: "In progress",
      body: "A black and orange KMITL-inspired portfolio website built to present New JA's life story, developer skills, works, certificates, and contact channels.",
      tags: ["HTML", "CSS", "JavaScript", "Smooth Transition", "KMITL Theme"]
    },
    {
      id: "roblox-mmorpg",
      title: "Roblox MMO RPG Game",
      type: "Game Development",
      status: "In progress",
      body: "A Roblox MMO RPG project focused on gameplay systems, world-building, character progression, and long-term content expansion.",
      tags: ["Roblox", "Lua", "MMO RPG", "Game Systems", "World Design"]
    },
    {
      id: "future-ai-lab",
      title: "Future AI Projects",
      type: "AI-assisted Creation",
      status: "Coming soon",
      body: "A future space for experiments that combine AI, coding, design, and creator workflows into useful tools and polished digital products.",
      tags: ["AI", "Automation", "Creative Coding", "Prototype"]
    }
  ],
  certificates: [
    { title: "Roblox Development Workshop", image: "assets/cer-1.jpg", body: "Awarded for joining the Basic to Advance Roblox Development Vol.1 Camp from Feb 21-23, 2025. The certificate represents hands-on learning in Roblox development, scripting concepts, game-building workflows, and the discipline to complete evening workshop sessions from 6:00 PM to 9:00 PM." },
    { title: "Make Game with AI", image: "assets/cer-2.jpg", body: "Certificate of completion for the Make Game with AI activity. This supports New JA's direction as a developer who combines game development, AI-assisted workflows, and creative problem solving." },
    { title: "Game with AI Workshop", image: "assets/cer-3.png", body: "A participation certificate for a Game with AI workshop. It shows growth in using AI as a practical tool for building ideas, designing systems, and experimenting with future game-development workflows." }
  ]
};

const state = {
  ...initialData,
  likeCounts: {},
  likedProjectIds: []
};
let session = null;
let authMode = "login";

const storyList = document.querySelector("#storyList");
const aiToolList = document.querySelector("#aiToolList");
const skillList = document.querySelector("#skillList");
const projectList = document.querySelector("#projectList");
const certificateList = document.querySelector("#certificateList");
const authModal = document.querySelector("#authModal");
const dashboardModal = document.querySelector("#dashboardModal");
const authForm = document.querySelector("#authForm");
const authTitle = document.querySelector("#authTitle");
const authKicker = document.querySelector("#authKicker");
const authCopy = document.querySelector("#authCopy");
const authSubmit = document.querySelector("#authSubmit");
const formStatus = document.querySelector("#formStatus");
const usernameField = document.querySelector("#usernameField");
const ageField = document.querySelector("#ageField");
const passwordRule = document.querySelector("#passwordRule");
const toast = document.querySelector("#toast");
const userBadge = document.querySelector("#userBadge");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    },
    ...options
  });

  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error || "Something went wrong.");
    error.status = response.status;
    throw error;
  }
  return data;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function renderStory() {
  storyList.innerHTML = state.story.map((item, index) => `
    <article class="timeline-item reveal">
      <span class="timeline-dot">${index + 1}</span>
      <time>${escapeHtml(item.period)}</time>
      <div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.body)}</p>
      </div>
    </article>
  `).join("");
}

function renderAiTools() {
  aiToolList.innerHTML = state.aiTools.map((tool) => `
    <article class="ai-card">
      <span>${escapeHtml(tool.name.slice(0, 2))}</span>
      <div>
        <h3>${escapeHtml(tool.name)}</h3>
        <p>${escapeHtml(tool.body)}</p>
      </div>
    </article>
  `).join("");
}

function renderSkills() {
  skillList.innerHTML = state.skills.map((skill) => `
    <article class="skill-card reveal">
      <h3>${escapeHtml(skill.name)}</h3>
      <p>${escapeHtml(skill.body)}</p>
      <div class="meter" aria-label="${escapeHtml(skill.name)} ${skill.score} out of 10">
        <span style="--value: ${skill.score * 10}%"></span>
      </div>
      <p><strong>${skill.score}/10</strong></p>
    </article>
  `).join("");
}

function getProjectLikeCount(projectId) {
  return state.likeCounts[projectId] || 0;
}

function renderProjects() {
  projectList.innerHTML = state.projects.map((project) => {
    const liked = state.likedProjectIds.includes(project.id);
    return `
      <article class="project-card reveal">
        <p class="kicker">${escapeHtml(project.type)}</p>
        <h3>${escapeHtml(project.title)}</h3>
        <p>${escapeHtml(project.body)}</p>
        <div class="project-meta">
          <span class="pill">${escapeHtml(project.status)}</span>
          <span class="pill">${getProjectLikeCount(project.id)} likes</span>
        </div>
        <div class="project-tags">
          ${project.tags.map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join("")}
        </div>
        <div class="like-row">
          <span>${liked ? "You liked this work" : "Login to like this work"}</span>
          <button class="like-btn ${liked ? "is-liked" : ""}" data-like="${project.id}" type="button">${liked ? "Liked" : "Like"}</button>
        </div>
      </article>
    `;
  }).join("");
  observeReveals();
}

function renderCertificates() {
  certificateList.innerHTML = state.certificates.map((cert) => `
    <article class="certificate-card reveal">
      <img src="${escapeHtml(cert.image)}" alt="${escapeHtml(cert.title)}">
      <div>
        <h3>${escapeHtml(cert.title)}</h3>
        <p>${escapeHtml(cert.body)}</p>
      </div>
    </article>
  `).join("");
}

function openAuth(mode) {
  authMode = mode;
  formStatus.textContent = "";
  authForm.reset();
  document.querySelector("#ageInput").value = 17;
  const isRegister = mode === "register";
  authKicker.textContent = isRegister ? "Register" : "Login";
  authTitle.textContent = isRegister ? "Create visitor account" : "Welcome back";
  authCopy.textContent = isRegister
    ? "Create a normal user account to like New JA's works."
    : "Login to like projects and access your member account.";
  authSubmit.textContent = isRegister ? "Register" : "Login";
  usernameField.hidden = !isRegister;
  ageField.hidden = !isRegister;
  passwordRule.hidden = !isRegister;
  document.querySelector("#usernameInput").required = isRegister;
  document.querySelector("#ageInput").required = isRegister;
  document.querySelector("#passwordInput").minLength = isRegister ? 10 : 1;
  authModal.showModal();
}

function updateAuthUi() {
  const isLoggedIn = Boolean(session);
  document.querySelector("#loginBtn").hidden = isLoggedIn;
  document.querySelector("#registerBtn").hidden = isLoggedIn;
  document.querySelector("#logoutBtn").hidden = !isLoggedIn;
  document.querySelector("#dashboardBtn").hidden = !(session && session.role === "admin");
  userBadge.hidden = !isLoggedIn;
  userBadge.textContent = isLoggedIn ? `${session.username} / ${session.role}` : "";
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateRegisterPassword(password) {
  return password.length >= 10
    && /[A-Z]/.test(password)
    && /[a-z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password);
}

async function handleAuth(event) {
  event.preventDefault();
  const username = document.querySelector("#usernameInput").value.trim();
  const email = document.querySelector("#emailInput").value.trim().toLowerCase();
  const password = document.querySelector("#passwordInput").value;
  const age = Number(document.querySelector("#ageInput").value || 0);

  if (!validateEmail(email)) {
    formStatus.textContent = "Please enter a valid email address.";
    return;
  }

  if (authMode === "register" && !validateRegisterPassword(password)) {
    formStatus.textContent = "Use 10+ characters with uppercase, lowercase, a number, and a symbol.";
    return;
  }

  authSubmit.disabled = true;
  formStatus.textContent = "Please wait...";
  try {
    const payload = authMode === "register"
      ? { username, email, password, age }
      : { email, password };
    const data = await api(`/api/auth/${authMode}`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    session = data.user;
    updateAuthUi();
    await loadLikes();
    authModal.close();
    showToast(authMode === "register"
      ? `Account created. Welcome, ${session.username}.`
      : `Welcome back, ${session.username}.`);
  } catch (error) {
    formStatus.textContent = error.message;
  } finally {
    authSubmit.disabled = false;
  }
}

async function handleLike(projectId) {
  if (!session) {
    openAuth("login");
    showToast("Login first, then you can like works.");
    return;
  }

  try {
    await api(`/api/projects/${encodeURIComponent(projectId)}/like`, { method: "POST" });
    await loadLikes();
  } catch (error) {
    if (error.status === 401) {
      session = null;
      updateAuthUi();
    }
    showToast(error.message);
  }
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function renderDashboard(data) {
  const userList = document.querySelector("#userList");
  const likeList = document.querySelector("#likeList");
  const logList = document.querySelector("#logList");
  const activeUsers = data.users.filter((user) => user.isActive).length;
  const admins = data.users.filter((user) => user.role === "admin").length;
  const totalLikes = data.likes.reduce((sum, item) => sum + Number(item.count), 0);

  document.querySelector("#adminStats").innerHTML = `
    <div><strong>${data.users.length}</strong><span>Accounts</span></div>
    <div><strong>${activeUsers}</strong><span>Active</span></div>
    <div><strong>${admins}</strong><span>Admins</span></div>
    <div><strong>${totalLikes}</strong><span>Likes</span></div>
  `;

  userList.innerHTML = data.users.length
    ? data.users.map((user) => {
      const isSelf = user.id === session.id;
      return `
      <div class="user-row">
        <p>
          <strong>${escapeHtml(user.username)}</strong>
          <span class="account-state ${user.isActive ? "is-active" : "is-disabled"}">${user.isActive ? "Active" : "Disabled"}</span>
          <br>${escapeHtml(user.email)}<br>
          <small>Age ${user.age ?? "-"} / Joined ${formatDate(user.createdAt)}</small>
        </p>
        <div class="user-actions">
          <select data-role-user="${user.id}" aria-label="Role for ${escapeHtml(user.username)}" ${isSelf ? "disabled" : ""}>
            <option value="user" ${user.role === "user" ? "selected" : ""}>User</option>
            <option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin</option>
          </select>
          <button class="ghost-btn compact" type="button" data-toggle-user="${user.id}" data-active="${user.isActive}" ${isSelf ? "disabled" : ""}>
            ${user.isActive ? "Disable" : "Enable"}
          </button>
          <button class="danger-btn" type="button" data-delete-user="${user.id}" ${isSelf ? "disabled" : ""}>Delete</button>
        </div>
      </div>
    `;
    }).join("")
    : "<p>No users yet.</p>";

  likeList.innerHTML = state.projects.map((project) => {
    const item = data.likes.find((like) => like.project_id === project.id);
    const names = item?.users?.map((user) => user.username).join(", ");
    return `
    <p><strong>${escapeHtml(project.title)}</strong><br>${Number(item?.count || 0)} likes
    ${names ? `<br><small>${escapeHtml(names)}</small>` : ""}</p>
  `;
  }).join("");

  logList.innerHTML = data.logs.length
    ? data.logs.map((log) => `
      <p>
        <strong>${escapeHtml(log.action)}</strong>
        <span class="log-actor">${escapeHtml(log.actor_email || "Anonymous")}</span><br>
        ${escapeHtml(log.target_type || "system")}${log.target_id ? ` / ${escapeHtml(log.target_id)}` : ""}
        <br><small>${formatDate(log.created_at)} / ${escapeHtml(log.ip_address || "unknown IP")}</small>
      </p>
    `).join("")
    : "<p>No logs yet.</p>";
}

async function openDashboard() {
  try {
    const data = await api("/api/admin/overview");
    renderDashboard(data);
    dashboardModal.showModal();
  } catch (error) {
    showToast(error.message);
  }
}

async function refreshDashboard() {
  const data = await api("/api/admin/overview");
  renderDashboard(data);
  await loadLikes();
}

async function updateUser(userId, changes) {
  try {
    await api(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body: JSON.stringify(changes)
    });
    await refreshDashboard();
    showToast("User account updated.");
  } catch (error) {
    showToast(error.message);
    await refreshDashboard().catch(() => {});
  }
}

async function deleteUser(userId) {
  if (!window.confirm("Delete this user and all of their sessions and likes?")) return;
  try {
    await api(`/api/admin/users/${encodeURIComponent(userId)}`, { method: "DELETE" });
    await refreshDashboard();
    showToast("User deleted.");
  } catch (error) {
    showToast(error.message);
  }
}

async function loadLikes() {
  const data = await api("/api/projects/likes");
  state.likeCounts = data.counts;
  state.likedProjectIds = data.likedProjectIds;
  renderProjects();
}

async function initializeSession() {
  try {
    const data = await api("/api/auth/me");
    session = data.user;
  } catch {
    session = null;
  }
  updateAuthUi();
  await loadLikes().catch(() => renderProjects());
}

document.querySelector("#loginBtn").addEventListener("click", () => openAuth("login"));
document.querySelector("#registerBtn").addEventListener("click", () => openAuth("register"));
document.querySelector("#logoutBtn").addEventListener("click", async () => {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch (error) {
    showToast(error.message);
  } finally {
    session = null;
    state.likedProjectIds = [];
    updateAuthUi();
    await loadLikes().catch(() => renderProjects());
    showToast("Logged out.");
  }
});
document.querySelector("#dashboardBtn").addEventListener("click", openDashboard);
document.querySelector("#closeAuthBtn").addEventListener("click", () => authModal.close());
document.querySelector("#closeDashboardBtn").addEventListener("click", () => dashboardModal.close());
authForm.addEventListener("submit", handleAuth);
projectList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-like]");
  if (button) handleLike(button.dataset.like);
});
document.querySelector("#userList").addEventListener("change", (event) => {
  const select = event.target.closest("[data-role-user]");
  if (select) updateUser(select.dataset.roleUser, { role: select.value });
});
document.querySelector("#userList").addEventListener("click", (event) => {
  const toggle = event.target.closest("[data-toggle-user]");
  if (toggle) {
    updateUser(toggle.dataset.toggleUser, { isActive: toggle.dataset.active !== "true" });
    return;
  }
  const remove = event.target.closest("[data-delete-user]");
  if (remove) deleteUser(remove.dataset.deleteUser);
});

function observeReveals() {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) entry.target.classList.add("is-visible");
    }
  }, { threshold: .16 });

  document.querySelectorAll(".reveal:not(.is-visible)").forEach((target) => observer.observe(target));
}

renderStory();
renderAiTools();
renderSkills();
renderProjects();
renderCertificates();
updateAuthUi();
observeReveals();
initializeSession();
