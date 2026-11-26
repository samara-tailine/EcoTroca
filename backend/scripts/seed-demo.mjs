import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../dist/generated/prisma/client.js';
import { emailDomainConfiguration } from '../dist/auth/email-domain.policy.js';
import { hashPassword } from '../dist/auth/password-hasher.js';
import { ACCESS_PROFILE_DEFINITIONS } from '../dist/users/access-profile.constants.js';
import { OFFICIAL_EQUIPMENT } from '../dist/equipment/official-equipment.constants.js';

// Credenciais públicas, fictícias e EXCLUSIVAS para avaliação local. Nunca usar em produção.
const accounts = [
  { name: 'Administrador de demonstração', email: 'admin@ecotroca.test', role: 'ADMIN', password: 'EcoTrocaDemo!Admin2026' },
  { name: 'Biblioteca de demonstração', email: 'biblioteca.teste@ecotroca.test', role: 'LIBRARY', password: 'EcoTrocaDemo!Biblioteca2026' },
  { name: 'Xerox de demonstração', email: 'xerox.teste@ecotroca.test', role: 'XEROX', password: 'EcoTrocaDemo!Xerox2026' },
  { name: 'Estudante de demonstração', email: 'estudante.teste@ecotroca.test', role: 'STUDENT', password: 'EcoTrocaDemo!Estudante2026' },
];
class DemoSeedError extends Error {}
let prisma;
try {
  // Antes de abrir conexão: exige flag, development e banco/frontend loopback.
  if (!process.env.DATABASE_URL || !emailDomainConfiguration().allowLocalTestEmails)
    throw new DemoSeedError('Seed bloqueado: exige ALLOW_LOCAL_TEST_EMAILS=true, NODE_ENV=development e banco/frontend locais.');
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const result = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended('ecotroca-local-demo-seed', 0))::text`;
    const profiles = new Map();
    let createdUsers = 0, preservedUsers = 0, createdEquipment = 0, createdCategories = 0;
    for (const definition of ACCESS_PROFILE_DEFINITIONS) {
      const existing = await tx.accessProfile.findUnique({ where: { key: definition.key } });
      if (existing && !existing.isActive) throw new DemoSeedError('Perfil existente inativo; seed interrompido sem alterá-lo: ' + definition.key);
      const profile = existing ?? await tx.accessProfile.create({ data: definition });
      profiles.set(definition.key, profile.id);
    }
    for (const account of accounts) {
      const existing = await tx.user.findMany({ where: { email: { equals: account.email, mode: 'insensitive' } }, select: { id: true } });
      if (existing.length > 1) throw new DemoSeedError('E-mail existente ambíguo; seed interrompido sem alterar contas.');
      if (existing.length) { preservedUsers++; continue; }
      await tx.user.create({ data: {
        name: account.name, email: account.email, passwordHash: await hashPassword(account.password),
        accessProfiles: { create: { accessProfileId: profiles.get(account.role) } },
      } });
      createdUsers++;
    }
    const categories = new Map();
    for (const name of new Set(OFFICIAL_EQUIPMENT.map(e => e.category))) {
      const matches = await tx.category.findMany({ where: { name: { equals: name, mode: 'insensitive' } } });
      if (matches.length > 1) throw new DemoSeedError('Categoria existente ambígua; seed interrompido sem alterar registros.');
      const category = matches[0] ?? await tx.category.create({ data: { name } });
      if (!matches.length) createdCategories++;
      categories.set(name, category.id);
    }
    for (const item of OFFICIAL_EQUIPMENT) {
      const matches = await tx.equipment.findMany({ where: { OR: [
        { officialCatalogKey: item.key },
        ...[item.name, ...item.aliases].map(name => ({ name: { equals: name, mode: 'insensitive' } })),
      ] } });
      if (matches.length > 1) throw new DemoSeedError('Equipamento existente ambíguo; seed interrompido sem alterar registros.');
      if (matches.length) {
        if (matches[0].averageWeightGrams !== item.weight) throw new DemoSeedError('Peso existente incompatível; seed interrompido sem alterar pesos.');
        continue;
      }
      await tx.equipment.create({ data: { name: item.name, categoryId: categories.get(item.category), officialCatalogKey: item.key, averageWeightGrams: item.weight } });
      createdEquipment++;
    }
    return { createdUsers, preservedUsers, createdEquipment, createdCategories };
  }, { timeout: 30000 });
  console.log('Demonstração local preparada: ' + JSON.stringify(result));
  if (result.preservedUsers) console.log('Contas existentes preservadas integralmente. As senhas/perfis do README só são garantidos para contas criadas por este seed em banco vazio.');
  console.log('Credenciais públicas de demonstração no README. Nenhum saldo, descarte, pagamento ou histórico foi alterado.');
} catch (error) {
  console.error(error instanceof DemoSeedError ? error.message : 'Falha no seed de demonstração; verifique configuração, migrações, build e banco local. Nenhuma alteração parcial foi mantida.');
  process.exitCode = 1;
} finally { if (prisma) await prisma.$disconnect(); }
