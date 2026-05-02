const { Connection, PublicKey } = require('@solana/web3.js');
const { EventParser, BorshCoder } = require('@coral-xyz/anchor');

const RECONNECT_DELAY_MS = 5000;

let subscriptionId = null;
let connection = null;

function createConnection() {
  return new Connection(process.env.SOLANA_WS_URL, {
    commitment: 'confirmed',
    wsEndpoint: process.env.SOLANA_WS_URL,
  });
}

async function handleEvent(event) {
  console.log('Received event:', event.name, event.data);
  // TODO: persist event to DB
}

function subscribe(idl) {
  const programId = new PublicKey(process.env.PROGRAM_ID);
  const parser = new EventParser(programId, new BorshCoder(idl));

  connection = createConnection();

  subscriptionId = connection.onLogs(
    programId,
    async ({ logs, err, signature }) => {
      if (err) return;

      const events = [...parser.parseLogs(logs)];
      for (const event of events) {
        await handleEvent(event);
      }
    },
    'confirmed'
  );

  console.log(`Listening to program ${process.env.PROGRAM_ID}`);
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
    console.warn('WebSocket closed, reconnecting in', RECONNECT_DELAY_MS, 'ms...');
    unsubscribe();
    setTimeout(() => startWithReconnect(idl), RECONNECT_DELAY_MS);
  });
}

module.exports = { startWithReconnect, unsubscribe };
