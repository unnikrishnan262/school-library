import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@school.edu" },
    update: {},
    create: {
      email: "admin@school.edu",
      password: hashedPassword,
      name: "Admin User",
      role: "ADMIN",
      isActive: true,
    },
  });
  console.log(`Created admin: ${admin.email}`);

  // Create librarian user
  const librarianPassword = await bcrypt.hash("librarian123", 12);
  const librarian = await prisma.user.upsert({
    where: { email: "librarian@school.edu" },
    update: {},
    create: {
      email: "librarian@school.edu",
      password: librarianPassword,
      name: "Librarian User",
      role: "LIBRARIAN",
      isActive: true,
    },
  });
  console.log(`Created librarian: ${librarian.email}`);

  // Create default academic year
  const currentYear = new Date().getFullYear();
  const academicYear = await prisma.academicYear.upsert({
    where: { year: `${currentYear}-${currentYear + 1}` },
    update: {},
    create: {
      year: `${currentYear}-${currentYear + 1}`,
      startDate: new Date(`${currentYear}-06-01`),
      endDate: new Date(`${currentYear + 1}-04-30`),
      isActive: true,
    },
  });
  console.log(`Created academic year: ${academicYear.year}`);

  // Create default categories
  const categories = [
    { name: "Fiction", description: "Novels and story books" },
    { name: "Non-Fiction", description: "Educational and informational books" },
    { name: "Science", description: "Science textbooks and references" },
    { name: "Mathematics", description: "Math textbooks and guides" },
    { name: "History", description: "History books and references" },
    { name: "Language", description: "Language and literature books" },
    { name: "Computer Science", description: "Computer and technology books" },
    { name: "Magazine", description: "Periodicals and magazines" },
    { name: "Reference", description: "Dictionaries, encyclopedias, etc." },
    { name: "General", description: "General category" },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }
  console.log(`Created ${categories.length} categories`);

  // Create default settings
  const settings = [
    { key: "fine_per_day", value: "1", description: "Fine amount per day (₹)" },
    { key: "grace_period_days", value: "0", description: "Grace period before fine starts (days)" },
    { key: "max_fine_per_book", value: "100", description: "Maximum fine per book (₹)" },
    { key: "max_borrow_days_student", value: "14", description: "Maximum borrow duration for students (days)" },
    { key: "max_borrow_days_teacher", value: "30", description: "Maximum borrow duration for teachers (days)" },
    { key: "max_books_student", value: "3", description: "Maximum books a student can borrow" },
    { key: "max_books_teacher", value: "5", description: "Maximum books a teacher can borrow" },
    { key: "max_renewals", value: "2", description: "Maximum number of renewals per book" },
    { key: "reservation_expiry_days", value: "3", description: "Days before reservation expires" },
    { key: "school_name", value: "School Library", description: "School name for reports" },
  ];

  for (const setting of settings) {
    await prisma.settings.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log(`Created ${settings.length} settings`);

  console.log("Database seeded successfully!");
  console.log("\nDefault credentials:");
  console.log("  Admin: admin@school.edu / admin123");
  console.log("  Librarian: librarian@school.edu / librarian123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
