const API_URL = "/api/vend-search";
const itemSuggestions = document.getElementById("itemSuggestions");

let itemDatabase = [];
let selectedItemId = null;

const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const resultList = document.getElementById("resultList");

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

        displayResults(result.data);

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

searchButton.addEventListener("click", searchItems);

searchInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        searchItems();
    }
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