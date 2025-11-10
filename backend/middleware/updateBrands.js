// Importar los módulos necesarios
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { pool } = require('./db');

// 1. Apuntar al archivo de mapeo de marcas (ListaDeProductos4.csv)
const filePath = path.join(__dirname, 'ListaDeProductos4.csv');
// Almacenará los mapeos, ej: [ { 'Cod. Grupo': '0101', 'Marca': '3D ARGENTINA' }, ... ]
const groupToBrandMap = [];

console.log(`Iniciando la lectura de mapeo Grupo->Marca desde: ${filePath}`);

fs.createReadStream(filePath)
  .pipe(csv({
    bom: true,
    trim: true,
    separator: ';', // Usamos el separador de punto y coma
    
    // Configuración del Parser (reutilizada de los otros scripts)
    quote: '\b', 
    mapHeaders: ({ header }) => header.trim().replace(/"/g, ''),
    mapValues: ({ header, index, value }) => value.trim().replace(/"/g, '')
    
  }))
  .on('data', (row) => {
    // Añadimos el mapeo (la fila entera) al array
    groupToBrandMap.push(row);
  })
  .on('end', async () => {
    console.log(`Lectura de CSV completada. Se encontraron ${groupToBrandMap.length} mapeos de Grupo a Marca.`);
    
    if (groupToBrandMap.length === 0) {
      console.log('No se encontraron mapeos para actualizar.');
      pool.end();
      return;
    }

    const client = await pool.connect();
    console.log('Conectado a la base de datos PostgreSQL.');

    try {
      await client.query('BEGIN');
      console.log('Transacción de actualización de marcas (por grupo) iniciada.');
      
      let updatedGroups = 0;
      let affectedRows = 0; // Contador total de productos actualizados
      let failedGroups = 0;
      let rowCounter = 0;

      for (const row of groupToBrandMap) {
        rowCounter++;
        
        // 2. Preparar los datos leídos del CSV
        const groupCode = row['Cod. Grupo'];
        const brand = row['Desc. Grupo'];
        
        if (!groupCode) {
          console.warn(`Fila ${rowCounter} omitida: El 'Cod. Grupo' está vacío o es nulo. Datos:`, row);
          failedGroups++;
          continue; // Omitir esta fila
        }
        
        if (!brand) {
          console.warn(`Fila ${rowCounter} (Grupo: ${groupCode}) omitida: La 'Marca' está vacía o es nula.`);
          failedGroups++;
          continue; // Omitir esta fila
        }


        // 3. Definir el query de ACTUALIZACIÓN (UPDATE)
        // LÓGICA CORREGIDA:
        // Actualiza la columna 'brand' en TODOS los productos
        // donde 'product_group' coincida con el 'Cod. Grupo' del CSV.
        const query = `
          UPDATE products 
          SET 
            brand = $1
          WHERE 
            product_group = $2
        `;
        // Los valores son la MARCA y el CÓDIGO DE GRUPO
        const values = [brand, groupCode];

        try {
          const result = await client.query(query, values);
          
          // result.rowCount nos dirá cuántos productos fueron actualizados
          if (result.rowCount > 0) {
            updatedGroups++;
            affectedRows += result.rowCount; // Sumamos el total de productos afectados
            console.log(`Grupo ${groupCode} ('${brand}'): ${result.rowCount} productos actualizados.`);
          } else {
            // Esto es normal si no hay productos de ese grupo
            console.warn(`Fila ${rowCounter} (Grupo: ${groupCode}): No se encontraron productos con ese grupo para actualizar.`);
            failedGroups++;
          }

        } catch (updateError) {
          console.error(`\n--- ERROR AL ACTUALIZAR EL GRUPO N° ${rowCounter} (Grupo: ${groupCode}) ---`);
          console.error("Datos de la fila del CSV que falló:");
          console.log(row);
          console.error("Valores que se intentaron actualizar:");
          console.log(values);
          throw updateError; // Detener y hacer rollback
        }
      }

      await client.query('COMMIT');
      console.log('¡Éxito! Transacción completada.');
      console.log(`Resultados: ${updatedGroups} grupos procesados, ${affectedRows} productos en total actualizados, ${failedGroups} grupos omitidos/no encontrados.`);

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