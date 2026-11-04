
const express = require("express");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.disable("x-powered-by");

// Validasi konfigurasi URL
function getEndpoint(name) {
    const value = process.env[name];

    if (!value) {
        throw new Error(`Environment ${name} belum tersedia.`);
    }

    const url = new URL(value);

    if (url.protocol !== "https:") {
        throw new Error(`Environment ${name} harus HTTPS.`);
    }

    return url;
}

const VEND_ENDPOINT = getEndpoint("VEND_SEARCH_ENDPOINT");
const ITEMS_ENDPOINT = getEndpoint("ITEM_DATABASE_ENDPOINT");

// Mengambil data JSON dari server upstream
async function fetchJson(url) {
    const response = await fetch(url, {
        headers: {
            Accept: "application/json"
        },
        signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
        throw new Error("Upstream request failed.");
    }

    return response.json();
}

// Frontend
app.get(["/", "/index.html"], (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/style.css", (req, res) => {
    res.sendFile(path.join(__dirname, "style.css"));
});

app.get("/script.js", (req, res) => {
    res.sendFile(path.join(__dirname, "script.js"));
});

// Pencarian vending
app.get("/api/vend-search", async (req, res) => {
    try {
        const { item_id } = req.query;

        if (
            typeof item_id !== "string" ||
            !/^\d+$/.test(item_id)
        ) {
            return res.status(400).json({
                success: false,
                message: "Item ID tidak valid."
            });
        }

        const url = new URL(VEND_ENDPOINT);

        url.searchParams.set("item_id", item_id);
        url.searchParams.set("limit", "500");
        url.searchParams.set("order_by", "newest");

        const data = await fetchJson(url);

        res.set("Cache-Control", "no-store");
        return res.json(data);

    } catch (error) {
        console.error("Vend search gagal.");

        return res.status(502).json({
            success: false,
            message: "Pencarian sementara tidak tersedia."
        });
    }
});

// Database nama item
app.get("/api/items", async (req, res) => {
    try {
        const result = await fetchJson(ITEMS_ENDPOINT);

        if (!Array.isArray(result.names)) {
            throw new Error("Format database item tidak valid.");
        }

        const items = result.names.map((name, id) => ({
            id,
            name
        }));

        res.set("Cache-Control", "public, max-age=3600");

        return res.json({
            success: true,
            count: items.length,
            data: items
        });

    } catch (error) {
        console.error("Database item gagal dimuat.");

        return res.status(502).json({
            success: false,
            message: "Database item tidak tersedia."
        });
    }
});

// Endpoint tidak dikenal
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Endpoint tidak ditemukan."
    });
});

// Jalankan server lokal
app.listen(PORT, "127.0.0.1", () => {
    console.log(`VendFinder aktif di http://localhost:${PORT}`);
});
