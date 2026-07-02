const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyADMJ5b1P0x3XnocjcstqiPGlZI0ydtXCc",
  authDomain: "kalvium-outreach-53f54.firebaseapp.com",
  projectId: "kalvium-outreach-53f54"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const seedUsers = async () => {
  const users = [
    {
      email: 'donald.colin@kalvium.com',
      password: 'Donald1#',
      profile: {
        name: 'Donald Colin',
        email: 'donald.colin@kalvium.com',
        phone: '+919999999999',
        role: 'admin',
        employeeId: 'EMP-ADMIN-01',
        regionId: 'ALL',
        active: true
      }
    },
    {
      email: 'shashank@kalvium.com',
      password: 'shanks',
      profile: {
        name: 'Shashank (BDM)',
        email: 'shashank@kalvium.com',
        phone: '+918888888888',
        role: 'teamLead',
        employeeId: 'EMP-BDM-01',
        regionId: 'south-1',
        active: true
      }
    }
  ];

  for (const user of users) {
    try {
      console.log(`Creating user ${user.email}...`);
      const cred = await createUserWithEmailAndPassword(auth, user.email, user.password);
      console.log(`Created Auth: ${cred.user.uid}. Creating Firestore document...`);
      
      await setDoc(doc(db, 'users', cred.user.uid), {
        ...user.profile,
        id: cred.user.uid
      });
      console.log(`Successfully seeded ${user.email}\n`);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        console.log(`User ${user.email} already exists.`);
      } else {
        console.error(`Error creating ${user.email}:`, err.message);
      }
    }
  }
  process.exit(0);
};

seedUsers();
