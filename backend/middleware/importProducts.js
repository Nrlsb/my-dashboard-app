// Importar los módulos necesarios
const fs = require('fs'); // Módulo de sistema de archivos (File System)
const path = require('path'); // Módulo para manejar rutas de archivos
const csv = require('csv-parser'); // Módulo para parsear (leer) archivos CSV
const { pool } = require('./db'); // Importamos el pool de conexiones de tu db.js

// ======================================================
// --- INICIO DE MODIFICACIÓN 1: Apuntar al archivo de prueba ---
// ======================================================
// Definir la ruta al archivo CSV
// !! IMPORTANTE: Apuntamos a ListaDeProductos.csv para la prueba
const filePath = path.join(__dirname, 'ListaDeProductos.csv');
// ======================================================
// --- FIN DE MODIFICACIÓN 1 ---
// ======================================================

// Array para almacenar los productos leídos del CSV
const products = [];

console.log(`Iniciando la lectura del archivo CSV: ${filePath}`);

// Crear un stream de lectura del archivo
fs.createReadStream(filePath)
  // Añadimos opciones para limpiar los encabezados y definir el separador
  .pipe(csv({ 
    bom: true, // Asegura que se elimine el BOM (Byte Order Mark)
    trim: true, // Elimina espacios en blanco de los encabezados
    
    // ======================================================
    // --- INICIO DE MODIFICACIÓN 2: Configuración del Parser ---
    // ======================================================
    
    // 1. Le decimos al parser que ignore las comillas (") como
    // caracteres especiales, pasándole un carácter que NUNCA
    // aparecerá en el archivo (como 'retroceso' o '\b').
    quote: '\b', // <-- AQUÍ ESTÁ EL CAMBIO
    
    // 2. Limpiamos las comillas (") de los encabezados (headers)
    mapHeaders: ({ header }) => header.trim().replace(/"/g, ''),
    
    // 3. Limpiamos las comillas (") de los valores (values)
    mapValues: ({ header, index, value }) => value.trim().replace(/"/g, '')
    // ======================================================
    // --- FIN DE MODIFICACIÓN 2 ---
    // ======================================================
    
  })) 
  .on('data', (row) => {
    // 'row' es un objeto: { 'Codigo': '...', 'Descripcion': '...', ... }
    products.push(row);
  })
  .on('end', async () => {
    // Esta función se llama cuando se termina de leer el archivo
    console.log(`Lectura del CSV completada. Se encontraron ${products.length} productos.`);
    
    // Si no se encontraron productos, no continuamos.
    if (products.length === 0) {
      console.log('No se encontraron productos para importar.');
      pool.end();
      return;
    }

    // Ahora, conectamos a la base de datos e insertamos los datos
    const client = await pool.connect();
    console.log('Conectado a la base de datos PostgreSQL.');

    try {
      // Iniciar una transacción.
      await client.query('BEGIN');
      console.log('Transacción iniciada.');
      
      let rowCounter = 0; // Contador para saber qué fila falla

      // Iterar sobre cada producto y crear la consulta de inserción
      for (const row of products) {
        
        rowCounter++; // Incrementamos el contador

        const query = `
          INSERT INTO products (code, description, capacity, product_group, ts_standard, table_code, price, capacity_description) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;
        
        // Mapeo de columnas del CSV a la Base de Datos
        // Las columnas que no existan en ListaDeProductos.csv (como 'Precio Venta')
        // serán 'undefined' y se insertarán como NULL (lo cual está bien).
        const values = [
          row['Codigo'],          // De ListaDeProductos.csv
          row['Descripcion'],     // De ListaDeProductos.csv
          row['Capacidad'],       // De ListaDeProductos.csv
          row['Grupo'],           // De ListaDeProductos.csv
          row['TS Estandar'],    // De ListaDeProductos.csv
          row['Cod. Tabla'],     // (Será undefined, no está en este CSV)
          row['Precio Venta'],    // (Será undefined, no está en este CSV)
          row['Desc Capacid']     // (Será undefined, no está en este CSV)
        ];
        
        // Añadimos un try/catch INTERNO solo para el log
        try {
          // Ejecutar la consulta por cada fila
          await client.query(query, values);
        
        } catch (insertError) {
          // ¡Aquí capturamos la fila exacta que falló!
          console.error(`\n--- ERROR AL INSERTAR LA FILA N° ${rowCounter} DEL CSV ---`);
          console.error("Datos de la fila del CSV que falló:");
          console.log(row);
          console.error("Valores que se intentaron insertar (los 'undefined' son normales si la columna no existe en el CSV):");
          console.log(values);
          
          // Lanzamos el error de nuevo para que el catch exterior
          // pueda hacer el ROLLBACK de la transacción.
          throw insertError;
        }
      }
      
      // Si el bucle termina sin errores, confirmamos la transacción
      await client.query('COMMIT');
      console.log('¡Éxito! Todos los productos han sido importados correctamente.');
      
    } catch (error) {
      // Si ocurre un error, revertimos la transacción
      await client.query('ROLLBACK');
      // El log de arriba (dentro del bucle) ya nos habrá dado los detalles
      console.error('Error durante la importación. Se revirtió la transacción:', error.message);
    } finally {
      // En cualquier caso (éxito o error), liberamos el cliente de la base de datos
      client.release();
      console.log('Conexión a la base de datos liberada.');
      pool.end(); // Cerramos el pool ya que el script termina aquí
    }
  })
  .on('error', (error) => {
    // Manejo de errores al leer el archivo
    console.error('Error al leer el archivo CSV:', error);
  });