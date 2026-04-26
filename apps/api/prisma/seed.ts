import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Admin kullanici
  const passwordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@bolena.com' },
    update: {},
    create: {
      email: 'admin@bolena.com',
      name: 'Admin',
      passwordHash,
      role: 'ADMIN',
    },
  });
  console.log('Admin kullanici olusturuldu:', admin.email);

  // Calisan
  const empHash = await bcrypt.hash('calisan123', 10);
  await prisma.user.upsert({
    where: { email: 'calisan@bolena.com' },
    update: {},
    create: {
      email: 'calisan@bolena.com',
      name: 'Ahmet',
      passwordHash: empHash,
      role: 'EMPLOYEE',
    },
  });

  // Kategoriler
  const categories = await Promise.all([
    prisma.category.create({
      data: { nameTr: 'Sicak Icecekler', nameEn: 'Hot Drinks', sortOrder: 1 },
    }),
    prisma.category.create({
      data: { nameTr: 'Soguk Icecekler', nameEn: 'Cold Drinks', sortOrder: 2 },
    }),
    prisma.category.create({
      data: { nameTr: 'Tatlilar', nameEn: 'Desserts', sortOrder: 3 },
    }),
    prisma.category.create({
      data: { nameTr: 'Ana Yemekler', nameEn: 'Main Courses', sortOrder: 4 },
    }),
  ]);
  console.log('Kategoriler olusturuldu:', categories.length);

  // Menu itemlari
  const menuItems = [
    { categoryId: categories[0].id, nameTr: 'Turk Kahvesi', nameEn: 'Turkish Coffee', priceCents: 6000, descriptionTr: 'Geleneksel Turk kahvesi', descriptionEn: 'Traditional Turkish coffee' },
    { categoryId: categories[0].id, nameTr: 'Filtre Kahve', nameEn: 'Filter Coffee', priceCents: 7500, descriptionTr: 'Taze cekilmis filtre kahve', descriptionEn: 'Freshly ground filter coffee' },
    { categoryId: categories[0].id, nameTr: 'Chai Latte', nameEn: 'Chai Latte', priceCents: 8500, descriptionTr: 'Baharatli chai latte', descriptionEn: 'Spiced chai latte' },
    { categoryId: categories[1].id, nameTr: 'Limonata', nameEn: 'Lemonade', priceCents: 5500, descriptionTr: 'Taze sikma limonata', descriptionEn: 'Fresh squeezed lemonade' },
    { categoryId: categories[1].id, nameTr: 'Smoothie', nameEn: 'Smoothie', priceCents: 9000, descriptionTr: 'Mevsim meyveleri ile', descriptionEn: 'With seasonal fruits' },
    { categoryId: categories[2].id, nameTr: 'Glutensiz Cheesecake', nameEn: 'Gluten-Free Cheesecake', priceCents: 12000, descriptionTr: 'Ev yapimi glutensiz cheesecake', descriptionEn: 'Homemade gluten-free cheesecake' },
    { categoryId: categories[2].id, nameTr: 'Brownie', nameEn: 'Brownie', priceCents: 8000, descriptionTr: 'Glutensiz cikolatali brownie', descriptionEn: 'Gluten-free chocolate brownie', stockTracking: true, stockCount: 20 },
    { categoryId: categories[3].id, nameTr: 'Glutensiz Pizza', nameEn: 'Gluten-Free Pizza', priceCents: 18000, descriptionTr: 'Glutensiz hamur ile', descriptionEn: 'With gluten-free dough' },
    { categoryId: categories[3].id, nameTr: 'Tavuklu Salata', nameEn: 'Chicken Salad', priceCents: 15000, descriptionTr: 'Izgara tavuk ile taze salata', descriptionEn: 'Fresh salad with grilled chicken' },
  ];

  for (const item of menuItems) {
    await prisma.menuItem.create({ data: item });
  }
  console.log('Menu itemlari olusturuldu:', menuItems.length);

  // Masalar
  for (let i = 1; i <= 10; i++) {
    await prisma.table.create({
      data: {
        number: i,
        label: `Masa ${i}`,
        capacity: i <= 4 ? 2 : i <= 8 ? 4 : 6,
      },
    });
  }
  console.log('Masalar olusturuldu: 10');

  // Calisma saatleri
  const days = ['Pazartesi', 'Sali', 'Carsamba', 'Persembe', 'Cuma', 'Cumartesi', 'Pazar'];
  for (let i = 0; i < 7; i++) {
    await prisma.businessHours.create({
      data: {
        dayOfWeek: i,
        openTime: '09:00',
        closeTime: i < 5 ? '22:00' : '23:00',
        isClosed: false,
      },
    });
  }
  console.log('Calisma saatleri olusturuldu');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
