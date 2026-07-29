/**
 * Comprehensive Walk-In Activity Test
 * Tests every status + sub-status combination against the LeadSquared API
 * to identify exactly which field values are accepted and which are rejected.
 */
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, 'config.env') });

const LSQ_HOST = 'https://api-in21.leadsquared.com';
const AK = process.env.LSQ_ACCESS_KEY;
const SK = process.env.LSQ_SECRET_KEY;

// Use the Brs Global School lead from the screenshot
const LEAD_ID = '84c47c3c-871e-11f1-bd10-0a70299d455d';

const now = new Date().toISOString().replace('T', ' ').split('.')[0];

async function createActivity(testName, fields) {
  const body = {
    RelatedProspectId: LEAD_ID,
    ActivityEvent: 232,
    ActivityNote: `AUTO-TEST: ${testName}`,
    ActivityDateTime: now,
    Fields: fields,
  };

  try {
    const res = await fetch(
      `${LSQ_HOST}/v2/ProspectActivity.svc/Create?accessKey=${AK}&secretKey=${SK}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );
    const json = await res.json();
    if (json.Status === 'Success') {
      return { pass: true, id: json.Message?.Id };
    } else {
      return { pass: false, error: json.ExceptionMessage || JSON.stringify(json) };
    }
  } catch (err) {
    return { pass: false, error: err.message };
  }
}

// ─── Test Definitions ────────────────────────────────────────────────────────

const tests = [];

// ── Base fields every activity gets ──
function base(typeOfWalkIn, walkInStatus) {
  return [
    { SchemaName: 'mx_Custom_2', Value: 'Walk-in Activity' },
    { SchemaName: 'mx_Custom_36', Value: typeOfWalkIn },
    { SchemaName: 'mx_Custom_1', Value: now },
    { SchemaName: 'mx_Custom_4', Value: walkInStatus },
    { SchemaName: 'mx_Custom_6', Value: now },           // follow-up date
    { SchemaName: 'ActivityEvent_Note', Value: 'Test note' },
  ];
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. REFUSED ENTRY - RE
// ══════════════════════════════════════════════════════════════════════════════

// Test with mx_Custom_10 (the field we switched to)
for (const reason of ['School Not Interested', 'Need prior appointment', 'Only till 10th STD']) {
  tests.push({
    name: `RE | mx_Custom_10 = "${reason}"`,
    fields: [...base('First Visit', 'Refused Entry - RE'), { SchemaName: 'mx_Custom_10', Value: reason }],
  });
}

// Also test with mx_Custom_5 (the field we were using before) to compare
for (const reason of ['Reason of No Entry', 'School Not Interested', 'Need Prior Appointment']) {
  tests.push({
    name: `RE | mx_Custom_5 = "${reason}"`,
    fields: [...base('First Visit', 'Refused Entry - RE'), { SchemaName: 'mx_Custom_5', Value: reason }],
  });
}

// Test RE with NO reason field at all
tests.push({
  name: `RE | no reason field`,
  fields: [...base('First Visit', 'Refused Entry - RE')],
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. FRONT DESK INTERACTION - FDI
// ══════════════════════════════════════════════════════════════════════════════

for (const statusFDI of ['Asking to sent proposal', 'Need prior appointment', 'Fixed meeting with PIC', 'Not Interested']) {
  const fields = [
    ...base('First Visit', 'Front Desk Interaction - FDI'),
    { SchemaName: 'mx_Custom_7', Value: statusFDI },
    { SchemaName: 'mx_Custom_35', Value: '200' },           // 12th strength
    { SchemaName: 'mx_Custom_33', Value: '50000' },          // school fees
    { SchemaName: 'mx_Custom_37', Value: 'CBSE' },           // board
  ];

  if (statusFDI === 'Asking to sent proposal') {
    fields.push({ SchemaName: 'mx_Custom_12', Value: 'Yes' }); // proposal sent
  }

  if (statusFDI === 'Fixed meeting with PIC') {
    fields.push(
      { SchemaName: 'mx_Custom_13', Value: 'Test PIC' },       // PIC name
      { SchemaName: 'mx_Custom_16', Value: 'Coordinator' },    // PIC designation
      { SchemaName: 'mx_Custom_15', Value: '9876543210' },     // PIC phone
      { SchemaName: 'mx_Custom_17', Value: now },               // PIC appointment
    );
  }

  tests.push({ name: `FDI | status="${statusFDI}"`, fields });
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. PIC INTERACTION - PCI
// ══════════════════════════════════════════════════════════════════════════════

for (const statusPCI of ['Asking to sent proposal', 'Appointment fixed with Principal', 'Appointment fixed for Seminar', 'Not Interested']) {
  const fields = [
    ...base('First Visit', 'PIC Interaction - PCI'),
    { SchemaName: 'mx_Custom_8', Value: statusPCI },
  ];

  if (statusPCI === 'Asking to sent proposal') {
    fields.push({ SchemaName: 'mx_Custom_25', Value: 'Yes' });
  }
  if (statusPCI === 'Appointment fixed with Principal') {
    fields.push({ SchemaName: 'mx_Custom_27', Value: now });
  }
  if (statusPCI === 'Appointment fixed for Seminar') {
    fields.push({ SchemaName: 'mx_Custom_18', Value: now });
  }

  tests.push({ name: `PCI | status="${statusPCI}"`, fields });
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. PRINCIPAL INTERACTION - PI
// ══════════════════════════════════════════════════════════════════════════════

for (const statusPI of ['Asking to sent proposal', 'Appointment fixed for Seminar', 'Not Interested']) {
  const fields = [
    ...base('First Visit', 'Principal Interaction - PI'),
    { SchemaName: 'mx_Custom_9', Value: statusPI },
    { SchemaName: 'mx_Custom_21', Value: 'Test Principal' },
    { SchemaName: 'mx_Custom_23', Value: '9876543210' },
  ];

  if (statusPI === 'Asking to sent proposal') {
    fields.push({ SchemaName: 'mx_Custom_26', Value: 'Yes' });
  }
  if (statusPI === 'Appointment fixed for Seminar') {
    fields.push({ SchemaName: 'mx_Custom_18', Value: now });
  }

  tests.push({ name: `PI | status="${statusPI}"`, fields });
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. Type of Walk-In variations
// ══════════════════════════════════════════════════════════════════════════════

for (const type of ['First Visit', 'Follow-Up Visit', 'Seminar Visit', 'Follow-up Visit']) {
  tests.push({
    name: `Type="${type}" (minimal)`,
    fields: [
      { SchemaName: 'mx_Custom_2', Value: 'Walk-in Activity' },
      { SchemaName: 'mx_Custom_36', Value: type },
      { SchemaName: 'mx_Custom_1', Value: now },
      { SchemaName: 'mx_Custom_4', Value: 'Refused Entry - RE' },
    ],
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// RUN ALL TESTS
// ══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`\n🧪 Running ${tests.length} tests against lead ${LEAD_ID}\n`);
  console.log('─'.repeat(100));

  const results = [];

  for (let i = 0; i < tests.length; i++) {
    const t = tests[i];
    const result = await createActivity(t.name, t.fields);
    results.push({ ...t, ...result });

    const icon = result.pass ? '✅' : '❌';
    const detail = result.pass ? `id: ${result.id}` : result.error;
    console.log(`${icon} [${String(i + 1).padStart(2)}/${tests.length}] ${t.name}`);
    if (!result.pass) console.log(`        ↳ ${detail}`);
  }

  // ── Summary ──
  const passed = results.filter(r => r.pass);
  const failed = results.filter(r => !r.pass);

  console.log('\n' + '═'.repeat(100));
  console.log(`\n📊 RESULTS: ${passed.length} passed, ${failed.length} failed out of ${tests.length}\n`);

  if (failed.length > 0) {
    console.log('❌ FAILED TESTS:');
    for (const f of failed) {
      console.log(`   • ${f.name}`);
      console.log(`     Error: ${f.error}`);
      console.log(`     Fields: ${JSON.stringify(f.fields.map(x => `${x.SchemaName}=${x.Value}`))}`);
      console.log();
    }
  }

  if (passed.length > 0) {
    console.log('✅ PASSED TESTS:');
    for (const p of passed) {
      console.log(`   • ${p.name} → ${p.id}`);
    }
  }
}

main().catch(console.error);
