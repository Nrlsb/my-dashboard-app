/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */

// Script de Carga de Productos a PostgreSQL
// Uso: node loadProducts.js

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./db'); // Importa el pool de conexión

// Lista de archivos CSV a procesar
const csvFiles = [
  'ListaDeProductos.csv',
  'ListaDeProductos2.csv',
  'ListaDeProductos3.csv'
];

// --- Función de limpieza de datos ---
// Limpia comillas (una o más) y espacios.
function cleanData(value) {
  if (typeof value !== 'string') {
    return value;
  }
  // --- CORRECCIÓN 2: Regex mejorado ---
  // Reemplaza una o más comillas (") del inicio O del final del string.
  // "000001      -> 000001
  // ""MERCADERIA"" -> MERCADERIA
  // "             -> (string vacío)
  return value
    .trim() // Quita espacios en blanco
    .replace(/^"+|"+$/g, ''); // Quita todas las comillas de los bordes
}

// --- Función de parseo numérico ---
// Convierte un string (ej. "1.500,50") a un número (ej. 1500.50)
function parseDecimal(str) {
  if (!str) return null;
  const cleaned = str
    .replace(/\./g, '') // Quita separadores de miles (puntos)
    .replace(',', '.'); // Cambia coma decimal por punto decimal
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// --- Función de parseo de enteros ---
function parseIntStrict(str) {
  if (!str) return null;
  const num = parseInt(str.trim(), 10);
  return isNaN(num) ? null : num;
}

// --- Función Principal de Procesamiento ---
async function processFile(fileName) {
  console.log(`Iniciando procesamiento de: ${fileName}...`);
  const filePath = path.join(__dirname, fileName);
  let fileContent;

  try {
    // Se mantiene 'latin1' por robustez con tildes
    fileContent = fs.readFileSync(filePath, 'latin1');
  } catch (err) {
    console.error(`Error al leer el archivo ${fileName}:`, err.message);
    return;
  }

  const allLines = fileContent.split('\n'); // Dividir por líneas

  // Asumir que la primera línea es el encabezado y la saltamos
  const header = allLines.shift();
  if (!header) {
    console.error(`Archivo ${fileName} está vacío o no tiene encabezado.`);
    return;
  }

  // Mapeo (según el script):
  // B1_COD, B1_DESC, B1_SUCURSAL, B1_PRECIO, B1_STOCK, B1_OFERTA
  console.log(`Archivo ${fileName} leído. ${allLines.length} filas encontradas. Insertando en la base de datos...`);

  let processedCount = 0;
  let skippedCount = 0;
  let firstRowDebug = true; // Flag para depuración
  const client = await pool.connect();

  try {
    await client.query('BEGIN'); // Iniciar transacción

    for (const line of allLines) {
      const trimmedLine = line.trim();

      if (trimmedLine === '') {
        skippedCount++;
        continue; // Saltar líneas realmente vacías
      }

      // --- CORRECCIÓN 1: Cambiar delimitador a coma (,) ---
      const columns = trimmedLine.split(',');

      // Validar que la fila tiene la cantidad esperada de columnas
      if (columns.length < 6) { 
        // console.warn(`Fila mal formateada (columnas: ${columns.length}): ${trimmedLine}`);
        skippedCount++;
        continue; // Saltar fila mal formateada
      }

      // Limpiar y asignar datos (usando la nueva función cleanData)
      const b1_cod = cleanData(columns[0]);
      const b1_desc = cleanData(columns[1]);
      const b1_sucursal = cleanData(columns[2]);
      
      // Parsear valores numéricos
      const b1_precio = parseDecimal(cleanData(columns[3])); // Limpiar ANTES de parsear
      const b1_stock = parseIntStrict(cleanData(columns[4])); // Limpiar ANTES de parsear
      
      // Parsear valor booleano
      const ofertaStr = cleanData(columns[5]).toLowerCase();
      const b1_oferta = (ofertaStr === 'true' || ofertaStr === '1' || ofertaStr === 't');

      // Validar datos clave antes de insertar
      if (!b1_cod || !b1_desc || b1_precio === null || b1_stock === null) {
        // console.warn(`Fila con datos inválidos (código, desc, precio o stock nulos): ${trimmedLine}`);
        skippedCount++;
        continue;
      }

      // --- DEBUG: Imprimir la primera fila procesada ---
      if (firstRowDebug) {
        console.log('--- [DEBUG] Mostrando primera fila procesada ---');
        console.log(`  CSV[0] (COD)    -> "${columns[0]}" \t-> ${b1_cod}`);
        console.log(`  CSV[1] (DESC)   -> "${columns[1]}" \t-> ${b1_desc}`);
        console.log(`  CSV[2] (SUC?)   -> "${columns[2]}" \t-> ${b1_sucursal}`);
        console.log(`  CSV[3] (PRECIO?) -> "${columns[3]}" \t-> ${b1_precio}`);
        console.log(`  CSV[4] (STOCK?)  -> "${columns[4]}" \t-> ${b1_stock}`);
        console.log(`  CSV[5] (OFERTA?) -> "${columns[5]}" \t-> ${b1_oferta}`);
        console.log('--------------------------------------------------');
        firstRowDebug = false; // No imprimir más
      }
      // --- Fin DEBUG ---

      // Insertar en la base de datos
      const query = `
        INSERT INTO products (B1_COD, B1_DESC, B1_SUCURSAL, B1_PRECIO, B1_STOCK, B1_OFERTA)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (B1_COD) DO UPDATE SET
          B1_DESC = EXCLUDED.B1_DESC,
          B1_SUCURSAL = EXCLUDED.B1_SUCURSAL,
          B1_PRECIO = EXCLUDED.B1_PRECIO,
          B1_STOCK = EXCLUDED.B1_STOCK,
          B1_OFERTA = EXCLUDED.B1_OFERTA;
      `;
      
      await client.query(query, [b1_cod, b1_desc, b1_sucursal, b1_precio, b1_stock, b1_oferta]);
      processedCount++;

    } // Fin del bucle for

    await client.query('COMMIT'); // Finalizar transacción
    console.log(`¡Éxito! Se procesaron ${processedCount} filas de ${fileName}. (Se saltaron ${skippedCount} filas inválidas o vacías)`);

  } catch (err) {
    await client.query('ROLLBACK'); // Revertir en caso de error
    console.error(`Error durante la transacción para ${fileName}:`, err.message);
    console.error('Se revirtieron todos los cambios de este archivo.');
  } finally {
    client.release(); // Liberar cliente
  }
}

// --- Función de Ejecución Principal ---
async function main() {
  console.log('Iniciando script de carga de productos...');
  
  for (const fileName of csvFiles) {
    await processFile(fileName);
  }

  console.log('Script de carga finalizado.');
  await pool.end(); // Cerrar el pool de conexiones
}

// Ejecutar el script
main().catch(err => {
  console.error('Error fatal en el script:', err);
  pool.end();
});