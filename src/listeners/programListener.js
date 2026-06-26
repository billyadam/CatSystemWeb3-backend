const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const {
  Program,
  AnchorProvider,
  EventParser,
  BorshCoder,
  Wallet,
} = require('@coral-xyz/anchor');

const db = require('../database/knex');

const RECONNECT_DELAY_MS = 5000;

let subscriptionId = null;
let connection = null;
let program = null;

function createConnection() {
  return new Connection(process.env.SOLANA_RPC_URL, {
    commitment: 'confirmed',
    wsEndpoint: process.env.SOLANA_WS_URL,
  });
}

function buildProgram(idl) {
  const conn = new Connection(process.env.SOLANA_RPC_URL, 'confirmed');
  const provider = new AnchorProvider(conn, new Wallet(Keypair.generate()), {
    commitment: 'confirmed',
  });
  return new Program(idl, provider);
}

// Anchor enums round-trip as `{ female: {} }`. Convert to capitalized strings for the DB.
function enumToString(val) {
  if (!val || typeof val !== 'object') return null;
  const key = Object.keys(val)[0];
  return key ? key.charAt(0).toUpperCase() + key.slice(1) : null;
}

// Anchor's EventParser preserves snake_case from the IDL; the account-fetch
// path camelCases. Read both to stay resilient across versions.
function pick(obj, snake, camel) {
  const v = obj[snake];
  return v !== undefined ? v : obj[camel];
}

/* ──────────────────────────────────────────────────────────────
   CatCreated event → cats + bio_profiles rows
────────────────────────────────────────────────────────────── */
function eventToCatRow(event, meta = {}) {
  const catIndex = pick(event, 'cat_index', 'catIndex');
  const dob = pick(event, 'date_of_birth', 'dateOfBirth');
  return {
    cat_pda: event.cat.toBase58(),
    owner_wallet: event.owner.toBase58(),
    cat_index: catIndex != null ? catIndex.toString() : '0',
    name: event.name,
    gender: enumToString(event.gender),
    date_of_birth: dob != null ? dob.toString() : null,
    tx_signature: meta.tx_signature ?? null,
    block_time: meta.block_time ?? null,
  };
}

function eventToBioRow(event) {
  const bio = pick(event, 'bio_profile', 'bioProfile') || {};
  return {
    cat_pda: event.cat.toBase58(),
    breed: pick(bio, 'breed', 'breed') || '',
    coat_color: pick(bio, 'coat_color', 'coatColor') || '',
    coat_length: enumToString(pick(bio, 'coat_length', 'coatLength')) || '',
    eye_color: pick(bio, 'eye_color', 'eyeColor') || '',
    ear_type: enumToString(pick(bio, 'ear_type', 'earType')) || '',
    body_size: enumToString(pick(bio, 'body_size', 'bodySize')) || '',
    personality_trait: pick(bio, 'personality_trait', 'personalityTrait') || '',
    description: bio.description || '',
  };
}

/* ──────────────────────────────────────────────────────────────
   CatImageAdded event → cat_images row
────────────────────────────────────────────────────────────── */
function eventToImageRow(event) {
  const imagePda = pick(event, 'image_pda', 'imagePda');
  return {
    cat_pda: event.cat.toBase58(),
    image_pda: imagePda.toBase58(),
    index: event.index,
    image_url: pick(event, 'image_url', 'imageUrl'),
    description: event.description || '',
  };
}

/* ──────────────────────────────────────────────────────────────
   Account-based row builders (for backfill)
────────────────────────────────────────────────────────────── */
function accountToCatRow(publicKey, account) {
  return {
    cat_pda: publicKey.toBase58(),
    owner_wallet: account.owner.toBase58(),
    cat_index: '0',
    name: account.name,
    gender: enumToString(account.gender),
    date_of_birth: account.dateOfBirth != null ? account.dateOfBirth.toString() : null,
    tx_signature: null,
    block_time: null,
  };
}

function accountToBioRow(publicKey, account) {
  const bio = account.bioProfile || {};
  return {
    cat_pda: publicKey.toBase58(),
    breed: bio.breed || '',
    coat_color: bio.coatColor || '',
    coat_length: enumToString(bio.coatLength) || '',
    eye_color: bio.eyeColor || '',
    ear_type: enumToString(bio.earType) || '',
    body_size: enumToString(bio.bodySize) || '',
    personality_trait: bio.personalityTrait || '',
    description: bio.description || '',
  };
}

function imageAccountToRow(publicKey, account) {
  return {
    cat_pda: account.cat.toBase58(),
    image_pda: publicKey.toBase58(),
    index: account.index,
    image_url: account.imageUrl,
    description: account.description || '',
  };
}

/* ──────────────────────────────────────────────────────────────
   Upsert helpers using Knex
────────────────────────────────────────────────────────────── */
async function upsertCat(row) {
  await db('cats')
    .insert(row)
    .onConflict('cat_pda')
    .merge();
}

async function upsertBioProfile(row) {
  await db('bio_profiles')
    .insert(row)
    .onConflict('cat_pda')
    .merge();
}

async function upsertCatImage(row) {
  await db('cat_images')
    .insert(row)
    .onConflict('image_pda')
    .merge();
}

/* ──────────────────────────────────────────────────────────────
   Event handlers
────────────────────────────────────────────────────────────── */
async function handleCatCreated(event, meta) {
  try {
    const catRow = eventToCatRow(event, meta);
    const bioRow = eventToBioRow(event);
    await upsertCat(catRow);
    await upsertBioProfile(bioRow);
    console.log(`[indexer] upserted cat ${catRow.cat_pda} (owner=${catRow.owner_wallet})`);
  } catch (err) {
    console.error('[indexer] failed to upsert CatCreated:', err.message);
  }
}

async function handleCatImageAdded(event) {
  try {
    const row = eventToImageRow(event);
    await upsertCatImage(row);
    console.log(`[indexer] upserted cat_image ${row.image_pda} for cat ${row.cat_pda}`);
  } catch (err) {
    console.error('[indexer] failed to upsert CatImageAdded:', err.message);
  }
}

/* ──────────────────────────────────────────────────────────────
   Backfill from on-chain accounts
────────────────────────────────────────────────────────────── */
async function backfillExistingCats(idl) {
  const p = program || buildProgram(idl);
  try {
    // Backfill Cat accounts
    const catAccounts = await p.account.cat.all();
    for (const { publicKey, account } of catAccounts) {
      await upsertCat(accountToCatRow(publicKey, account));
      await upsertBioProfile(accountToBioRow(publicKey, account));
    }
    console.log(`[indexer] backfilled ${catAccounts.length} cats`);

    // Backfill CatImage accounts
    const imageAccounts = await p.account.catImage.all();
    for (const { publicKey, account } of imageAccounts) {
      await upsertCatImage(imageAccountToRow(publicKey, account));
    }
    console.log(`[indexer] backfilled ${imageAccounts.length} cat images`);
  } catch (err) {
    console.error('[indexer] backfill failed:', err.message);
  }
}

/* ──────────────────────────────────────────────────────────────
   WebSocket subscription
────────────────────────────────────────────────────────────── */
function subscribe(idl) {
  const programId = new PublicKey(process.env.PROGRAM_ID);
  const parser = new EventParser(programId, new BorshCoder(idl));

  connection = createConnection();
  program = buildProgram(idl);

  subscriptionId = connection.onLogs(
    programId,
    async ({ logs, err, signature }) => {
      if (err) return;

      const events = [...parser.parseLogs(logs)];
      if (events.length === 0) return;

      let blockTime = null;
      try {
        blockTime = await connection.getBlockTime(
          (await connection.getSignatureStatuses([signature])).value[0]?.slot
        );
      } catch {
        // best-effort enrichment only
      }

      for (const evt of events) {
        if (evt.name === 'CatCreated') {
          await handleCatCreated(evt.data, { tx_signature: signature, block_time: blockTime });
        } else if (evt.name === 'CatImageAdded') {
          await handleCatImageAdded(evt.data);
        }
      }
    },
    'confirmed'
  );

  console.log(`[indexer] listening to program ${process.env.PROGRAM_ID}`);
}

function unsubscribe() {
  if (connection && subscriptionId !== null) {
    connection.removeOnLogsListener(subscriptionId);
    subscriptionId = null;
  }
}

function startWithReconnect(idl) {
  subscribe(idl);

  connection._rpcWebSocket.on('close', () => {
    console.warn('[indexer] WebSocket closed, reconnecting in', RECONNECT_DELAY_MS, 'ms...');
    unsubscribe();
    setTimeout(() => startWithReconnect(idl), RECONNECT_DELAY_MS);
  });
}

module.exports = { startWithReconnect, unsubscribe, backfillExistingCats };
