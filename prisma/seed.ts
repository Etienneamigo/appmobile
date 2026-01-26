import { PrismaClient, ActivityType, ActivityStatus, MediaKind } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding database...")

  // Clean existing data
  await prisma.favorite.deleteMany()
  await prisma.media.deleteMany()
  await prisma.activity.deleteMany()
  await prisma.establishment.deleteMany()
  await prisma.user.deleteMany()

  console.log("🧹 Cleaned existing data")

  // Create test user
  const testUser = await prisma.user.create({
    data: {
      email: "user@test.com",
      passwordHash: await bcrypt.hash("password123", 12),
      name: "Jean Dupont",
      role: "USER",
    },
  })
  console.log("👤 Created test user: user@test.com / password123")

  // Create establishments
  const establishment1 = await prisma.user.create({
    data: {
      email: "bowling.paris@test.com",
      passwordHash: await bcrypt.hash("password123", 12),
      role: "ESTABLISHMENT",
      establishment: {
        create: {
          name: "Bowling Stadium Paris",
          phone: "01 23 45 67 89",
          website: "https://bowlingparis.example.com",
          address: "15 Boulevard de la Madeleine",
          city: "Paris",
          zipCode: "75008",
          country: "France",
          lat: 48.8699,
          lng: 2.3241,
        },
      },
    },
    include: { establishment: true },
  })
  console.log("🏢 Created establishment: bowling.paris@test.com / password123")

  const establishment2 = await prisma.user.create({
    data: {
      email: "loisirs.boulogne@test.com",
      passwordHash: await bcrypt.hash("password123", 12),
      role: "ESTABLISHMENT",
      establishment: {
        create: {
          name: "Loisirs & Fun Boulogne",
          phone: "01 98 76 54 32",
          website: "https://loisirsboulogne.example.com",
          address: "45 Rue du Château",
          city: "Boulogne-Billancourt",
          zipCode: "92100",
          country: "France",
          lat: 48.8332,
          lng: 2.2406,
        },
      },
    },
    include: { establishment: true },
  })
  console.log("🏢 Created establishment: loisirs.boulogne@test.com / password123")

  // Placeholder images from Unsplash
  const bowlingImages = [
    "https://images.unsplash.com/photo-1545239705-1564e58b9e4a?w=800",
    "https://images.unsplash.com/photo-1580757468214-c73f7062a5cb?w=800",
  ]
  const escapeImages = [
    "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=800",
  ]
  const barImages = [
    "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800",
    "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800",
  ]
  const karaokeImages = [
    "https://images.unsplash.com/photo-1485579149621-3123dd979885?w=800",
  ]
  const laserImages = [
    "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800",
  ]
  const cinemaImages = [
    "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800",
    "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800",
  ]
  const trampolineImages = [
    "https://images.unsplash.com/photo-1625824610731-66bcb49e8bdd?w=800",
  ]

  // Activities for Establishment 1 (Paris)
  const activities1 = [
    {
      type: ActivityType.BOWLING,
      title: "Bowling Stadium Paris - 16 pistes",
      description:
        "Venez découvrir notre bowling moderne avec 16 pistes professionnelles, éclairages néon et système de score automatique. Parfait pour des soirées entre amis ou des anniversaires. Bar et restauration sur place.",
      address: "15 Boulevard de la Madeleine",
      city: "Paris",
      zipCode: "75008",
      lat: 48.8699,
      lng: 2.3241,
      minPeople: 2,
      maxPeople: 6,
      durationMinutes: 90,
      priceFrom: 12.5,
      scheduleText: "Lundi - Jeudi : 14h - 00h\nVendredi - Samedi : 14h - 02h\nDimanche : 10h - 00h",
      tags: ["famille", "amis", "soirée", "anniversaire"],
      status: ActivityStatus.PUBLISHED,
      images: bowlingImages,
    },
    {
      type: ActivityType.ESCAPE_GAME,
      title: "L'Énigme de la Tour Eiffel",
      description:
        "Plongez dans une aventure mystérieuse au cœur de Paris ! Résolvez les énigmes et découvrez le secret de la Tour Eiffel avant que le temps ne s'écoule. Scénario immersif avec décors réalistes.",
      address: "22 Rue de Rivoli",
      city: "Paris",
      zipCode: "75004",
      lat: 48.8559,
      lng: 2.3599,
      minPeople: 2,
      maxPeople: 6,
      durationMinutes: 60,
      priceFrom: 28,
      scheduleText: "Tous les jours : 10h - 23h\nDernière session : 22h",
      tags: ["énigmes", "mystère", "équipe", "immersif"],
      status: ActivityStatus.PUBLISHED,
      images: escapeImages,
    },
    {
      type: ActivityType.KARAOKE,
      title: "Karaoké Box Paris Opéra",
      description:
        "Salles privées de karaoké pour 2 à 20 personnes. Plus de 50 000 titres en français, anglais, japonais et coréen. Système audio professionnel et ambiance festive garantie !",
      address: "8 Rue de la Chaussée d'Antin",
      city: "Paris",
      zipCode: "75009",
      lat: 48.8731,
      lng: 2.3327,
      minPeople: 2,
      maxPeople: 20,
      durationMinutes: 120,
      priceFrom: 8,
      scheduleText: "Lundi - Dimanche : 18h - 04h",
      tags: ["musique", "soirée", "privatif", "fête"],
      status: ActivityStatus.PUBLISHED,
      images: karaokeImages,
    },
    {
      type: ActivityType.CINEMA,
      title: "Cinéma Le Grand Rex",
      description:
        "Le plus grand cinéma d'Europe avec sa salle mythique de 2 800 places. Programmation variée : blockbusters, films d'auteur et avant-premières. Visitez aussi les coulisses avec notre parcours Rex Studios.",
      address: "1 Boulevard Poissonnière",
      city: "Paris",
      zipCode: "75002",
      lat: 48.8709,
      lng: 2.3478,
      minPeople: 1,
      maxPeople: 10,
      durationMinutes: 150,
      priceFrom: 11.5,
      scheduleText: "Séances de 10h à 23h\nRex Studios : 10h - 19h",
      tags: ["cinéma", "blockbuster", "culture", "sortie"],
      status: ActivityStatus.PUBLISHED,
      images: cinemaImages,
    },
    {
      type: ActivityType.BAR_DANSANT,
      title: "Le Social Club Paris",
      description:
        "Club mythique parisien proposant les meilleures soirées électro, house et techno. DJs internationaux chaque week-end. Terrasse fumeur et cocktails signatures.",
      address: "142 Rue Montmartre",
      city: "Paris",
      zipCode: "75002",
      lat: 48.8678,
      lng: 2.3442,
      minPeople: 1,
      maxPeople: null,
      durationMinutes: null,
      priceFrom: 15,
      scheduleText: "Jeudi : 23h - 05h\nVendredi - Samedi : 23h - 06h",
      tags: ["club", "danse", "électro", "soirée"],
      status: ActivityStatus.PUBLISHED,
      images: barImages,
    },
  ]

  // Activities for Establishment 2 (Boulogne)
  const activities2 = [
    {
      type: ActivityType.LASER_GAME,
      title: "Laser Quest Boulogne",
      description:
        "Le plus grand labyrinthe laser de l'Ouest parisien ! 800m² de parcours avec effets spéciaux, fumée et musique. Parties de 20 minutes intenses. Idéal pour enterrements de vie de célibataire et team building.",
      address: "45 Rue du Château",
      city: "Boulogne-Billancourt",
      zipCode: "92100",
      lat: 48.8332,
      lng: 2.2406,
      minPeople: 6,
      maxPeople: 30,
      durationMinutes: 60,
      priceFrom: 15,
      scheduleText: "Mercredi : 14h - 22h\nSamedi - Dimanche : 10h - 22h\nVacances scolaires : 10h - 22h",
      tags: ["action", "équipe", "adrénaline", "team-building"],
      status: ActivityStatus.PUBLISHED,
      images: laserImages,
    },
    {
      type: ActivityType.TRAMPOLINE_PARK,
      title: "Jump Factory Boulogne",
      description:
        "Plus de 2000m² de trampolines interconnectés ! Foam pit, basketball dunk, parcours ninja et zone freestyle. Sessions d'une heure avec échauffement encadré. Chaussettes antidérapantes obligatoires (disponibles sur place).",
      address: "78 Avenue du Général Leclerc",
      city: "Boulogne-Billancourt",
      zipCode: "92100",
      lat: 48.8264,
      lng: 2.2471,
      minPeople: 1,
      maxPeople: 50,
      durationMinutes: 60,
      priceFrom: 14,
      scheduleText: "Mardi - Vendredi : 15h - 21h\nSamedi : 10h - 21h\nDimanche : 10h - 19h",
      tags: ["sport", "famille", "enfants", "fitness"],
      status: ActivityStatus.PUBLISHED,
      images: trampolineImages,
    },
    {
      type: ActivityType.BOWLING,
      title: "Fun Bowling Boulogne",
      description:
        "Bowling familial de 12 pistes avec ambiance conviviale. Formules goûter d'anniversaire, soirées étudiantes et afterworks. Snack, billard et baby-foot également disponibles.",
      address: "12 Rue de Paris",
      city: "Boulogne-Billancourt",
      zipCode: "92100",
      lat: 48.8389,
      lng: 2.2347,
      minPeople: 1,
      maxPeople: 8,
      durationMinutes: 90,
      priceFrom: 9,
      scheduleText: "Lundi - Vendredi : 14h - 23h\nSamedi - Dimanche : 10h - 00h",
      tags: ["famille", "amis", "abordable", "anniversaire"],
      status: ActivityStatus.PUBLISHED,
      images: bowlingImages,
    },
    {
      type: ActivityType.ESCAPE_GAME,
      title: "Prison Break Boulogne",
      description:
        "Vous êtes enfermés dans une cellule de haute sécurité. Vous avez 60 minutes pour vous évader avant le changement de garde. Fouille des lieux, codes secrets et travail d'équipe seront vos meilleurs alliés.",
      address: "23 Rue du Point du Jour",
      city: "Boulogne-Billancourt",
      zipCode: "92100",
      lat: 48.8421,
      lng: 2.2298,
      minPeople: 3,
      maxPeople: 6,
      durationMinutes: 60,
      priceFrom: 25,
      scheduleText: "Mercredi - Dimanche : 14h - 22h\nRéservation obligatoire",
      tags: ["évasion", "prison", "suspense", "équipe"],
      status: ActivityStatus.PUBLISHED,
      images: escapeImages,
    },
    {
      type: ActivityType.KARAOKE,
      title: "Sing Star Boulogne",
      description:
        "Le karaoké familial de Boulogne ! Salles climatisées pour 4 à 12 personnes. Catalogue de 30 000 chansons actualisé chaque mois. Formules goûter et apéro disponibles.",
      address: "56 Avenue Jean-Baptiste Clément",
      city: "Boulogne-Billancourt",
      zipCode: "92100",
      lat: 48.8299,
      lng: 2.2361,
      minPeople: 4,
      maxPeople: 12,
      durationMinutes: 120,
      priceFrom: 6,
      scheduleText: "Vendredi : 18h - 01h\nSamedi : 14h - 01h\nDimanche : 14h - 22h",
      tags: ["musique", "famille", "anniversaire", "karaoké"],
      status: ActivityStatus.PUBLISHED,
      images: karaokeImages,
    },
    {
      type: ActivityType.BAR_DANSANT,
      title: "Le Petit Bal Boulogne",
      description:
        "Bar dansant chaleureux avec ambiance années 80-90. Soirées à thème chaque vendredi. Cocktails maison et planches apéritives. Piste de danse intimiste pour passer une soirée mémorable.",
      address: "89 Rue de Billancourt",
      city: "Boulogne-Billancourt",
      zipCode: "92100",
      lat: 48.8251,
      lng: 2.2318,
      minPeople: 2,
      maxPeople: null,
      durationMinutes: null,
      priceFrom: 8,
      scheduleText: "Jeudi - Samedi : 19h - 02h\nHappy Hour : 19h - 21h",
      tags: ["rétro", "danse", "cocktails", "soirée"],
      status: ActivityStatus.PUBLISHED,
      images: barImages,
    },
    {
      type: ActivityType.CINEMA,
      title: "Pathé Boulogne",
      description:
        "Cinéma multiplexe moderne avec 10 salles équipées des dernières technologies (Dolby Atmos, 4K, IMAX). Séances en VF et VO. Espace restauration et parking souterrain.",
      address: "26 Place Marcel Sembat",
      city: "Boulogne-Billancourt",
      zipCode: "92100",
      lat: 48.8341,
      lng: 2.2389,
      minPeople: 1,
      maxPeople: 8,
      durationMinutes: 140,
      priceFrom: 10.9,
      scheduleText: "Séances de 10h à 23h30\nMardi : tarif réduit",
      tags: ["cinéma", "IMAX", "sortie", "film"],
      status: ActivityStatus.PUBLISHED,
      images: cinemaImages,
    },
    {
      type: ActivityType.TRAMPOLINE_PARK,
      title: "Bounce Arena",
      description:
        "Nouveau parc de trampolines avec zone VR ! Expérience unique combinant sauts acrobatiques et réalité virtuelle. Aussi : parcours parkour et wall running. À partir de 6 ans.",
      address: "101 Route de la Reine",
      city: "Boulogne-Billancourt",
      zipCode: "92100",
      lat: 48.8456,
      lng: 2.2512,
      minPeople: 1,
      maxPeople: 40,
      durationMinutes: 90,
      priceFrom: 18,
      scheduleText: "Mercredi : 14h - 20h\nSamedi - Dimanche : 10h - 20h",
      tags: ["VR", "sport", "innovation", "jeunes"],
      status: ActivityStatus.PUBLISHED,
      images: trampolineImages,
    },
  ]

  // Create activities for establishment 1
  for (const activityData of activities1) {
    const { images, ...data } = activityData
    const activity = await prisma.activity.create({
      data: {
        ...data,
        establishmentId: establishment1.establishment!.id,
      },
    })

    // Add images
    for (const imageUrl of images) {
      await prisma.media.create({
        data: {
          activityId: activity.id,
          kind: MediaKind.IMAGE,
          url: imageUrl,
        },
      })
    }
  }
  console.log(`✅ Created ${activities1.length} activities for Bowling Stadium Paris`)

  // Create activities for establishment 2
  for (const activityData of activities2) {
    const { images, ...data } = activityData
    const activity = await prisma.activity.create({
      data: {
        ...data,
        establishmentId: establishment2.establishment!.id,
      },
    })

    // Add images
    for (const imageUrl of images) {
      await prisma.media.create({
        data: {
          activityId: activity.id,
          kind: MediaKind.IMAGE,
          url: imageUrl,
        },
      })
    }
  }
  console.log(`✅ Created ${activities2.length} activities for Loisirs & Fun Boulogne`)

  console.log("")
  console.log("🎉 Seeding completed!")
  console.log("")
  console.log("📝 Test accounts:")
  console.log("   User: user@test.com / password123")
  console.log("   Establishment 1: bowling.paris@test.com / password123")
  console.log("   Establishment 2: loisirs.boulogne@test.com / password123")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
