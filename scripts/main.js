// scripts/main.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
  set,
  update
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAmE_yVCfiM0P6HnS7K70aeFpk9hFi--lI",
  authDomain: "sololevelling-b9c67.firebaseapp.com",
  databaseURL: "https://sololevelling-b9c67-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "sololevelling-b9c67",
  storageBucket: "sololevelling-b9c67.appspot.com",
  messagingSenderId: "745212757936",
  appId: "1:745212757936:web:7975461a65b8bec07ab875"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

window.login = async () => {
  const email = document.getElementById("email-input").value;
  const password = document.getElementById("password-input").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    alert("Login failed: " + error.message);
  }
};

window.logout = () => {
  signOut(auth).then(() => location.reload());
};

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    document.getElementById("login-screen").style.display = "block";
    document.getElementById("dashboard").style.display = "none";
    return;
  }

  document.getElementById("login-screen").style.display = "none";
  document.getElementById("dashboard").style.display = "block";

  const today = new Date().toISOString().split('T')[0];
  const entryRef = ref(db, `users/${user.uid}/entries/${today}`);
  const taskRef = ref(db, `users/${user.uid}/xp_tasks`);

  try {
    // XP Tasks
    const taskSelect = document.getElementById("xp_task_select");
    if (taskSelect) {
      const taskSnap = await get(taskRef);
      if (taskSnap.exists()) {
        const tasks = taskSnap.val();
        for (const id in tasks) {
          const { title, value } = tasks[id];
          const opt = document.createElement("option");
          opt.value = `${title}::${value}`;
          opt.textContent = `${title} (+${value} XP)`;
          taskSelect.appendChild(opt);
        }
      }
    }

    // Daily Entry
    const snap = await get(entryRef);
    if (!snap.exists()) return;
    const data = snap.val();
    const safe = (val, def = "--") => val ?? def;

    const xp = data.xp || {};
    const totalXP = parseInt(xp.weekly_xp_progress) || 0;
    const level = Math.floor(Math.sqrt(totalXP / 100));
    const xpToNext = 100 * (level + 1) ** 2;
    const progress = Math.min((totalXP / xpToNext) * 100, 100).toFixed(1);

    document.getElementById("xp_total").textContent = safe(xp.daily_total_xp);
    document.getElementById("current_level").textContent = level;
    document.getElementById("xp_to_next_level").textContent = xpToNext - totalXP;

    const bar = document.getElementById("xp_progress");
    bar.style.width = `${progress}%`;
    bar.setAttribute("aria-valuenow", progress);
    bar.textContent = `${progress}%`;

    const physical = data.physical || {};
    document.getElementById("weight").textContent = safe(physical.weight_kg);
    document.getElementById("energy").textContent = safe(physical.daily_energy_level);

    const diet = data.diet || {};
    document.getElementById("healthy_meals").textContent = safe(diet.healthy_meals);
    document.getElementById("processed").textContent = safe(diet.processed_food_intake);

    const prod = data.productivity || {};
    document.getElementById("focus").textContent = safe(prod.focused_work_hours);
    document.getElementById("tasks").textContent = safe(prod.main_tasks_completed);

    const mood = data.mood || {};
    document.getElementById("mood").textContent = safe(mood.mood_today);
    document.getElementById("stress").textContent = safe(mood.stress_level);

    const sleep = data.sleep || {};
    document.getElementById("sleep_hours").textContent = safe(sleep.total_sleep_hours);
    document.getElementById("sleep_quality").textContent = safe(sleep.sleep_quality);

    const finances = data.finances || {};
    document.getElementById("debt").textContent = safe(finances.debt_total);
    document.getElementById("savings").textContent = safe(finances.savings_balance);

    const self = data.selfimprovement || {};
    document.getElementById("learning").textContent = safe(self.learning_hours_today);
    document.getElementById("confidence").textContent = safe(self.confidence_level);

  } catch (err) {
    console.error("❌ Error loading dashboard:", err);
  }
});

window.quickCompleteXP = async () => {
  const select = document.getElementById("xp_task_select");
  const selectedValue = select.value;
  if (!selectedValue) return alert("Please select a task");

  const [title, valueStr] = selectedValue.split("::");
  const value = parseInt(valueStr);
  const user = auth.currentUser;
  if (!user) return alert("You must be logged in");

  const today = new Date().toISOString().split('T')[0];
  const entryRef = ref(db, `users/${user.uid}/entries/${today}/xp`);

  try {
    const snapshot = await get(entryRef);
    const data = snapshot.exists() ? snapshot.val() : {};
    const prevTotal = parseInt(data.daily_total_xp || 0);
    const prevWeek = parseInt(data.weekly_xp_progress || 0);
    const updated = {
      daily_total_xp: prevTotal + value,
      weekly_xp_progress: prevWeek + value
    };
    await update(entryRef, updated);
    alert(`✅ Added '${title}' (${value} XP)`);
    location.reload();
  } catch (err) {
    console.error("XP Save Failed", err);
    alert("❌ Failed to complete task");
  }
};