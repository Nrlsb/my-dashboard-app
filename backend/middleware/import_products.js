/*
* =================================================================
* SCRIPT DE IMPORTACIÓN DE PRODUCTOS DESDE CSV
* =================================================================
*
* Requisitos:
* 1. Colocar los 3 archivos CSV en esta misma carpeta (backend/middleware/):
* - ListaDeProductos.csv
* - ListaDeProductos2.csv
* - ListaDeProductos3.csv
*
* 2. Haber ejecutado `npm install` en esta carpeta (para tener 'csv-parser').
*
* Para ejecutar:
* 1. node import_products.js
* =================================================================
*/

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const db = require('./db'); // Importa tu pool de conexión existente

// Nombres de los archivos CSV (deben estar en la misma carpeta)
const FILE1 = 'ListaDeProductos.csv';
const FILE2 = 'ListaDeProductos2.csv';
const FILE3 = 'ListaDeProductos3.csv';

// Mapa para consolidar los datos de los 3 archivos
// Estructura: Map<Codigo, { id, name, brand, price, stock }>
const productsMap = new Map();

/**
 * Función genérica para leer un CSV y procesar sus filas.
 * @param {string} filePath - Ruta al archivo CSV.
 * @param {function} processRow - Función que procesa cada fila del CSV.
 * @returns {Promise<void>}
 */
function readCSV(filePath, processRow) {
  return new Promise((resolve, reject) => {
    console.log(`--- Iniciando lectura de ${filePath}...`);
    
    // (CORRECCIÓN) Añadimos { encoding: 'latin1' } para leer correctamente
    // archivos CSV de Windows/Excel.
    fs.createReadStream(path.join(__dirname, filePath), { encoding: 'latin1' }) 
      .pipe(csv())
      .on('data', (row) => {
        try {
          processRow(row);
        } catch (error) {
          console.error(`Error procesando fila en ${filePath}:`, row, error);
          reject(error);
        }
      })
      .on('end', () => {
        console.log(`--- Lectura de ${filePath} finalizada.`);
        resolve();
      })
      .on('error', (error) => {
        console.error(`Error al leer ${filePath}:`, error);
        reject(error);
      });
  });
}

/**
 * Limpia y convierte un precio de string (ej. "1.234,50") a número (ej. 1234.50).
 * @param {string} priceString - El precio como string.
 * @returns {number}
 */
function parsePrice(priceString) {
  if (!priceString) return 0;
  // Quita puntos (miles) y reemplaza coma (decimal) por punto
  const cleanedPrice = priceString.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleanedPrice) || 0;
}

/**
 * Función principal que orquesta la lectura y la inserción en BD.
 */
async function importProducts() {
  console.log('Iniciando script de importación de productos...');
  
  try {
    // --- PASO 1: Leer y procesar los 3 CSVs en memoria ---

    // Archivo 1: ListaDeProductos.csv (Contiene Codigo, Grupo/Brand)
    await readCSV(FILE1, (row) => {
      const codigo = row.Codigo;
      if (!codigo) return;
      
      const product = productsMap.get(codigo) || { id: codigo, stock: 0 }; // Asignamos stock 0
      product.brand = row['Grupo'];
      productsMap.set(codigo, product);
    });

    // Archivo 2: ListaDeProductos2.csv (Contiene Codigo, Precio Venta)
    await readCSV(FILE2, (row) => {
      const codigo = row.Codigo;
      if (!codigo) return;
      
      const product = productsMap.get(codigo) || { id: codigo, stock: 0 };
      product.price = parsePrice(row['Precio Venta']);
      productsMap.set(codigo, product);
    });

    // Archivo 3: ListaDeProductos3.csv (Contiene Codigo, Desc Capacid/Name)
    await readCSV(FILE3, (row) => {
      const codigo = row.Codigo;
      if (!codigo) return;
      
      const product = productsMap.get(codigo) || { id: codigo, stock: 0 };
      product.name = row['Desc Capacid'];
      productsMap.set(codigo, product);
    });

    console.log(`\nDatos de CSV consolidados. Total de productos únicos: ${productsMap.size}`);

    // --- PASO 2: Insertar/Actualizar en la Base de Datos ---

    console.log('Iniciando transacción con la base de datos...');
    const client = await db.query('BEGIN'); // Iniciar transacción

    let insertedCount = 0;
    let updatedCount = 0;

    // Usamos ON CONFLICT para actualizar productos si ya existen (basado en el 'id'/'Codigo')
    const queryText = `
      INSERT INTO products (id, name, brand, price, stock)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        brand = EXCLUDED.brand,
        price = EXCLUDED.price,
        stock = EXCLUDED.stock
      RETURNING xmax; -- xmax es 0 para inserción, no-cero para actualización
    `;

    for (const [id, product] of productsMap.entries()) {
      // Validar que tenemos los datos mínimos (name y price son NOT NULL en tu setup.sql)
      if (!product.name || product.price === undefined) {
        console.warn(`Producto omitido (datos incompletos): Codigo=${id}`, product);
        continue;
      }

      const params = [
        id,
        product.name,
        product.brand || 'Sin Marca', // Default si no tiene marca
        product.price,
        product.stock || 0 // Default si no tiene stock
      ];
      
      const result = await db.query(queryText, params);
      
      if (result.rows[0].xmax === '0') {
        insertedCount++;
      } else {
        updatedCount++;
      }
    }

    await db.query('COMMIT'); // Finalizar transacción
    console.log('\n¡Importación completada con éxito!');
    console.log(`  Productos Nuevos Insertados: ${insertedCount}`);
    console.log(`  Productos Existentes Actualizados: ${updatedCount}`);
    console.log(`  Productos Omitidos (datos incompletos): ${productsMap.size - insertedCount - updatedCount}`);

  } catch (error) {
    console.error('\nERROR: Ocurrió un error durante la importación.', error);
    await db.query('ROLLBACK'); // Revertir cambios en caso de error
    console.log('Transacción revertida (ROLLBACK).');
  } finally {
    console.log('Script finalizado.');
    // 'db' es un pool, no necesita cerrarse explícitamente aquí
    // Si 'db' no fuera un pool, se usaría db.end()
  }
}

// Ejecutar la función principal
importProducts(); // (CORREGIDO) Antes decía main()