const { pool2 } = require('../db');

async function checkProduct() {
    try {
        console.log("Checking for product code '000113' and variants...");

        const exact = await pool2.query("SELECT id, b1_cod, b1_desc FROM products WHERE b1_cod = '000113'");
        console.log("Exact match '000113':", exact.rows);

        const like = await pool2.query("SELECT id, b1_cod, b1_desc FROM products WHERE b1_cod LIKE '%113%' LIMIT 5");
        console.log("Like match '%113%':", like.rows);

        const trimmed = await pool2.query("SELECT id, b1_cod, b1_desc FROM products WHERE TRIM(b1_cod) = '000113'");
        console.log("Trimmed match '000113':", trimmed.rows);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit();
    }
}

checkProduct();
