const problems = [
    {
      id: 1,
      title: "Find the largest element",
      href: "largest.html",
      topic: "Arrays",
      difficulty: "Easy",
      points: 20,
      description: "Find the biggest number present in an array."
    },
    {
      id: 2,
      title: "Reverse a string",
      href: "reverse.html",
      topic: "Strings",
      difficulty: "Easy",
      points: 20,
      description: "Reverse the characters of a given string."
    },
    // {
    //   id: 3,
    //   title: "Find the pair sum",
    //   topic: "Arrays",
    //   difficulty: "Easy",
    //   points: 20,
    //   description: "Find two numbers whose sum matches the target."
    // },
    {
        id: 3,
        title: "Check for a palindrome",
        href: "palindrome.html",
        topic: "Strings",
        difficulty: "Medium",
        points: 20,
        description: "Check whether a word reads the same backwards."
      },
    {
          id: 4,
          title: "Print a number pattern",
          href: "pattern.html",
          topic: "Loops",
          difficulty: "Hard",
          points: 45,
          description: "Use loops to print a simple number pattern."
        }
  ];
  
  const defaultCode = `class Main {
      public static void main(String[] args) {
          System.out.println("Hello, CodeForge!");
      }
  }`;
  
  const $ = (selector) => document.querySelector(selector);
  
  const STORAGE_KEY = "codeforge-student-progress";
  const VISITOR_KEY = "codeforge-visitor-id";
  const USER_STORAGE_KEY = "codeforge-user";
  const API_BASE = window.location.origin;

  let solvedIds = [];
  let points = 0;
  let toastTimer;
  
  function getVisitorId() {
    let visitorId = localStorage.getItem(VISITOR_KEY);
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, visitorId);
    }
    return visitorId;
  }

  function validSolvedIds(ids) {
    return [...new Set(ids.filter(id =>
      Number.isInteger(id) && problems.some(problem => problem.id === id)
    ))];
  }

  function calculatePoints() {
    points = problems.reduce((total, problem) =>
      solvedIds.includes(problem.id) ? total + problem.points : total, 0);
  }

  async function loadProgress() {
    let localSolved = [];
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && typeof saved === "object" && Array.isArray(saved.solved)) {
        localSolved = validSolvedIds(saved.solved);
      }
    } catch (error) {
      showToast("Saved browser progress could not be read.");
    }

    solvedIds = localSolved;
    calculatePoints();

    try {
      const response = await fetch(`${API_BASE}/api/progress/${encodeURIComponent(getVisitorId())}`);
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.data?.solved)) {
        throw new Error(result.message || "Unable to load saved progress.");
      }

      const serverSolved = validSolvedIds(result.data.solved);
      if (serverSolved.length === 0 && localSolved.length > 0) {
        solvedIds = localSolved;
        await saveProgress();
      } else {
        solvedIds = serverSolved;
      }
      calculatePoints();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ solved: solvedIds }));
    } catch (error) {
      showToast("Could not sync progress with the server; browser progress is shown.");
    }
  }
  
  async function saveProgress() {
    let savedInBrowser = false;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          solved: solvedIds
        })
      );
      savedInBrowser = true;
    } catch (error) {
      // Still try to save progress to the server if browser storage is unavailable.
    }

    try {
      const response = await fetch(`${API_BASE}/api/progress/${encodeURIComponent(getVisitorId())}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ solved: solvedIds })
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to save progress.");
      }
      return true;
    } catch (error) {
      if (savedInBrowser) return false;
      throw error;
    }
  }
  
  function showToast(message) {
    const toast = $("#toast");
  
    toast.textContent = message;
    toast.classList.add("show");
  
    clearTimeout(toastTimer);
  
    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2400);
  }
  
  function updateProgress() {
    const solvedCount = solvedIds.length;
    const percentage = Math.round(
      (solvedCount / problems.length) * 100
    );
  
    $("#solvedCount").innerHTML =
      `${solvedCount} <small>/ ${problems.length}</small>`;
  
    $("#pointsCount").textContent = points;
    $("#completionCount").textContent = `${percentage}%`;
  }
  
  function renderProblems() {
    const search = $("#searchInput").value
      .trim()
      .toLowerCase();
  
    const topic = $("#topicFilter").value;
    const difficulty = $("#difficultyFilter").value;
  
    const filtered = problems.filter(problem => {
      const searchableText = [
        problem.title,
        problem.topic,
        problem.description
      ].join(" ").toLowerCase();
  
      const matchesSearch = searchableText.includes(search);
      const matchesTopic = topic === "All" || problem.topic === topic;
      const matchesDifficulty =
        difficulty === "All" || problem.difficulty === difficulty;
  
      return matchesSearch && matchesTopic && matchesDifficulty;
    });
  
    $("#emptyMessage").hidden = filtered.length !== 0;
  
    $("#problemList").innerHTML = filtered.map(problem => {
      const solved = solvedIds.includes(problem.id);
  
      return `
        <article class="problem-row">
          <a class="problem-title problem-link" href="${problem.href}">
            <span class="problem-number">${String(problem.id).padStart(2, "0")}</span>
            <div>
              <h3>${problem.title}</h3>
              <p>${problem.description}</p>
            </div>
          </a>
  
          <span class="row-topic">${problem.topic}</span>
  
          <span class="level ${problem.difficulty.toLowerCase()}">
            ${problem.difficulty}
          </span>
  
          <span class="row-points">${problem.points} pts</span>
  
          <button
            class="solve-btn"
            data-id="${problem.id}"
            ${solved ? "disabled" : ""}
          >
            ${solved ? "✓ Completed" : "Mark complete"}
          </button>
        </article>
      `;
    }).join("");
  }
  
  function markCompleted(id) {
    const problem = problems.find(item => item.id === id);
  
    if (!problem || solvedIds.includes(id)) return;
  
    solvedIds.push(id);
  
    points = problems.reduce((total, item) => {
      return solvedIds.includes(item.id)
        ? total + item.points
        : total;
    }, 0);
  
    updateProgress();
    renderProblems();

    saveProgress()
      .then((savedToServer) => {
        showToast(savedToServer
            ? "Progress saved to this device and server."
          : "Progress saved in this browser; server sync failed.");
      })
      .catch(() => {
        showToast("Progress could not be saved. Please try again.");
      });
  }
  
  // Search and filters
  $("#searchInput").addEventListener("input", renderProblems);
  $("#topicFilter").addEventListener("change", renderProblems);
  $("#difficultyFilter").addEventListener("change", renderProblems);
  
  // Handle clicks on the problem list.
  $("#problemList").addEventListener("click", event => {
    const button = event.target.closest("[data-id]");
  
    if (!button) return;
  
    markCompleted(Number(button.dataset.id));
  });
  
  // Daily question loads a starter example into the editor.
  $("#dailyButton").addEventListener("click", () => {
    $("#codeInput").value = `class Main {
      public static void main(String[] args) {
          int[] numbers = {4, 9, 2, 17, 6};
  
          int largest = numbers[0];
  
          for (int number : numbers) {
              if (number > largest) {
                  largest = number;
              }
          }
  
          System.out.println(largest);
      }
  }`;
  
    $("#outputText").textContent =
      "Starter code loaded. Try understanding the loop first.";
  
    $("#runStatus").textContent = "Ready to preview";
  
    $("#workspace").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
  
  // Mobile navigation
  $("#mobileMenu").addEventListener("click", () => {
    const nav = $("#navLinks");
    const isOpen = nav.classList.toggle("open");
  
    $("#mobileMenu").setAttribute("aria-expanded", String(isOpen));
  });
  
  $("#navLinks").querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      $("#navLinks").classList.remove("open");
      $("#mobileMenu").setAttribute("aria-expanded", "false");
    });
  });
  
  // Reset editor
  $("#resetButton").addEventListener("click", () => {
    $("#codeInput").value = defaultCode;
    $("#outputText").textContent = "Editor reset.";
    $("#runStatus").textContent = "Waiting for code";
  });
  
  // Clear console output
  $("#clearButton").addEventListener("click", () => {
    $("#outputText").textContent = "";
    $("#runStatus").textContent = "Output cleared";
  });
  
  // Preview only basic Java print statements.
  // This deliberately does not execute arbitrary user code.
  $("#runButton").addEventListener("click", () => {
    const code = $("#codeInput").value;
  
    if (!code.trim()) {
      $("#outputText").textContent = "Write some code first.";
      $("#runStatus").textContent = "No code";
      return;
    }
    const printPattern =
      /System\.out\.println\(\s*("(?:[^"\\]|\\.)*"|-?\d+|true|false|null)\s*\)\s*;/g;
  
    const matches = [...code.matchAll(printPattern)];
  
    if (matches.length === 0) {
      $("#outputText").textContent =
        "No supported print statement found.\n\n" +
        "This demo only previews simple System.out.println() " +
        "statements. It does not compile or run Java.";
      $("#runStatus").textContent = "Preview only";
      return;
    }
  
    const output = matches.map(match => {
      const value = match[1];
  
      if (value.startsWith('"') && value.endsWith('"')) {
        return value
          .slice(1, -1)
          .replace(/\\n/g, "\n")
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, "\\");
      }
  
      return value;
    });
  
    $("#outputText").textContent =
      output.join("\n") +
      "\n\n[Preview only — Java was not executed.]";
  
    $("#runStatus").textContent = "Preview only";
  }); 
  function syncAuthUI() {
    const userBadge = $("#userBadge");
    const loginBtn = $("#navLogin");
    const signupBtn = $("#navSignup");
    const logoutBtn = $("#logoutBtn");

    try {
      const rawUser = localStorage.getItem(USER_STORAGE_KEY);
      const user = rawUser ? JSON.parse(rawUser) : null;

      if (user && user.email) {
        const displayName = user.fullName ? user.fullName.split(" ")[0] : user.email.split("@")[0];
        userBadge.textContent = `Hi, ${displayName}`;
        userBadge.hidden = false;
        loginBtn.hidden = true;
        signupBtn.hidden = true;
        logoutBtn.hidden = false;
        return;
      }
    } catch (error) {
      console.warn("Could not read user session:", error);
    }

    userBadge.hidden = true;
    loginBtn.hidden = false;
    signupBtn.hidden = false;
    logoutBtn.hidden = true;
  }

  $("#logoutBtn").addEventListener("click", () => {
    localStorage.removeItem(USER_STORAGE_KEY);
    syncAuthUI();
    window.location.reload();
  });

  // Footer year
  $("#currentYear").textContent = new Date().getFullYear();
  // Start the page
  syncAuthUI();
  loadProgress().then(() => {
    updateProgress();
    renderProblems();
  });