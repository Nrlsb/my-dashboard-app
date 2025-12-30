const fs = require("fs");
const path = require("path");

// --- CONFIGURACIÓN DE PRECIOS (Gemini 1.5 Flash) ---
// Precios por cada 1,000,000 de tokens
const PRECIO_ENTRADA_1M = 0.075;
const PRECIO_SALIDA_1M = 0.30;

const archivoLog = path.join(__dirname, "../logs/registro_facturacion.csv");

// Asegurar que el directorio de logs exista
const logDir = path.dirname(archivoLog);
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

/**
 * Función para calcular y reportar el gasto total acumulado en el archivo
 */
function obtenerGastoTotal() {
    if (!fs.existsSync(archivoLog)) return 0;

    const contenido = fs.readFileSync(archivoLog, "utf8");
    const lineas = contenido.split("\n");
    let acumulado = 0;

    // Empezamos en 1 para saltar la cabecera
    for (let i = 1; i < lineas.length; i++) {
        const columnas = lineas[i].split(",");
        if (columnas.length >= 6) {
            const costo = parseFloat(columnas[5]);
            if (!isNaN(costo)) {
                acumulado += costo;
            }
        }
    }
    return acumulado;
}

/**
 * Función para registrar la facturación en un archivo CSV
 */
function registrarFacturacion(prompt, inputTokens, outputTokens, modelName = "gemini-1.5-flash") {
    // Calcular costos individuales y totales
    const costoEntrada = (inputTokens / 1_000_000) * PRECIO_ENTRADA_1M;
    const costoSalida = (outputTokens / 1_000_000) * PRECIO_SALIDA_1M;
    const costoTotal = costoEntrada + costoSalida;

    const fecha = new Date().toLocaleString();
    // Limpiar el prompt para el CSV (remover comas y saltos de linea, limitar longitud)
    const promptRef = (prompt || "").substring(0, 50).replace(/,/g, "").replace(/\n/g, " ") + "...";

    // Crear cabecera si el archivo no existe
    if (!fs.existsSync(archivoLog)) {
        const cabecera = "Fecha,Modelo,Prompt_Ref,Tokens_In,Tokens_Out,Costo_USD_Total\n";
        fs.writeFileSync(archivoLog, cabecera);
    }

    // Crear la línea de datos
    const nuevaLinea = `${fecha},${modelName},${promptRef},${inputTokens},${outputTokens},${costoTotal.toFixed(8)}\n`;

    // Agregar al archivo sin borrar lo anterior
    fs.appendFileSync(archivoLog, nuevaLinea);

    console.log(`\n[SISTEMA] Registro guardado en registro_facturacion.csv`);
    console.log(`[COSTO LLAMADA] $${costoTotal.toFixed(8)} USD`);

    // Mostrar el total acumulado
    const totalHistorico = obtenerGastoTotal();
    console.log(`[GASTO TOTAL ACUMULADO] $${totalHistorico.toFixed(6)} USD`);

    return {
        costoTotal,
        totalHistorico
    };
}

module.exports = {
    registrarFacturacion,
    obtenerGastoTotal
};
