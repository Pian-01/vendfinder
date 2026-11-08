const API_URL = "/api/vend-search";
const itemSuggestions = document.getElementById("itemSuggestions");

let itemDatabase = [];
let selectedItemId = null;

const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const resultList = document.getElementById("resultList");
const worldSearch = document.getElementById("worldSearch");
const sortFilter = document.getElementById("sortFilter");
const accessFilter = document.getElementById("accessFilter");

let currentVendingItems = [];

async function searchItems() {
    const inputValue = searchInput.value.trim();

    let itemId;

    if (selectedItemId !== null) {
        itemId = selectedItemId;
    } else if (/^\d+$/.test(inputValue)) {
        itemId = inputValue;
    } else {
        resultList.innerHTML = `
            <p class="empty">
                Pilih nama item dari rekomendasi terlebih dahulu.
            </p>
        `;
        return;
    }

    resultList.innerHTML = '<p class="empty">Mencari vending...</p>';
    searchButton.disabled = true;
    if (!itemId) {
        resultList.innerHTML = '<p class="empty">Masukkan ID item terlebih dahulu.</p>';
        return;
    }

    resultList.innerHTML = '<p class="empty">Mencari vending...</p>';
    searchButton.disabled = true;

    try {
        const params = new URLSearchParams({
            item_id: itemId,
            limit: 500,
            order_by: "newest"
        });

        const response = await fetch(`${API_URL}?${params}`);
        
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error("API gagal mengambil data.");
        }

        currentVendingItems = Array.isArray(result.data)
          ? result.data
          : [];

        renderFilteredResults();

    } catch (error) {
        console.error("VendFinder Error:", error);

        resultList.innerHTML = `
            <p class="empty">
                Gagal mengambil data vending.
                Periksa koneksi atau akses API.
            </p>
        `;
    } finally {
        searchButton.disabled = false;
    }

    addSearchHistory({
    id: selectedItemId,
    name: searchInput.value.trim()
    });
}

function getUnitPrice(price) {
    const value = Number(price);

    if (!Number.isFinite(value) || value === 0) {
        return Infinity;
    }

    // Harga negatif: N WL per item
    // Harga positif: N item per WL
    return value < 0 ? 1 / Math.abs(value) : value;
}

function renderFilteredResults() {
    const query = worldSearch.value.trim().toLowerCase();
    const access = accessFilter.value;
    const sort = sortFilter.value;

    let filtered = currentVendingItems.filter(item => {
        const matchesWorld = String(item.world_name || "")
            .toLowerCase()
            .includes(query);

        const isAccessible = Number(item.accessible) === 1;

        const matchesAccess =
            access === "all" ||
            (access === "accessible" && isAccessible) ||
            (access === "restricted" && !isAccessible);

        return matchesWorld && matchesAccess;
    });

    if (sort === "cheapest") {
        filtered.sort((a, b) =>
            getUnitPrice(a.price) - getUnitPrice(b.price)
        );
    } else if (sort === "expensive") {
        filtered.sort((a, b) =>
            getUnitPrice(b.price) - getUnitPrice(a.price)
        );
    }

    displayResults(filtered);
}

function displayResults(items) {
    if (!items || items.length === 0) {
        resultList.innerHTML = '<p class="empty">Tidak ada vending ditemukan.</p>';
        return;
    }

    resultList.innerHTML = items.map(item => {
        const priceText = item.price < 0
            ? `${Math.abs(item.price)}/1`
            : `${item.price} each`;

        return `
            <div class="result-card">
                <div>
                    <h4>${escapeHTML(item.world_name)}</h4>
                    <p>
                        X: ${Number(item.x)} |
                        Y: ${Number(item.y)}
                    </p>
                    <p>Harga: ${priceText}</p>
                    <p>${item.accessible ? "Dapat diakses" : "Akses terbatas"}</p>
                </div>

                <button onclick="copyWorld('${escapeHTML(item.world_name)}')">
                    Copy World
                </button>
            </div>
        `;
    }).join("");
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function copyWorld(world) {
    navigator.clipboard.writeText(world)
        .then(() => alert(`World ${world} berhasil disalin!`))
        .catch(() => alert("Gagal menyalin world."));
}

searchButton.addEventListener("click", () => {
    searchItems();
    scrollToResults();
});


searchInput.addEventListener("keydown", event => {
    if (event.key !== "Enter") return;

    event.preventDefault();

    // Jika sudah memilih rekomendasi, langsung cari
    if (selectedItemId !== null) {
        itemSuggestions.style.display = "none";
        searchItems();
        return;
    }

    const inputValue = searchInput.value.trim().toLowerCase();

    // Jika input berupa ID angka, langsung cari
    if (/^\d+$/.test(inputValue)) {
        itemSuggestions.style.display = "none";
        searchItems();
        return;
    }

    // Cari rekomendasi terdekat
    const matches = itemDatabase
        .filter(item =>
            item.name.toLowerCase().includes(inputValue)
        )
        .sort((a, b) => {
            const aName = a.name.toLowerCase();
            const bName = b.name.toLowerCase();

            const aStarts = aName.startsWith(inputValue);
            const bStarts = bName.startsWith(inputValue);

            return Number(bStarts) - Number(aStarts);
        });

    if (matches.length === 0) {
        return;
    }

    // Pilih rekomendasi pertama
    const selectedItem = matches[0];

    selectedItemId = Number(selectedItem.id);
    searchInput.value = selectedItem.name;

    itemSuggestions.style.display = "none";

    searchItems();
});


async function loadItemDatabase() {
    try {
        const response = await fetch("/api/items");
        const result = await response.json();

        if (!result.success) {
            throw new Error("Gagal memuat database item.");
        }

        itemDatabase = result.data;

        console.log("Database item berhasil dimuat:", itemDatabase.length);

    } catch (error) {
        console.error("Item Database Error:", error);
    }
}

function showSuggestions(keyword) {
    const query = keyword.trim().toLowerCase();

    if (!query || /^\d+$/.test(query)) {
        itemSuggestions.style.display = "none";
        return;
    }

    const matches = itemDatabase
        .filter(item => item.name.toLowerCase().includes(query))
        .sort((a, b) => {
            const aStarts = a.name.toLowerCase().startsWith(query);
            const bStarts = b.name.toLowerCase().startsWith(query);

            return Number(bStarts) - Number(aStarts);
        })
        .slice(0, 8);
        console.log("Hasil rekomendasi:", matches);
        console.log("Elemen dropdown:", itemSuggestions);

    if (matches.length === 0) {
        itemSuggestions.style.display = "none";
        return;
    }

    itemSuggestions.innerHTML = matches.map(item => `
        <div class="suggestion-item"
             data-id="${item.id}"
             data-name="${escapeHTML(item.name)}">
            <span>${escapeHTML(item.name)}</span>
            <small>ID: ${item.id}</small>
        </div>
    `).join("");

    itemSuggestions.style.display = "block";
}

searchInput.addEventListener("input", () => {
    console.log("Input:", searchInput.value);
    console.log("Total database:", itemDatabase.length);

    selectedItemId = null;
    showSuggestions(searchInput.value);
});

itemSuggestions.addEventListener("click", event => {
    const suggestion = event.target.closest(".suggestion-item");

    if (!suggestion) return;

    selectedItemId = Number(suggestion.dataset.id);
    searchInput.value = suggestion.dataset.name;

    itemSuggestions.style.display = "none";

    searchItems();
});

loadItemDatabase();

worldSearch.addEventListener("input", renderFilteredResults);
sortFilter.addEventListener("change", renderFilteredResults);
accessFilter.addEventListener("change", renderFilteredResults);

// ===============================
// SEARCH HISTORY
// ===============================

const HISTORY_KEY = "vendfinder_search_history";
const MAX_HISTORY = 15;

const searchHistory = document.getElementById("searchHistory");
const historyList = document.getElementById("historyList");
const clearHistoryButton = document.getElementById("clearHistory");

function getSearchHistory() {
    try {
        return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    } catch {
        return [];
    }
}

function saveSearchHistory(history) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function addSearchHistory(item) {
    if (!item || !item.name || item.id == null) return;

    let history = getSearchHistory();

    // Hapus item yang sama agar tidak duplikat
    history = history.filter(entry => String(entry.id) !== String(item.id));

    // Masukkan pencarian terbaru ke posisi pertama
    history.unshift({
        id: item.id,
        name: item.name
    });

    // Maksimal 15 riwayat
    history = history.slice(0, MAX_HISTORY);

    saveSearchHistory(history);
    renderSearchHistory();
}

function renderSearchHistory() {
    const history = getSearchHistory();

    historyList.innerHTML = "";

    if (history.length === 0) {
        historyList.innerHTML = `
            <div class="history-empty">
                No recent searches
            </div>
        `;
        return;
    }

    history.forEach((item, index) => {
        const element = document.createElement("div");
        element.className = "history-item";

        const name = document.createElement("span");
        name.className = "history-item-name";
        name.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i>`;
        name.appendChild(document.createTextNode(item.name));

        const removeButton = document.createElement("button");
        removeButton.className = "remove-history";
        removeButton.type = "button";
        removeButton.innerHTML = "&times;";
        removeButton.title = "Remove history";

        removeButton.addEventListener("click", (event) => {
            event.stopPropagation();

            const updatedHistory = getSearchHistory();
            updatedHistory.splice(index, 1);

            saveSearchHistory(updatedHistory);
            renderSearchHistory();
        });

        element.appendChild(name);
        element.appendChild(removeButton);

        element.addEventListener("click", () => {
            searchInput.value = item.name;

            // Jalankan fungsi pencarian yang sudah ada
            searchButton.click();
        });

        historyList.appendChild(element);
    });
}

// Tampilkan history saat input fokus dan kosong
searchInput.addEventListener("focus", () => {
    renderSearchHistory();
    searchHistory.classList.add("show");
});

// Clear all history
clearHistoryButton.addEventListener("click", () => {
    localStorage.removeItem(HISTORY_KEY);
    renderSearchHistory();
});

// Sembunyikan dropdown ketika klik di luar
document.addEventListener("click", (event) => {
    if (
        !searchHistory.contains(event.target) &&
        !searchInput.contains(event.target)
    ) {

    }
});

function scrollToResults() {
    const results = document.getElementById("searchResults");

    if (!results) return;

    results.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

// Render awal
renderSearchHistory();