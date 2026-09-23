import { db, snapChecklist } from './index';

export const sampleChecklists = [
  {
    eventId: 9,
    name: 'Grand Entrance',
    description: 'Capture the moment Keann & Jenny make their grand entrance into the reception!',
  },
  {
    eventId: 9,
    name: 'First Dance Magic',
    description: 'The newlyweds sharing their intimate first dance under the reception lights.',
  },
  {
    eventId: 9,
    name: 'Cutting the Wedding Cake',
    description: 'Keann and Jenny cutting the wedding cake together.',
  },
  {
    eventId: 9,
    name: 'Table Toast & Cheers',
    description: 'Glasses clinking and smiles with your table mates during the champagne toasts.',
  },
  {
    eventId: 9,
    name: 'Bouquet Toss Excitement',
    description: 'The dramatic leap and candid reactions during the traditional bouquet toss.',
  },
  {
    eventId: 9,
    name: 'Dance Floor Fiesta',
    description: 'Guests unleashing their best dance moves and celebration energy on the floor.',
  },
];

async function seed() {
  console.log('🌱 Seeding snap_checklist for eventId=9...');
  try {
    const inserted = await db
      .insert(snapChecklist)
      .values(sampleChecklists)
      .returning();

    console.log(`✅ Successfully inserted ${inserted.length} sample checklist items:`);
    console.table(
      inserted.map((item) => ({
        id: item.id,
        eventId: item.eventId,
        name: item.name,
        description: item.description,
        createdAt: item.createdAt,
      }))
    );
  } catch (error) {
    console.error('❌ Failed to seed snap_checklist:', error);
  } finally {
    process.exit(0);
  }
}

if (require.main === module) {
  seed();
}
