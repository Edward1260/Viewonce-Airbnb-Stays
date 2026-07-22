import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

async function createTestUsers() {
    // Create a simple data source
    const dataSource = new DataSource({
        type: 'sqlite',
        database: 'db.sqlite',
        entities: [__dirname + '/entities/*.entity{.ts,.js}'],
        synchronize: true,
    });

    await dataSource.initialize();
    console.log('Connected to database');

    // Hash passwords
    const saltRounds = 10;
    const adminPassword = await bcrypt.hash('admin123', saltRounds);
    const hostPassword = await bcrypt.hash('host123', saltRounds);
    const customerPassword = await bcrypt.hash('customer123', saltRounds);
    const supportPassword = await bcrypt.hash('support123', saltRounds);

    // Create users
    const users = [
        {
            id: '00000000-0000-0000-0000-000000000001',
            email: 'admin@test.com',
            password: adminPassword,
            firstName: 'Admin',
            lastName: 'User',
            phone: '1111111111',
            role: 'admin',
            status: 'active',
        },
        {
            id: '00000000-0000-0000-0000-000000000002',
            email: 'host@test.com',
            password: hostPassword,
            firstName: 'Host',
            lastName: 'User',
            phone: '2222222222',
            role: 'host',
            status: 'active',
        },
        {
            id: '00000000-0000-0000-0000-000000000003',
            email: 'customer@test.com',
            password: customerPassword,
            firstName: 'Customer',
            lastName: 'User',
            phone: '3333333333',
            role: 'customer',
            status: 'active',
        },
        {
            id: '00000000-0000-0000-0000-000000000004',
            email: 'support@test.com',
            password: supportPassword,
            firstName: 'Support',
            lastName: 'User',
            phone: '4444444444',
            role: 'support',
            status: 'active',
        },
    ];

    for (const user of users) {
        try {
            // Try to insert directly using raw SQL to avoid entity issues
            await dataSource.query(
                `INSERT OR REPLACE INTO users (id, email, password, firstName, lastName, phone, role, status, "createdAt", "updatedAt") 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
                [user.id, user.email, user.password, user.firstName, user.lastName, user.phone, user.role, user.status]
            );
            console.log(`✅ Created user: ${user.email} (${user.role})`);
        } catch (error) {
            console.log(`❌ Error creating user ${user.email}:`, error.message);
        }
    }

    console.log('\n✅ All test users created!');
    console.log('\nTest accounts:');
    console.log('  Admin: admin@test.com / admin123');
    console.log('  Host: host@test.com / host123');
    console.log('  Customer: customer@test.com / customer123');
    console.log('  Support: support@test.com / support123');

    await dataSource.destroy();
}

createTestUsers().catch(console.error);
