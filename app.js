const grid = document.getElementById("championsGrid");
const searchInput = document.getElementById("searchInput");
const filterRadios = document.querySelectorAll("input[name='filter']");
const counter = document.getElementById("counter");
const exportBtn = document.getElementById("exportBtn");
const importInput = document.getElementById("importInput");
const LANG_KEY = "lol-lang";
const importModal = document.getElementById("importModal");
const modalText = document.getElementById("modalText");
const closeModal = document.getElementById("closeModal");
const replaceBtn = document.getElementById("replaceBtn");
const addBtn = document.getElementById("addBtn");

const translations = {
  es: {
    title: "Campeones con victoria",
    searchPlaceholder: "Buscar campeón...",
    completed: "Completados",
    export: "Exportar progreso",
    import: "Importar progreso",
    filterAll: "Todos",
    filterWon: "Con victoria",
    filterNotWon: "Sin victoria",
    donate: "Buy me a coffee",
    // AGREGA ESTAS LÍNEAS:
    importReplaceOrAdd: "¿Quieres sustituir tu progreso actual o añadir los nuevos campeones?",
    replace: "Sustituir",
    add: "Añadir"
  },
  en: {
    title: "Champions with victory",
    searchPlaceholder: "Search champion...",
    completed: "Completed",
    export: "Export progress",
    import: "Import progress",
    filterAll: "All",
    filterWon: "Won",
    filterNotWon: "Not won",
    donate: "Buy me a coffee",
    // AGREGA ESTAS LÍNEAS:
    importReplaceOrAdd: "Do you want to replace your current progress or add to it?",
    replace: "Replace",
    add: "Add"
  }
};
let currentLang =  "en";


const STORAGE_KEY = "lol-wins";
let champions = [];
let wins = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));

async function loadChampions() {
  const versionsRes = await fetch(
    "https://ddragon.leagueoflegends.com/api/versions.json"
  );
  const versions = await versionsRes.json();
  const latestVersion = versions[0];

  const champsRes = await fetch(
    `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/es_ES/champion.json`
  );
  const data = await champsRes.json();

  champions = Object.values(data.data).map(c => ({
    id: c.id,
    name: c.name,
    image: `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/champion/${c.image.full}`
  }));

  render();
}

document.addEventListener("DOMContentLoaded", () => {
  render();           // Render de campeones
  applyLanguage();    // Traducciones
});

function openImportModal(winsArray) {
  modalText.textContent = translations[currentLang].importReplaceOrAdd;
  replaceBtn.textContent = translations[currentLang].replace || "Sustituir";
  addBtn.textContent = translations[currentLang].add || "Añadir";
  importModal.style.display = "flex";

  replaceBtn.onclick = () => {
    wins = new Set(winsArray);
    finishImport();
  };

  addBtn.onclick = () => {
    winsArray.forEach(c => wins.add(c));
    finishImport();
  };
}

function saveWins() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...wins]));
}

exportBtn.addEventListener("click", () => {
  const data = {
    wins: [...wins],
    exportedAt: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "lol-wins-progress.json";
  a.click();

  URL.revokeObjectURL(url);
});


function toggleWin(championId) {
  if (wins.has(championId)) {
    wins.delete(championId);
  } else {
    wins.add(championId);
  }
  saveWins();
  render();
}

function getActiveFilter() {
  return document.querySelector("input[name='filter']:checked").value;
}

function render() {
  counter.textContent = `Completados: ${wins.size}`;

  const search = searchInput.value.toLowerCase();
  const filter = getActiveFilter();

  grid.innerHTML = "";

  champions
    .filter(c => c.name.toLowerCase().includes(search))
    .filter(c => {
      if (filter === "won") return wins.has(c.id);
      if (filter === "not-won") return !wins.has(c.id);
      return true;
    })
    .forEach(champ => {
      const div = document.createElement("div");
      div.className = "champion" + (wins.has(champ.id) ? " won" : "");
      div.onclick = () => toggleWin(champ.id);

      div.innerHTML = `
        <img src="${champ.image}" alt="${champ.name}" />
        <div class="champion-name">${champ.name}</div>
      `;

      grid.appendChild(div);
    });
}

searchInput.addEventListener("input", render);
filterRadios.forEach(radio => radio.addEventListener("change", render));

loadChampions();
function applyLanguage() {
  const t = translations[currentLang];

  // Título
  document.querySelector("h1").textContent = t.title;

  // Placeholder buscador
  const searchInput = document.getElementById("searchInput");
  searchInput.placeholder = t.searchPlaceholder;

  // Contador
  const counter = document.getElementById("counter");
  counter.textContent = `${t.completed}: ${wins.size}`;

  // Botones Export / Import
  const exportBtn = document.getElementById("exportBtn");
  exportBtn.textContent = t.export;

  const importLabel = document.querySelector(".import-btn");
  importLabel.childNodes[0].textContent = t.import;

  // Filtros
  document.querySelector('input[value="all"]').parentNode.lastChild.textContent = " " + t.filterAll;
  document.querySelector('input[value="won"]').parentNode.lastChild.textContent = " " + t.filterWon;
  document.querySelector('input[value="not-won"]').parentNode.lastChild.textContent = " " + t.filterNotWon;

  // Tipjar
  document.querySelector(".tipjar").textContent = "☕ " + t.donate;

  // Banderas: resaltar activa
  document.querySelectorAll(".lang-flag").forEach(flag => {
    flag.classList.toggle("active", flag.dataset.lang === currentLang);
  });
}


document.querySelectorAll(".lang-flag").forEach(flag => {
  flag.addEventListener("click", () => {
    currentLang = flag.dataset.lang;
    localStorage.setItem("lang", currentLang);
    applyLanguage();
  });
});



importInput.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);

      // Soporte para array directo o { wins: [...] }
      let winsArray = Array.isArray(data) ? data : data.wins;

      // Validación flexible: array de strings o números (IDs)
      if (!Array.isArray(winsArray)) throw new Error("Formato incorrecto");
      winsArray = winsArray.map(String); // Convertir todo a string

      // Abrir modal de añadir/sustituir
      openImportModal(winsArray);

    } catch (err) {
      alert("Archivo inválido: asegúrate de que es un JSON correcto de la app");
      console.error(err);
    }
  };

  reader.readAsText(file);
});

function finishImport() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...wins])); 

  document.getElementById("counter").textContent = `${translations[currentLang].completed}: ${wins.size}`;
  
  render();
  importModal.style.display = "none";
  
  // Limpiar el input para permitir importar el mismo archivo dos veces si fuera necesario
  importInput.value = ""; 
}
closeModal.addEventListener("click", () => {
  importModal.style.display = "none";
});

window.onclick = (event) => {
  if (event.target == importModal) {
    importModal.style.display = "none";
  }
};

applyLanguage();
