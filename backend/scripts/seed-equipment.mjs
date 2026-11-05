import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../dist/generated/prisma/client.js';
import { OFFICIAL_EQUIPMENT } from '../dist/equipment/official-equipment.constants.js';

// Pesos por unidade, em gramas, conforme a tabela fornecida.
// Os pesos oficiais são fixos e a identidade persistente mantém o bloqueio após renomeações.
const catalog = OFFICIAL_EQUIPMENT;

let prisma;
try {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não está configurada.');
  }
  prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const result = await prisma.$transaction(async (tx) => {
    const categories = new Map();
    let created = 0;
    let updated = 0;
    let unchanged = 0;

    for (const categoryName of new Set(catalog.map((item) => item.category))) {
      const matches = await tx.category.findMany({
        where: { name: { equals: categoryName, mode: 'insensitive' } },
        select: { id: true },
      });
      if (matches.length > 1) {
        throw new Error(`Categoria ambígua: ${categoryName}. Resolva os registros existentes antes de carregar.`);
      }
      const category = matches[0] ?? await tx.category.create({
        data: { name: categoryName },
        select: { id: true },
      });
      categories.set(categoryName, category.id);
    }

    for (const item of catalog) {
      // Reconhece também nomes curtos já cadastrados, sem recriar o equipamento
      // em outra categoria. Correspondências ambíguas revertem toda a carga.
      const matches = await tx.equipment.findMany({
        where: {
          OR: [{ officialCatalogKey: item.key }, ...[item.name, ...item.aliases].map((name) => ({
            name: { equals: name, mode: 'insensitive' },
          }))],
        },
        select: { id: true, averageWeightGrams: true, categoryId: true, officialCatalogKey: true },
      });
      if (matches.length > 1) {
        throw new Error(`Equipamento ambíguo: ${item.name}. Resolva os registros existentes antes de carregar.`);
      }
      const categoryId = categories.get(item.category);
      const existing = matches[0];
      if (!existing) {
        await tx.equipment.create({
          data: {
            name: item.name,
            officialCatalogKey: item.key,
            categoryId,
            averageWeightGrams: item.weight,
          },
        });
        created++;
      } else if (existing.averageWeightGrams !== item.weight || existing.categoryId !== categoryId || existing.officialCatalogKey !== item.key) {
        await tx.equipment.update({
          where: { id: existing.id },
          data: { categoryId, averageWeightGrams: item.weight, officialCatalogKey: item.key },
        });
        updated++;
      } else {
        unchanged++;
      }
    }

    // Mouse não faz parte desta carga: seu registro e peso de 120 g são preservados.
    // Nenhuma operação é feita em descartes, snapshots, carteiras ou EcoCoins.
    return { created, updated, unchanged };
  }, { isolationLevel: 'Serializable', timeout: 30000 });

  process.stdout.write(`Catálogo carregado: ${result.created} criados, ${result.updated} atualizados, ${result.unchanged} já configurados.\n`);
  process.stdout.write('Mouse e históricos preservados. Os oito pesos oficiais são fixos para todos os perfis.\n');
} catch (error) {
  // Não imprime exceções do driver, que podem conter detalhes da conexão.
  const message = error instanceof Error && (
    error.message.startsWith('Categoria ambígua:') ||
    error.message.startsWith('Equipamento ambíguo:') ||
    error.message === 'DATABASE_URL não está configurada.'
  ) ? error.message : 'Falha na carga. Verifique a conexão local, o cliente Prisma compilado e possíveis operações concorrentes antes de repetir.';
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
} finally {
  if (prisma) {
    await prisma.$disconnect().catch(() => {
      process.stderr.write('Não foi possível encerrar a conexão com o banco.\n');
      process.exitCode = 1;
    });
  }
}