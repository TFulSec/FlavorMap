const express = require("express");
const cors = require("cors");
const sql = require("mssql");

const app = express();

app.use(cors());
app.use(express.json());

const config = {
    server: "DESKTOP-35VIVUJ",
    database: "FlavorMap",
    options: {
        trustServerCertificate: true,
        trustedConnection: true
    }
};

app.get("/", (req, res) => {
    res.send("Server OK");
});

app.post("/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        await sql.connect(config);

        await sql.query`
            INSERT INTO Users (username, email, password_hash)
            VALUES (${username}, ${email}, ${password})
        `;

        res.json({
            message: "Đăng ký thành công và đã lưu DB"
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: "Lỗi kết nối database"
        });
    }
});

app.listen(3000, () => {
    console.log("Server chạy tại cổng 3000");
});