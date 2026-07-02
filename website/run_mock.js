import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, writeBatch } from "firebase/firestore";
import { format } from "date-fns";

const firebaseConfig = {
  apiKey: "AIzaSyADMJ5b1P0x3XnocjcstqiPGlZI0ydtXCc",
  authDomain: "kalvium-outreach-53f54.firebaseapp.com",
  projectId: "kalvium-outreach-53f54",
  storageBucket: "kalvium-outreach-53f54.firebasestorage.app",
  messagingSenderId: "656712790429",
  appId: "1:656712790429:web:9c06fb7586242a34413f74"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const usersSnap = await getDocs(collection(db, "users"));
  let execId = null;
  usersSnap.forEach(doc => {
    if (doc.data().role === "executive") execId = doc.id;
  });

  if (!execId) {
    console.log("No executive found");
    return;
  }

  // Use today's date
  const today = new Date();
  const dateStr = format(today, 'yyyyMMdd');
  const docId = `${execId}_${dateStr}`;
  
  // Set SOD (9:00 AM) and EOD (6:00 PM)
  const sodTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0, 0).getTime();
  const eodTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 0, 0).getTime();

  // Create Parent Track
  await setDoc(doc(db, "dailyTracks", docId), {
    userId: execId,
    date: dateStr,
    startTime: sodTime,
    endTime: eodTime,
    status: 'ended',
    lastPing: eodTime
  }, { merge: true });

  console.log(`Created dailyTrack: ${docId}`);

  // Generate Locations (1 ping every 10 minutes)
  const batch = writeBatch(db);
  const locationsRef = collection(db, `dailyTracks/${docId}/locations`);
  
  let lat = 12.9716;
  let lng = 77.5946;
  let currentTime = sodTime;

  let pingCount = 0;
  while (currentTime <= eodTime) {
    const ts = currentTime;
    const point = {
      lat,
      lng,
      accuracy: 10,
      ts: ts,
      speed: Math.random() * 15
    };
    
    batch.set(doc(locationsRef, ts.toString()), point);
    pingCount++;

    // Move in a somewhat continuous path
    lat += (Math.random() - 0.3) * 0.005;
    lng += (Math.random() - 0.3) * 0.005;
    
    // Add 10 minutes
    currentTime += 10 * 60 * 1000; 
  }

  await batch.commit();
  console.log(`Generated ${pingCount} location pings (SOD to EOD).`);

  // Generate 3 mock visits
  const visitsBatch = writeBatch(db);
  const visitsRef = collection(db, `visits`); // Main visits collection

  const visitTimes = [
    sodTime + (2 * 3600 * 1000), // 11 AM
    sodTime + (4 * 3600 * 1000), // 1 PM
    sodTime + (6 * 3600 * 1000)  // 3 PM
  ];

  const schools = ["Delhi Public School", "National Public School", "Bishop Cottons"];

  for (let i = 0; i < 3; i++) {
    const vId = `mock_visit_${i}`;
    visitsBatch.set(doc(visitsRef, vId), {
      executiveId: execId,
      schoolId: `school_${i}`,
      schoolName: schools[i],
      type: 'school',
      timestamp: visitTimes[i],
      checkInLat: 12.9716 + (Math.random() * 0.02),
      checkInLng: 77.5946 + (Math.random() * 0.02),
      durationMinutes: 45
    });
  }

  await visitsBatch.commit();
  console.log(`Generated 3 mock visits.`);

  console.log("✅ Full SOD to EOD mock data successfully injected into the new architecture.");
  process.exit(0);
}

run().catch(console.error);
