const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { pool } = require('./db'); // Importamos el pool de conexiones

// Lista de archivos CSV a importar
const filesToImport = [
  'ListaDeProductos.csv',
  'ListaDeProductos2.csv',
  'ListaDeProductos3.csv'
];

/**
 * Procesa un solo archivo CSV y lo inserta en la base de datos.
 * @param {string} fileName - El nombre del archivo CSV en la misma carpeta.
 */
async function processFile(fileName) {
  const filePath = path.join(__dirname, fileName);
  const results = [];
  let rowCount = 0;
  let processedCount = 0; // Contador para las filas realmente insertadas

  console.log(`Iniciando procesamiento de: ${fileName}...`);

  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        results.push(data);
        rowCount++; // Cuenta todas las filas leídas
      })
      .on('end', async () => {
        console.log(`Archivo ${fileName} leído. ${rowCount} filas encontradas. Insertando en la base de datos...`);
        
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          for (const row of results) {
            // ----- MAPEAMOS LAS NUEVAS CABECERALS -----
            const cod = row['_Codigo'];

            // ----- VALIDACIÓN IMPORTANTE -----
            // Si la fila no tiene código (es una fila vacía o dato corrupto), la saltamos.
            if (!cod || cod.trim() === '') {
              // Opcional: logear si quieres ver cuántas filas se saltan
              // console.warn('Fila saltada: no se encontró código de producto.');
              continue; // Salta al siguiente 'row' del loop
            }

            // Si llegamos aquí, la fila es válida y la procesamos
            const desc = row['_Descripcion'];
            const capacidad = row['_Capacidad'];
            const grupo = row['_Grupo'];
            const tsEstandar = row['_TS Estandar'];
            const codTabla = row['_Cod. Tabla'];
            const descCapacidad = row['_Desc Capacid'];

            // Convertimos el precio, que ahora viene de '_Precio Venta'
            const rawPrice = row['_Precio Venta'];
            let precio = null; // Default to NULL

            if (rawPrice && rawPrice.trim() !== '') {
              // Si hay un valor, intentamos parsearlo
              const parsedPrice = parseFloat(rawPrice.replace(',', '.'));
              
              if (!isNaN(parsedPrice)) {
                // Solo si es un número válido, lo usamos
                precio = parsedPrice;
              } else {
                // Si es un texto inválido (ej. "abc"), logeamos y queda NULL
                console.warn(`Precio inválido ('${rawPrice}') para el código ${cod}. Se usará NULL.`);
              }
            }
            // Si rawPrice está vacío o solo espacios, 'precio' se mantiene como NULL.
            
            // ----- CONSULTA SQL CORRECTA -----
            const queryText = `
              INSERT INTO products (code, description, capacity, product_group, ts_standard, table_code, price, capacity_description, created_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
              ON CONFLICT (code) DO NOTHING; 
            `;
            
            const queryValues = [cod, desc, capacidad, grupo, tsEstandar, codTabla, precio, descCapacidad];
            
            await client.query(queryText, queryValues);
            processedCount++; // Contamos la fila como procesada
          }

          await client.query('COMMIT');
          console.log(`¡Éxito! Se procesaron ${processedCount} filas de ${fileName}. (Se saltaron ${rowCount - processedCount} filas vacías)`);
          resolve();

        } catch (error) {
          await client.query('ROLLBACK');
          // Error específico para violación de NOT NULL
          if (error.code === '23502') { // Código de error de PostgreSQL para NOT NULL VIOLATION
             console.error(`Error durante la inserción de ${fileName}: la columna '${error.column}' no puede ser nula. Revisa tus datos CSV.`);
          } else {
             console.error(`Error durante la inserción de ${fileName}:`, error.message);
          }
          reject(error);
        } finally {
          client.release();
        }
      })
      .on('error', (error) => {
        console.error(`Error leyendo el archivo ${fileName}:`, error.message);
        reject(error);
      });
  });
}

/**
 * Función principal para cargar todos los archivos.
 */
async function loadAllData() {
  console.log('Iniciando script de carga de productos...');
  
  for (const file of filesToImport) {
    try {
      await processFile(file);
    } catch (error) {
      console.error(`No se pudo procesar el archivo ${file}. Saltando al siguiente.`);
    }
  }
  
  console.log('Script de carga finalizado.');
  pool.end(); // Cerramos el pool de conexiones al finalizar
}

// Ejecutamos la función principal
loadAllData();