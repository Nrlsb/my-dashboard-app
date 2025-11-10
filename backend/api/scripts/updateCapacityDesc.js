// Importar los módulos necesarios
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { pool } = require('../db'); // <-- CAMBIO DE RUTA

// 1. Apuntar al archivo de descripciones de capacidad
// __dirname ahora es 'backend/api/scripts', así que subimos un nivel
const filePath = path.join(__dirname, '../ListaDeProductos3.csv');
const productsToUpdate = [];

console.log(`Iniciando la lectura de descripciones desde: ${filePath}`);

fs.createReadStream(filePath)
  .pipe(csv({
    bom: true,
    trim: true,
    separator: ';', // <--- CAMBIO SOLICITADO
    
    // ======================================================
    // --- Configuración del Parser (reutilizada) ---
    // ======================================================
    
    // 1. Ignoramos las comillas (") como caracteres especiales
    quote: '\b', 
    
    // 2. Limpiamos las comillas (") de los encabezados (headers)
    mapHeaders: ({ header }) => header.trim().replace(/"/g, ''),
    
    // 3. Limpiamos las comillas (") de los valores (values)
    mapValues: ({ header, index, value }) => value.trim().replace(/"/g, '')
    // ======================================================
    
  }))
  .on('data', (row) => {
    productsToUpdate.push(row);
  })
  .on('end', async () => {
    console.log(`Lectura de CSV completada. Se encontraron ${productsToUpdate.length} descripciones para actualizar.`);
    
    if (productsToUpdate.length === 0) {
      console.log('No se encontraron productos para actualizar.');
      pool.end();
      return;
    }

    const client = await pool.connect();
    console.log('Conectado a la base de datos PostgreSQL.');

    try {
      await client.query('BEGIN');
      console.log('Transacción de actualización iniciada.');
      
      let updatedCount = 0;
      let failedCount = 0;
      let rowCounter = 0;

      for (const row of productsToUpdate) {
        rowCounter++;
        
        // 2. Limpiar y preparar los datos
        // (La limpieza de comillas ahora la hace 'mapValues')
        const code = row['Codigo'];
        const capacityDesc = row['Desc Capacid']; // <-- NUEVA COLUMNA
        
        if (!code) {
          console.warn(`Fila ${rowCounter} omitida: El 'Codigo' está vacío o es nulo. Datos:`, row);
          failedCount++;
          continue; // Omitir esta fila
        }

        // 3. Definir el query de ACTUALIZACIÓN (UPDATE)
        const query = `
          UPDATE products 
          SET 
            capacity_description = $1
          WHERE 
            code = $2
        `;
        const values = [capacityDesc, code]; // <-- VALORES ACTUALIZADOS

        try {
          const result = await client.query(query, values);
          
          if (result.rowCount > 0) {
            updatedCount++;
          } else {
            console.warn(`Fila ${rowCounter} (Cod: ${code}): No se encontró un producto coincidente en la BD para actualizar.`);
            failedCount++;
          }
          
          if (rowCounter % 500 === 0) {
             console.log(`Procesados ${rowCounter} de ${productsToUpdate.length}...`);
          }

        } catch (updateError) {
          console.error(`\n--- ERROR AL ACTUALIZAR LA FILA N° ${rowCounter} (Cod: ${code}) ---`);
          console.error("Datos de la fila del CSV que falló:");
          console.log(row);
          console.error("Valores que se intentaron actualizar:");
          console.log(values);
          throw updateError; // Detener y hacer rollback
        }
      }

      await client.query('COMMIT');
      console.log('¡Éxito! Transacción completada.');
      console.log(`Resultados: ${updatedCount} descripciones actualizadas, ${failedCount} filas omitidas/no encontradas.`);

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error durante la actualización. Se revirtió la transacción:', error.message);
    } finally {
      client.release();
      console.log('Conexión a la base de datos liberada.');
      pool.end();
    }
  })
  .on('error', (error) => {
    console.error('Error al leer el archivo CSV:', error);
  });