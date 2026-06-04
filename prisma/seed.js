const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Clear DB
  await prisma.task.deleteMany({});
  await prisma.projectMember.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // Create Users
  const user1 = await prisma.user.create({
    data: {
      name: 'Aahaan Sharma',
      email: 'admin@example.com',
      password: passwordHash
    }
  });

  const user2 = await prisma.user.create({
    data: {
      name: 'Priya Patel',
      email: 'member@example.com',
      password: passwordHash
    }
  });

  const user3 = await prisma.user.create({
    data: {
      name: 'Rohan Sen',
      email: 'team@example.com',
      password: passwordHash
    }
  });

  // Create Project 1 (Aahaan is Admin)
  const project1 = await prisma.project.create({
    data: {
      name: 'Next-Gen Mobile App',
      description: 'Design and build our brand new mobile application featuring sleek transitions, real-time sync, and Offline-First capability.',
      creatorId: user1.id
    }
  });

  // Add members
  await prisma.projectMember.createMany({
    data: [
      { projectId: project1.id, userId: user1.id, role: 'ADMIN' },
      { projectId: project1.id, userId: user2.id, role: 'MEMBER' },
      { projectId: project1.id, userId: user3.id, role: 'MEMBER' }
    ]
  });

  // Create Tasks for Project 1
  const now = new Date();
  const pastDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago (overdue!)
  const futureDate1 = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000); // 4 days later
  const futureDate2 = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000); // 8 days later

  await prisma.task.create({
    data: {
      title: 'Design high-fidelity UI wireframes',
      description: 'Produce high fidelity mockups for home, dashboard, and login screens in light/dark mode.',
      dueDate: futureDate1,
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      projectId: project1.id,
      assignedToId: user2.id,
      creatorId: user1.id
    }
  });

  await prisma.task.create({
    data: {
      title: 'Configure JWT Authentication endpoints',
      description: 'Implement token validation, login, and registration APIs in the Node backend using bcryptjs.',
      dueDate: pastDate, // Overdue!
      priority: 'HIGH',
      status: 'TODO',
      projectId: project1.id,
      assignedToId: user3.id,
      creatorId: user1.id
    }
  });

  await prisma.task.create({
    data: {
      title: 'Draft API contracts and architectural plans',
      description: 'Write specifications for REST endpoints, schemas, and role hierarchies.',
      dueDate: pastDate, // Done, so NOT flagged as overdue
      priority: 'MEDIUM',
      status: 'DONE',
      projectId: project1.id,
      assignedToId: user1.id,
      creatorId: user1.id
    }
  });

  await prisma.task.create({
    data: {
      title: 'Integrate SVG workload charts in Dashboard',
      description: 'Construct custom responsive graphics to display user task counts and status breakdowns.',
      dueDate: futureDate2,
      priority: 'LOW',
      status: 'TODO',
      projectId: project1.id,
      assignedToId: null, // Unassigned
      creatorId: user1.id
    }
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
