const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.error('Por favor, proporciona una contraseña como argumento.');
  console.error('Uso: node hashGenerator.js <tu_contraseña>');
  process.exit(1);
}

const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(password, salt);

console.log(`Contraseña original: ${password}`);
console.log(`Hash (para guardar en la DB): ${hash}`);
