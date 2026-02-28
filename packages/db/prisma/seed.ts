import process from 'node:process'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Create a demo user
  const user = await prisma.user.upsert({
    where: { googleId: 'demo-user' },
    update: {},
    create: {
      googleId: 'demo-user',
      displayName: 'Demo User',
    },
  })

  // Create some sample words
  const words = [
    { text: 'ephemeral', definitions: JSON.stringify([{ partOfSpeech: 'adjective', definitions: [{ definition: 'Lasting for a very short time.', synonyms: [], antonyms: [] }], synonyms: ['transient'], antonyms: ['permanent'] }]), pronunciation: '/əˈfɛ.mə.ɹəl/', definitionStatus: 'found' },
    { text: 'serendipity', definitions: JSON.stringify([{ partOfSpeech: 'noun', definitions: [{ definition: 'The occurrence of events by chance in a happy way.', synonyms: [], antonyms: [] }], synonyms: [], antonyms: [] }]), pronunciation: '/ˌsɛ.ɹɛn.ˈdɪ.pɪ.ti/', definitionStatus: 'found' },
    { text: 'petrichor', definitions: JSON.stringify([{ partOfSpeech: 'noun', definitions: [{ definition: 'A pleasant smell that frequently accompanies the first rain after a long period of warm, dry weather.', synonyms: [], antonyms: [] }], synonyms: [], antonyms: [] }]), pronunciation: '/ˈpɛt.ɹɪ.kɔːɹ/', definitionStatus: 'found' },
  ]

  for (const word of words) {
    await prisma.word.upsert({
      where: { text_userId: { text: word.text, userId: user.id } },
      update: {},
      create: { ...word, userId: user.id },
    })
  }

  // Create a default list
  await prisma.list.upsert({
    where: { id: 'default-list' },
    update: {},
    create: {
      id: 'default-list',
      name: 'My Words',
      isDefault: true,
      userId: user.id,
    },
  })

  console.warn('Seed complete')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
