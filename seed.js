// Run: node seed.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Listing = require('./models/Listing');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nikunj';

const seedUsers = [
  { name: 'Admin User', email: 'admin@nikunj.in', password: 'Admin@123', role: 'admin', phone: '+91 98765 00001' },
  { name: 'Ramesh Sharma', email: 'ramesh@owner.com', password: 'Pass@123', role: 'owner', phone: '+91 98765 43210' },
  { name: 'Sunita Meena', email: 'sunita@owner.com', password: 'Pass@123', role: 'owner', phone: '+91 87654 32109' },
  { name: 'Test Student', email: 'student@nikunj.in', password: 'Pass@123', role: 'student', phone: '+91 99999 11111', college: 'RTU Jaipur' }
];

const seedListings = [
  {
    title: 'Sunrise Boys Hostel',
    type: 'hostel',
    description: 'A comfortable hostel for boys near RTU. Clean rooms, great food, strong WiFi, and 24/7 security. Perfect for engineering students.',
    owner: { name: 'Ramesh Sharma', phone: '+91 98765 43210', whatsapp: '+91 98765 43210' },
    location: { address: 'Plot 12, Sector 7, Malviya Nagar', area: 'Malviya Nagar', city: 'Jaipur', pincode: '302017', lat: 26.852, lng: 75.804, nearbyColleges: ['RTU', 'Manipal University'] },
    pricing: { amount: 4500, deposit: 5000, negotiable: true },
    facilities: ['WiFi', 'Meals Included', 'AC', 'Security', 'Laundry', 'Hot Water', 'Parking'],
    gender: 'male', status: 'approved', featured: true, views: 284
  },
  {
    title: 'Shanti Girls PG',
    type: 'room',
    description: 'Safe, comfortable PG for girls near Manipal University. CCTV, biometric entry, home-cooked meals included.',
    owner: { name: 'Sunita Meena', phone: '+91 87654 32109', whatsapp: '+91 87654 32109' },
    location: { address: '14-B, Bapu Nagar', area: 'Bapu Nagar', city: 'Jaipur', pincode: '302015', lat: 26.891, lng: 75.812, nearbyColleges: ['Manipal University', 'JECRC'] },
    pricing: { amount: 5200, deposit: 6000, negotiable: false },
    facilities: ['WiFi', 'Meals Included', 'CCTV', 'Laundry', 'AC', 'Geyser', 'Biometric Entry'],
    gender: 'female', status: 'approved', featured: true, views: 412
  },
  {
    title: '2BHK Furnished Flat — Kota Road',
    type: 'flat',
    description: 'Fully furnished 2BHK flat near RTU campus. Ideal for groups of 2-3 students. Gated society with 24/7 security.',
    owner: { name: 'Anil Gupta', phone: '+91 76543 21098', whatsapp: '+91 76543 21098' },
    location: { address: 'C-45, Krishna Vihar, Kota Road', area: 'Kota Road', city: 'Jaipur', lat: 26.865, lng: 75.823, nearbyColleges: ['RTU'] },
    pricing: { amount: 8000, deposit: 10000, negotiable: true },
    facilities: ['WiFi', 'Furnished', 'Parking', 'Gated Society', 'Water Backup', 'Inverter'],
    gender: 'any', status: 'approved', views: 156
  },
  {
    title: 'Maa Ki Rasoi — Daily Tiffin',
    type: 'tiffin',
    description: 'Homemade daily tiffin service delivering across Jaipur. Healthy, fresh, veg meals just like home.',
    owner: { name: 'Savitri Devi', phone: '+91 65432 10987', whatsapp: '+91 65432 10987' },
    location: { address: 'Near Ganesh Temple, Mansarovar', area: 'Mansarovar', city: 'Jaipur', lat: 26.858, lng: 75.758, nearbyColleges: ['RTU', 'IIS University'] },
    pricing: { amount: 2200, deposit: 0, negotiable: false },
    facilities: ['Veg Only', 'Home Cooked', 'Lunch + Dinner', 'Monthly Plan', 'Free Delivery'],
    gender: 'any', status: 'approved', featured: true, views: 632
  },
  {
    title: 'Royal Boys Hostel',
    type: 'hostel',
    description: 'Premium hostel for boys near MNIT Jaipur. Gym, study room, fast WiFi.',
    owner: { name: 'Suresh Yadav', phone: '+91 54321 09876', whatsapp: '+91 54321 09876' },
    location: { address: 'Plot 8, Tonk Road', area: 'Tonk Road', city: 'Jaipur', lat: 26.841, lng: 75.814, nearbyColleges: ['MNIT', 'Poornima University'] },
    pricing: { amount: 6000, deposit: 8000, negotiable: false },
    facilities: ['WiFi', 'Gym', 'Study Room', 'Meals Included', 'Security', 'CCTV', 'AC'],
    gender: 'male', status: 'approved', views: 198
  },
  {
    title: 'Green Valley Girls Hostel',
    type: 'hostel',
    description: 'Budget-friendly girls hostel in Vaishali Nagar. Clean rooms, good food, safe environment.',
    owner: { name: 'Kavita Sharma', phone: '+91 43210 98765', whatsapp: '+91 43210 98765' },
    location: { address: 'B-12, Vaishali Nagar', area: 'Vaishali Nagar', city: 'Jaipur', lat: 26.905, lng: 75.736, nearbyColleges: ['LNMIIT', 'Amity University'] },
    pricing: { amount: 3800, deposit: 4000, negotiable: true },
    facilities: ['WiFi', 'Meals Included', 'Geyser', 'Laundry', 'Security'],
    gender: 'female', status: 'approved', views: 127
  },
  {
    title: 'Annapurna Tiffin Service',
    type: 'tiffin',
    description: 'Nutritious daily tiffin delivering in C-Scheme. Wholesome balanced meals for students.',
    owner: { name: 'Deepak Mittal', phone: '+91 32109 87654', whatsapp: '+91 32109 87654' },
    location: { address: 'Near GPO, C-Scheme', area: 'C-Scheme', city: 'Jaipur', lat: 26.917, lng: 75.801, nearbyColleges: ['University of Rajasthan'] },
    pricing: { amount: 1800, deposit: 0, negotiable: false },
    facilities: ['Veg & Non-Veg', 'Lunch Only', 'Monthly Plan', 'Free Delivery'],
    gender: 'any', status: 'approved', views: 245
  },
  {
    title: 'Pending Review Hostel',
    type: 'hostel',
    description: 'A new hostel submitted for review.',
    owner: { name: 'New Owner', phone: '+91 11111 22222', whatsapp: '+91 11111 22222' },
    location: { address: 'New Area', area: 'Jagatpura', city: 'Jaipur', lat: 26.795, lng: 75.856 },
    pricing: { amount: 4000, deposit: 4000 },
    facilities: ['WiFi', 'Security'],
    gender: 'male', status: 'pending', views: 0
  }
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');
  await User.deleteMany({});
  await Listing.deleteMany({});
  const users = await User.insertMany(seedUsers);
  console.log('✅ Users seeded:', users.length);
  const ownerUser = users.find(u => u.role === 'owner');
  const listingsWithOwner = seedListings.map((l, i) => ({
    ...l,
    owner: { ...l.owner, user: ownerUser._id },
    avgRating: [4.7, 4.9, 4.6, 4.8, 4.5, 4.3, 4.4, 0][i] || 0,
    totalReviews: [38, 54, 22, 91, 29, 18, 33, 0][i] || 0
  }));
  const listings = await Listing.insertMany(listingsWithOwner);
  console.log('✅ Listings seeded:', listings.length);
  console.log('\n🔑 Login credentials:');
  console.log('Admin:   admin@nikunj.in / Admin@123');
  console.log('Owner:   ramesh@owner.com / Pass@123');
  console.log('Student: student@nikunj.in / Pass@123');
  await mongoose.disconnect();
  console.log('\n✅ Database seeded successfully!');
}

seed().catch(console.error);
