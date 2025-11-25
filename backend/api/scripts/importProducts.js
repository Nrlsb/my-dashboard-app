// Importar los módulos necesarios
const fs = require('fs'); // Módulo de sistema de archivos (File System)
const path = require('path'); // Módulo para manejar rutas de archivos
const csv = require('csv-parser'); // Módulo para parsear (leer) archivos CSV
const { pool } = require('../db'); // <-- CAMBIO DE RUTA

// ======================================================
// --- INICIO DE MODIFICACIÓN 1: Apuntar al archivo de prueba ---
// ======================================================
// Definir la ruta al archivo CSV
// !! IMPORTANTE: Apuntamos a ListaDeProductos.csv para la prueba
// __dirname ahora es 'backend/api/scripts', así que subimos un nivel
const filePath = path.join(__dirname, '../ListaDeProductos.csv');
// ======================================================
// --- FIN DE MODIFICACIÓN 1 ---
// ======================================================

// Array para almacenar los productos leídos del CSV
const products = [];

console.log(`Iniciando la lectura del archivo CSV: ${filePath}`);

// Crear un stream de lectura del archivo
fs.createReadStream(filePath)
  // Añadimos opciones para limpiar los encabezados y definir el separador
  .pipe(
    csv({
      separator: ';', // <--- CAMBIO SOLICITADO: Se añade el separador por punto y coma
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
      mapValues: ({ header, index, value }) => value.trim().replace(/"/g, ''),
      // ======================================================
      // --- FIN DE MODIFICACIÓN 2 ---
      // ======================================================
    })
  )
  .on('data', (row) => {
    // 'row' es un objeto: { 'Codigo': '...', 'Descripcion': '...', ... }
    products.push(row);
  })
  .on('end', async () => {
    // Esta función se llama cuando se termina de leer el archivo
    console.log(
      `Lectura del CSV completada. Se encontraron ${products.length} productos.`
    );

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

      // Helper para convertir valores a enteros de forma segura
      const parseIntSafe = (value) => {
        if (
          value === null ||
          value === undefined ||
          String(value).trim() === ''
        ) {
          return 0; // Devuelve 0 si el valor es nulo, indefinido o una cadena vacía
        }
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? 0 : parsed;
      };

      // Iterar sobre cada producto y crear la consulta de inserción
      for (const row of products) {
        rowCounter++; // Incrementamos el contador

        // Si la fila está vacía (común en líneas en blanco al final del CSV),
        // row['Codigo'] será undefined o null. La omitimos.
        if (!row['Codigo'] || row['Codigo'].trim() === '') {
          console.warn(
            `Fila ${rowCounter} omitida: El 'Codigo' está vacío. Datos:`,
            row
          );
          continue; // Salta esta iteración y sigue con la próxima fila
        }

        // Cambiamos el query a un "INSERT ... ON CONFLICT ... DO UPDATE" (Upsert).
        // Esto insertará la fila si el 'code' es nuevo.
        // Si el 'code' ya existe, ejecutará el 'DO UPDATE SET' en su lugar.
        const query = `
          INSERT INTO products (
            code, description, capacity, product_group, ts_standard,
            embalaje, stock_disponible, stock_de_seguridad
          ) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (code) DO UPDATE SET
            description = EXCLUDED.description,
            capacity = EXCLUDED.capacity,
            product_group = EXCLUDED.product_group,
            ts_standard = EXCLUDED.ts_standard,
            embalaje = EXCLUDED.embalaje,
            stock_disponible = EXCLUDED.stock_disponible,
            stock_de_seguridad = EXCLUDED.stock_de_seguridad
        `;

        // Ajustamos los valores para que coincidan con las columnas que estamos insertando/actualizando.
        const values = [
          row['Codigo'],
          row['Descripcion'],
          row['Capacidad'],
          row['Grupo'],
          row['TS Estandar'],
          row['Embalaje'], // Asume que la columna en el CSV se llama 'Embalaje'
          parseIntSafe(row['Stock Disponible']), // Asume 'Stock Disponible'
          parseIntSafe(row['Stock de Seguridad']), // Asume 'Stock de Seguridad'
        ];

        // Añadimos un try/catch INTERNO solo para el log
        try {
          // Ejecutar la consulta por cada fila
          await client.query(query, values);
        } catch (insertError) {
          // ¡Aquí capturamos la fila exacta que falló!
          console.error(
            `\n--- ERROR AL INSERTAR/ACTUALIZAR LA FILA N° ${rowCounter} DEL CSV ---`
          );
          console.error('Datos de la fila del CSV que falló:');
          console.log(row);
          console.error('Valores que se intentaron insertar/actualizar:');
          console.log(values);

          // Lanzamos el error de nuevo para que el catch exterior
          // pueda hacer el ROLLBACK de la transacción.
          throw insertError;
        }
      }

      // Si el bucle termina sin errores, confirmamos la transacción
      await client.query('COMMIT');
      console.log(
        '¡Éxito! Todos los productos han sido importados correctamente.'
      );
    } catch (error) {
      // Si ocurre un error, revertimos la transacción
      await client.query('ROLLBACK');
      // El log de arriba (dentro del bucle) ya nos habrá dado los detalles
      console.error(
        'Error durante la importación. Se revirtió la transacción:',
        error.message
      );
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
