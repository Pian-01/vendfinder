
const express = require("express");

const app = express();
const PORT = 3000;

// Menyediakan file frontend (HTML, CSS, JS)
app.use(express.static(__dirname));

// Endpoint untuk pencarian vending
app.get("/api/vend-search", async (req, res) => {
    try {
        const { item_id } = req.query;

        if (!item_id || !/^\d+$/.test(item_id)) {
            return res.status(400).json({
                success: false,
                message: "Item ID tidak valid."
            });
        }

        const params = new URLSearchParams({
            item_id,
            limit: "500",
            order_by: "newest"
        });

        const apiUrl =
            `https://tokodl.com/api/tools/vend-search?${params}`;

        const response = await fetch(apiUrl);

        if (!response.ok) {
            return res.status(response.status).json({
                success: false,
                message: "Gagal mengambil data dari Tokodl."
            });
        }

        const data = await response.json();

        res.json(data);

    } catch (error) {
        console.error("API Error:", error);

        res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server VendFinder."
        });
    }
});

// Mengambil database nama item Growtopia
app.get("/api/items", async (req, res) => {
    try {
        const response = await fetch(
            "https://tokodl.com/assets/growtopia/items-names.json?v=gt27-2"
        );

        if (!response.ok) {
            throw new Error("Gagal mengambil database item.");
        }

        const result = await response.json();

        const items = result.names.map((name, id) => ({
            id,
            name
        }));

        res.json({
            success: true,
            count: items.length,
            data: items
        });

    } catch (error) {
        console.error("Item Database Error:", error);

        res.status(500).json({
            success: false,
            message: "Gagal memuat database item."
        });
    }
});

app.listen(PORT, () => {
    console.log(`VendFinder berjalan di http://localhost:${PORT}`);
});
