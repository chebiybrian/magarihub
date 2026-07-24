// Sample data so the apps have something to show immediately.
// Run with: npm run db:seed
// All demo accounts share the password: password123
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  // Wipe existing data so the seed can run repeatedly without duplicates
  // (order matters: children before parents)
  await prisma.ad.deleteMany();
  await prisma.driverReview.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.reelView.deleteMany();
  await prisma.commentLike.deleteMany();
  await prisma.reelComment.deleteMany();
  await prisma.reelLike.deleteMany();
  await prisma.savedReel.deleteMany();
  await prisma.reel.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.part.deleteMany();
  await prisma.driverProfile.deleteMany();
  await prisma.insurancePolicy.deleteMany();
  await prisma.guide.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);

  // ---- Users ----
  const dealer = await prisma.user.create({ data: {
    name: 'Mombasa Road Motors', email: 'dealer@example.com', phone: '+254700111222',
    passwordHash, role: 'DEALER', county: 'Nairobi', verification: 'DEALER_VERIFIED',
    bio: 'Trusted importer of Japanese vehicles since 2012. Showroom along Mombasa Road.',
  }});
  const seller = await prisma.user.create({ data: {
    name: 'Wanjiku Kamau', email: 'seller@example.com', phone: '+254711333444',
    passwordHash, role: 'SELLER', county: 'Kiambu', verification: 'ID_VERIFIED',
  }});
  const driverUser = await prisma.user.create({ data: {
    name: 'Otieno Odhiambo', email: 'driver@example.com', phone: '+254722555666',
    passwordHash, role: 'DRIVER', county: 'Nairobi', verification: 'ID_VERIFIED',
    bio: 'Professional driver, clean record, long-distance experience.',
  }});
  await prisma.user.create({ data: {
    name: 'Brian Chebiy', email: 'buyer@example.com', phone: '+254733777888',
    passwordHash, role: 'BUYER', county: 'Uasin Gishu',
  }});
  const partsDealer = await prisma.user.create({ data: {
    name: 'Kirinyaga Road Auto Spares', email: 'parts@example.com', phone: '+254744999000',
    passwordHash, role: 'DEALER', county: 'Nairobi', verification: 'DEALER_VERIFIED',
  }});

  // ---- Listings (typical Kenyan market cars) ----
  const img = (id) => `https://picsum.photos/seed/car${id}/800/500`; // placeholder photos
  const listings = [
    { title: '2016 Toyota Vitz 1.3L — Fresh Import KDJ', make: 'Toyota', model: 'Vitz', year: 2016,
      priceKes: 950000, mileageKm: 78000, condition: 'FOREIGN_USED', engineCc: 1300, county: 'Mombasa',
      description: 'Just arrived at the port. Grade 4.5 auction sheet. Alloy rims, reverse camera.', sellerId: dealer.id },
    { title: '2015 Mazda Demio SkyActiv', make: 'Mazda', model: 'Demio', year: 2015,
      priceKes: 870000, mileageKm: 92000, condition: 'FOREIGN_USED', engineCc: 1300, county: 'Nairobi',
      description: 'Very fuel efficient — 20km/l on highway. Perfect first car.', sellerId: dealer.id },
    { title: '2014 Subaru Forester XT Turbo', make: 'Subaru', model: 'Forester', year: 2014,
      priceKes: 2350000, mileageKm: 110000, condition: 'LOCALLY_USED', engineCc: 2000, county: 'Nairobi',
      description: 'Well maintained, service records at DT Dobie available.', sellerId: seller.id },
    { title: '2017 Toyota Land Cruiser Prado TX', make: 'Toyota', model: 'Prado', year: 2017,
      priceKes: 6800000, mileageKm: 65000, condition: 'FOREIGN_USED', engineCc: 2800, county: 'Nairobi',
      fuelType: 'Diesel', description: 'Sunroof, leather interior, 7 seats. Ready logbook.', sellerId: dealer.id },
    { title: '2016 Nissan Note e-Power', make: 'Nissan', model: 'Note', year: 2016,
      priceKes: 1050000, mileageKm: 84000, condition: 'FOREIGN_USED', engineCc: 1200, county: 'Mombasa',
      fuelType: 'Hybrid', description: 'Hybrid — save on fuel. New tyres.', sellerId: dealer.id },
    { title: '2013 Honda Fit Hybrid', make: 'Honda', model: 'Fit', year: 2013,
      priceKes: 720000, mileageKm: 125000, condition: 'LOCALLY_USED', engineCc: 1300, county: 'Nakuru',
      fuelType: 'Hybrid', description: 'Lady-owned, accident free. Quick sale.', sellerId: seller.id },
  ];
  const created = [];
  for (let i = 0; i < listings.length; i++) {
    created.push(await prisma.listing.create({
      data: { ...listings[i], imagesJson: JSON.stringify([img(i * 2 + 1), img(i * 2 + 2)]) },
    }));
  }

  // ---- Reels (sample videos from Google's public test bucket) ----
  const vid = (name) => `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/${name}.mp4`;
  await prisma.reel.createMany({ data: [
    { videoUrl: vid('ForBiggerBlazes'), caption: 'Fresh import Vitz walk-around 🔥 DM for price', authorId: dealer.id, listingId: created[0].id, likes: 124, views: 2300 },
    { videoUrl: vid('ForBiggerEscapes'), caption: 'Prado TX 2017 — full tour, sunroof + leather', authorId: dealer.id, listingId: created[3].id, likes: 512, views: 8900 },
    { videoUrl: vid('ForBiggerFun'), caption: 'Forester XT cold start + engine sound', authorId: seller.id, listingId: created[2].id, likes: 89, views: 1200 },
    { videoUrl: vid('ForBiggerJoyrides'), caption: 'Why hybrids make sense with these fuel prices ⛽', authorId: dealer.id, likes: 230, views: 4100 },
  ]});

  // ---- Driver profile ----
  await prisma.driverProfile.create({ data: {
    userId: driverUser.id, licenseClasses: 'B,C1,D1', hasPsvBadge: true,
    yearsExperience: 8, dailyRateKes: 2500, county: 'Nairobi', rating: 4.7,
    about: '8 years experience: personal driver, school runs, long distance (Nairobi–Mombasa–Kisumu). Fluent English & Kiswahili.',
  }});

  // ---- Insurance policies (rates are typical market figures — verify before launch) ----
  const F = (arr) => JSON.stringify(arr);
  await prisma.insurancePolicy.createMany({ data: [
    { company: 'Jubilee Allianz', name: 'Motor Comprehensive', type: 'COMPREHENSIVE', annualRatePct: 4.0, minPremiumKes: 37500,
      featuresJson: F(['Accident damage & theft cover', 'Political violence & terrorism option', 'Free valuation', 'Windscreen cover KES 50,000']), website: 'https://jubileeinsurance.com' },
    { company: 'Britam', name: 'Motor Private Comprehensive', type: 'COMPREHENSIVE', annualRatePct: 4.5, minPremiumKes: 30000,
      featuresJson: F(['Courtesy car 10 days', 'Roadside rescue', 'No-claim discount up to 60%']), website: 'https://britam.com' },
    { company: 'APA Insurance', name: 'APA Comprehensive Motor', type: 'COMPREHENSIVE', annualRatePct: 3.5, minPremiumKes: 25000,
      featuresJson: F(['Emergency medical KES 100,000', 'Towing KES 50,000', 'Flexible payment plans']), website: 'https://apainsurance.org' },
    { company: 'CIC Insurance', name: 'CIC Easy Bima (Monthly)', type: 'COMPREHENSIVE', annualRatePct: 5.0, minPremiumKes: 24000,
      featuresJson: F(['Pay monthly via M-Pesa', 'No lump sum needed', 'Cover starts immediately']), website: 'https://cic.co.ke' },
    { company: 'Madison Insurance', name: 'Third Party Only', type: 'THIRD_PARTY', flatAnnualKes: 7500,
      featuresJson: F(['Legal minimum cover', 'Injury/death of third parties', 'Third-party property damage']), website: 'https://madison.co.ke' },
    { company: 'Directline Assurance', name: 'Third Party PSV/Private', type: 'THIRD_PARTY', flatAnnualKes: 8200,
      featuresJson: F(['Instant digital certificate', 'Pay via M-Pesa Paybill', 'Renew from your phone']), website: 'https://directline.co.ke' },
  ]});

  // ---- Guides & stats ----
  await prisma.guide.createMany({ data: [
    { title: 'Complete Guide: Buying a Used Car in Kenya (2026)', category: 'BUYING_GUIDE',
      summary: 'Every step from budgeting to driving off — inspection, logbook transfer, and avoiding common scams.',
      content: `## 1. Set your total budget\nRemember the sticker price is not the final cost. Add:\n- Insurance (3.5–5% of car value for comprehensive)\n- NTSA transfer fees\n- Mechanical inspection (KES 3,000–5,000)\n- Any immediate repairs\n\n## 2. Verify before you pay\n- Ask for the original logbook and confirm the seller's name matches their National ID\n- Do an NTSA search via the NTSA TIMS portal to confirm ownership and check for loans/charges on the vehicle\n- Insist on a physical inspection by YOUR mechanic, not the seller's\n\n## 3. Common scams to avoid\n- "The logbook is with my brother" — walk away\n- Prices far below market — usually stolen or accident-rebuilt cars\n- Never pay a deposit before seeing the car and logbook\n\n## 4. Transfer ownership on NTSA TIMS\nBoth buyer and seller log into TIMS. Seller initiates transfer, buyer accepts and pays the fee. Processing takes a few days. Do not drive on a "pending" transfer for long — insurance claims can be rejected.`,
    },
    { title: 'Importing a Car Through Mombasa Port: Costs & the 8-Year Rule', category: 'IMPORT',
      summary: 'What KRA charges, the age limit rule, and how to use a clearing agent.',
      content: `## The 8-year rule\nKenya only allows importation of vehicles less than 8 years old from the year of first registration. In 2026 that means 2019 or newer.\n\n## Taxes you will pay (roughly 45–70% of the car's value)\n- Import Duty: 25% or 35% of customs value\n- Excise Duty: 20–35% depending on engine size\n- VAT: 16%\n- Import Declaration Fee + Railway Development Levy\n\nKRA uses the Current Retail Selling Price (CRSP) schedule to calculate customs value, not your invoice.\n\n## Process\n1. Buy from a Japanese auction/exporter (get a JEVIC/QISJ inspection certificate — required)\n2. Ship to Mombasa (3–6 weeks)\n3. Hire a licensed clearing agent (KES 15,000–30,000)\n4. Pay duties, get number plates, register on NTSA TIMS`,
    },
    { title: 'NTSA TIMS: Transfer, Search & Duplicate Logbook', category: 'NTSA',
      summary: 'How to use the NTSA TIMS portal for the paperwork every car owner needs.',
      content: `## Creating a TIMS account\nRegister at tims.ntsa.go.ke with your National ID and KRA PIN. Dealers register with business documents.\n\n## Vehicle search (do this BEFORE buying)\nA vehicle search shows the registered owner and whether a bank or lender has an interest in the car. Costs a small fee, paid via M-Pesa.\n\n## Ownership transfer\n1. Seller initiates transfer on TIMS to the buyer's ID number\n2. Buyer logs in, accepts, pays transfer fee (based on engine capacity)\n3. New logbook is processed and collected/delivered\n\n## Lost logbook\nApply for a duplicate on TIMS with a police abstract. Beware of cars sold "with a lost logbook" — often a red flag.`,
    },
    { title: 'Car Insurance in Kenya Explained: Comprehensive vs Third Party', category: 'INSURANCE',
      summary: 'What each cover type actually pays for, and how premiums are calculated.',
      content: `## Third Party Only (the legal minimum)\nCovers injury/death of other people and damage to their property. Your own car is NOT covered. Flat rate, roughly KES 7,000–10,000/year for private cars.\n\n## Comprehensive\nCovers third parties PLUS your own car (accident, theft, fire). Priced as a percentage of your car's value — typically 3.5–5% per year, with minimum premiums around KES 25,000–37,500. Cars older than 12–15 years often can't get comprehensive cover.\n\n## Tips\n- A valuation is required at policy start — use the insurer's approved valuers\n- Declare your car's correct value: over-insuring wastes money, under-insuring reduces payouts\n- Check for excess amounts (what you pay out of pocket per claim)\n- Monthly-payment products (e.g. CIC Easy Bima) help with cash flow`,
    },
    { title: 'Kenya Car Market Statistics — Mid-2026 Snapshot', category: 'STATISTICS',
      summary: 'Most-sold models, average prices, and import trends. (Demo figures — replace with live data.)',
      content: `## Most listed models on MagariHub (demo data)\n1. Toyota Vitz — avg KES 920,000\n2. Mazda Demio — avg KES 850,000\n3. Toyota Fielder — avg KES 1,250,000\n4. Nissan Note — avg KES 980,000\n5. Subaru Forester — avg KES 2,400,000\n\n## Trends\n- Hybrids now ~30% of fresh imports as fuel prices stay high\n- Average foreign-used import price: KES 1.4M\n- Nairobi, Mombasa and Nakuru account for 70% of listings\n\n*Replace this article with live statistics from your own database once you have real traffic.*`,
    },
  ]});

  // ---- Parts (with manufacturer reference numbers) ----
  await prisma.part.createMany({ data: [
    { name: 'Oil Filter — Toyota', referenceNo: '90915-YZZE1', compatible: 'Toyota Vitz, Corolla, Fielder, Probox 2000–2018',
      priceKes: 850, condition: 'NEW', county: 'Nairobi', sellerId: partsDealer.id },
    { name: 'Front Brake Pads — Toyota/Subaru', referenceNo: '04465-42160', compatible: 'Toyota RAV4, Vanguard; check caliper type',
      priceKes: 4500, condition: 'NEW', county: 'Nairobi', sellerId: partsDealer.id },
    { name: 'Air Filter — Mazda Demio', referenceNo: 'PE07-13-3A0', compatible: 'Mazda Demio DJ 2014–2019 SkyActiv',
      priceKes: 1800, condition: 'NEW', county: 'Mombasa', sellerId: partsDealer.id },
    { name: 'Shock Absorber (Rear) — Nissan Note', referenceNo: 'E6210-3VA0A', compatible: 'Nissan Note E12 2012–2019',
      priceKes: 6500, condition: 'NEW', county: 'Nairobi', sellerId: partsDealer.id },
    { name: 'Headlight Assembly (LH) — Subaru Forester', referenceNo: '84001SG111', compatible: 'Subaru Forester SJ 2013–2016',
      priceKes: 18500, condition: 'USED_GENUINE', county: 'Nairobi', sellerId: partsDealer.id },
    { name: 'Timing/Drive Belt — Honda Fit', referenceNo: '31110-RB0-003', compatible: 'Honda Fit GE6/GP1 2008–2014',
      priceKes: 3200, condition: 'NEW', county: 'Kisumu', sellerId: partsDealer.id },
  ]});

  console.log('Seed complete ✔  Demo login: dealer@example.com / password123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
