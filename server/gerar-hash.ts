import { hashPassword } from "./auth";

async function generate() {
  const password = "123456";

  console.log(`Gerando hash para a senha: "${password}"`);
  const hashedPassword = await hashPassword(password);
  console.log("\nCopie a linha abaixo:\n");
  console.log(hashedPassword);
}

generate();