const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const {
  Program,
  AnchorProvider,
  EventParser,
  BorshCoder,
  Wallet,
} = require('@coral-xyz/anchor');

const Cat = require('../models/Cat');

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

function eventToRow(event, meta = {}) {
  const catIndex = pick(event, 'cat_index', 'catIndex');
  return {
    cat_pda: event.cat.toBase58(),
    owner_wallet: event.owner.toBase58(),
    cat_index: catIndex != null ? catIndex.toString() : '0',
    name: event.name,
    gender: enumToString(event.gender),
    breed: event.breed,
    coat_color: pick(event, 'coat_color', 'coatColor'),
    coat_length: enumToString(pick(event, 'coat_length', 'coatLength')),
    eye_color: pick(event, 'eye_color', 'eyeColor'),
    ear_type: enumToString(pick(event, 'ear_type', 'earType')),
    body_size: enumToString(pick(event, 'body_size', 'bodySize')),
    description: event.description,
    image_url_1: pick(event, 'image_url_1', 'imageUrl1'),
    image_url_2: pick(event, 'image_url_2', 'imageUrl2'),
    tx_signature: meta.tx_signature ?? null,
    block_time: meta.block_time ?? null,
  };
}

function accountToRow(publicKey, account, catIndex) {
  return {
    cat_pda: publicKey.toBase58(),
    owner_wallet: account.owner.toBase58(),
    // The account doesn't store its own index — recover it from the order
    // returned by getProgramAccounts isn't reliable, so pass null when unknown.
    cat_index: catIndex != null ? String(catIndex) : '0',
    name: account.name,
    gender: enumToString(account.gender),
    breed: account.breed,
    coat_color: account.coatColor,
    coat_length: enumToString(account.coatLength),
    eye_color: account.eyeColor,
    ear_type: enumToString(account.earType),
    body_size: enumToString(account.bodySize),
    description: account.description,
    image_url_1: account.imageUrl1,
    image_url_2: account.imageUrl2,
    tx_signature: null,
    block_time: null,
  };
}

async function handleEvent(event, meta) {
  try {
    const row = eventToRow(event, meta);
    await Cat.upsert(row);
    console.log(`[indexer] upserted cat ${row.cat_pda} (owner=${row.owner_wallet})`);
  } catch (err) {
    console.error('[indexer] failed to upsert event:', err.message);
  }
}

async function backfillExistingCats(idl) {
  const p = program || buildProgram(idl);
  try {
    const accounts = await p.account.cat.all();
    if (accounts.length === 0) {
      console.log('[indexer] backfilled 0 cats');
      return;
    }
    const rows = accounts.map(({ publicKey, account }) => accountToRow(publicKey, account));
    for (const row of rows) {
      // upsert one-by-one so a single bad row doesn't abort the batch
      await Cat.upsert(row);
    }
    console.log(`[indexer] backfilled ${rows.length} cats`);
  } catch (err) {
    console.error('[indexer] backfill failed:', err.message);
  }
}

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
        if (evt.name !== 'CatCreated') continue;
        await handleEvent(evt.data, { tx_signature: signature, block_time: blockTime });
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
