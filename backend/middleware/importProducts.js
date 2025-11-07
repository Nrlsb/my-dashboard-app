// Importar los módulos necesarios
const fs = require('fs'); // Módulo de sistema de archivos (File System)
const path = require('path'); // Módulo para manejar rutas de archivos
const csv = require('csv-parser'); // Módulo para parsear (leer) archivos CSV
const { pool } = require('./db'); // Importamos el pool de conexiones de tu db.js

// Definir la ruta al archivo CSV
// !! IMPORTANTE: Ahora apuntamos a ListaDeProductos2.csv
const filePath = path.join(__dirname, 'ListaDeProductos2.csv');

// Array para almacenar los productos leídos del CSV
const products = [];

// --> NUEVO: Contador para depuración
// let rowCounter = 0; // <-- Eliminamos el contador de depuración

console.log('Iniciando la lectura del archivo CSV...');

// Crear un stream de lectura del archivo
fs.createReadStream(filePath)
  // Añadimos opciones para limpiar los encabezados y definir el separador
  .pipe(csv({ 
    bom: true, // Asegura que se elimine el BOM (Byte Order Mark)
    trim: true, // Elimina espacios en blanco de los encabezados
    // separator: ';' // <-- ¡Eliminado! Usará la coma (,) por defecto.
    
    // --> ¡NUEVA SOLUCIÓN!
    // Esta función limpia cada encabezado antes de usarlo.
    // Quita espacios y, lo más importante, las comillas (").
    mapHeaders: ({ header }) => header.trim().replace(/"/g, '')
    
  })) 
  .on('data', (row) => {

    // --> INICIO DE SECCIÓN DE DEPURACIÓN
    // (Hemos eliminado todo el bloque de depuración y el process.exit())
    // --> FIN DE SECCIÓN DE DEPURACIÓN

    // 'row' es un objeto: { 'Codigo': '...', 'Descripcion': '...', ... }
    products.push(row);
  })
  .on('end', async () => {
    // Esta función se llama cuando se termina de leer el archivo
    console.log(`Lectura del CSV completada. Se encontraron ${products.length} productos.`);
    
    // Ahora, conectamos a la base de datos e insertamos los datos
    const client = await pool.connect();
    console.log('Conectado a la base de datos PostgreSQL.');

    try {
      // Iniciar una transacción.
      // Esto es importante: si algo falla, no se inserta nada (ROLLBACK).
      // Si todo va bien, se inserta todo (COMMIT).
      await client.query('BEGIN');
      console.log('Transacción iniciada.');

      // Iterar sobre cada producto y crear la consulta de inserción
      for (const row of products) {
        // Esta es la parte clave: el mapeo actualizado
        // que coincide con tu imagen de la BD (BD.png)
        // y el mapeo que me diste.
        
        const query = `
          INSERT INTO products (code, description, capacity, product_group, ts_standard, table_code, price, capacity_description) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;
        
        const values = [
          row['Codigo'],
          row['Descripcion'],
          row['Capacidad'],
          row['Grupo'],
          row['TS Estandar'],
          row['Cod. Tabla'],
          row['Precio Venta'],
          row['Desc Capacid']
        ];
        
        // Ejecutar la consulta por cada fila
        await client.query(query, values);
      }
      
      // Si el bucle termina sin errores, confirmamos la transacción
      await client.query('COMMIT');
      console.log('¡Éxito! Todos los productos han sido importados correctamente.');
      
    } catch (error) {
      // Si ocurre un error, revertimos la transacción
      await client.query('ROLLBACK');
      console.error('Error durante la importación. Se revirtió la transacción:', error);
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