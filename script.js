const navButtons = document.querySelectorAll(".nav-pill");
const pages = document.querySelectorAll(".page");
const nextButtons = document.querySelectorAll("[data-next]");
const statusText = document.getElementById("status-text");
const saveViewButton = document.getElementById("save-view");
const storageKey = "agenda-rural-current-page";

function showPage(pageName) {
  navButtons.forEach((button) => {
    const isActive = button.dataset.page === pageName;
    button.classList.toggle("active", isActive);
  });

  pages.forEach((page) => {
    const isActive = page.id === `page-${pageName}`;
    page.classList.toggle("active", isActive);
  });

  localStorage.setItem(storageKey, pageName);

  if (statusText) {
    const labels = {
      productor: "👤 Estás viendo la página del productor.",
      animales: "🐾 Estás viendo la página de animales.",
      medicamentos: "💊 Estás viendo la página de medicamentos.",
      insumos: "🧰 Estás viendo la página de insumos.",
      procedimientos: "🩺 Estás viendo la página de procedimientos."
    };

    statusText.textContent = labels[pageName] || "Navega por las páginas para revisar cada sección por separado.";
  }
}

navButtons.forEach((button) => {
  button.addEventListener("click", () => showPage(button.dataset.page));
});

nextButtons.forEach((button) => {
  button.addEventListener("click", () => showPage(button.dataset.next));
});

saveViewButton?.addEventListener("click", () => {
  const activePage = document.querySelector(".nav-pill.active")?.dataset.page || "productor";
  localStorage.setItem(storageKey, activePage);
  statusText.textContent = `💾 Vista guardada. La próxima vez abrirá en la página: ${activePage}.`;
});

const savedPage = localStorage.getItem(storageKey) || "productor";
showPage(savedPage);
