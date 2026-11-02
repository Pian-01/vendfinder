
const items = [
    {
        id: 566,
        name: "Angel Wings",
        price: "5 WL",
        world: "ANGEL"
    },
    {
        id: 1796,
        name: "Diamond Lock",
        price: "100 WL",
        world: "DLSHOP"
    },
    {
        id: 242,
        name: "World Lock",
        price: "1 WL",
        world: "WLSHOP"
    }
];

const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const resultList = document.getElementById("resultList");

function searchItems() {
    const keyword = searchInput.value.trim().toLowerCase();

    if (!keyword) {
        resultList.innerHTML = `
            <p class="empty">Please enter an item name or ID.</p>
        `;
        return;
    }

    const results = items.filter(item =>
        item.name.toLowerCase().includes(keyword) ||
        String(item.id).includes(keyword)
    );

    if (results.length === 0) {
        resultList.innerHTML = `
            <p class="empty">Item not found.</p>
        `;
        return;
    }

    
        resultList.innerHTML = results.map(item => `
          <div class="item-card">
                <div class="item-details">
                    <h4>${item.name}</h4>
                   <p>ID: ${item.id}</p>
                </div>

                <div class="item-info">
                   <strong>${item.price}</strong>
                   <span>World: ${item.world}</span>
                   <button onclick="copyWorld('${item.world}')">
                    Copy World
                  </button>
                </div>
          </div>
        `).join("");

}

searchButton.addEventListener("click", searchItems);

searchInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        searchItems();
    }
});


function copyWorld(world) {
    navigator.clipboard.writeText(world)
        .then(() => {
            alert("World " + world + " berhasil disalin!");
        })
        .catch(() => {
            alert("Gagal menyalin world.");
        });
}
