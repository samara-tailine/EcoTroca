// Identidades persistentes: nomes podem mudar sem liberar o peso oficial.
export const OFFICIAL_EQUIPMENT = [
  { key: 'MINI_SPEAKER', name: 'Caixa de som (mini portátil)', aliases: ['Caixa de som'], category: 'Áudio e vídeo', weight: 250 },
  { key: 'BLENDER', name: 'Liquidificador (plástico simples)', aliases: ['Liquidificador'], category: 'Eletrodomésticos', weight: 750 },
  { key: 'LIGHT_NOTEBOOK', name: 'Notebook (ultrabook / leve)', aliases: ['Notebook'], category: 'Informática', weight: 1000 },
  { key: 'LED_MONITOR', name: 'Monitor (LED ultrafino)', aliases: ['Monitor'], category: 'Informática', weight: 1500 },
  { key: 'SMALL_RADIO', name: 'Rádio (pequeno)', aliases: ['Rádio'], category: 'Áudio e vídeo', weight: 250 },
  { key: 'INKJET_PRINTER', name: 'Impressora (jato de tinta compacta)', aliases: ['Impressora'], category: 'Informática', weight: 2000 },
  { key: 'MODEM_ROUTER', name: 'Modem / Roteador', aliases: ['Modem', 'Roteador'], category: 'Redes e conectividade', weight: 250 },
  { key: 'LIGHT_STABILIZER', name: 'Estabilizador (linha leve)', aliases: ['Estabilizador'], category: 'Energia e proteção', weight: 1250 },
] as const;

export function findOfficialEquipment(name: string) {
  const normalized = name.trim().normalize('NFC').toLocaleLowerCase('pt-BR');
  return OFFICIAL_EQUIPMENT.find((item) => [item.name, ...item.aliases].some(
    (candidate) => candidate.normalize('NFC').toLocaleLowerCase('pt-BR') === normalized,
  ));
}