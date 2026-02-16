/**
 * Conversation history management per Telegram chat.
 * - Keyed by chat_id
 * - 30-minute TTL per conversation
 * - Max 20 messages per conversation
 * - Persisted to disk so history survives server restarts
 */

const fs = require('fs');
const path = require('path');

const MAX_MESSAGES = 20;
const TTL_MS = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const STORE_PATH = path.join(__dirname, '..', '.conversations.json');

// Map<chatId, { messages: Array, lastAccess: number }>
let conversations = new Map();

/**
 * Load conversations from disk on startup
 */
function loadFromDisk() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf8');
      const data = JSON.parse(raw);
      const now = Date.now();
      for (const [chatId, entry] of Object.entries(data)) {
        // Only restore non-expired conversations
        if (now - entry.lastAccess < TTL_MS) {
          conversations.set(chatId, entry);
        }
      }
      console.log(`[Conversations] Restored ${conversations.size} conversation(s) from disk`);
    }
  } catch (err) {
    console.error('[Conversations] Failed to load from disk:', err.message);
  }
}

/**
 * Save conversations to disk
 */
function saveToDisk() {
  try {
    const obj = Object.fromEntries(conversations);
    fs.writeFileSync(STORE_PATH, JSON.stringify(obj), 'utf8');
  } catch (err) {
    console.error('[Conversations] Failed to save to disk:', err.message);
  }
}

/**
 * Get conversation history for a chat
 * @param {string} chatId - Telegram chat ID
 * @returns {Array} - Message history array
 */
function getHistory(chatId) {
  const entry = conversations.get(chatId);
  if (!entry) return [];

  // Check if expired
  if (Date.now() - entry.lastAccess > TTL_MS) {
    conversations.delete(chatId);
    saveToDisk();
    return [];
  }

  entry.lastAccess = Date.now();
  return entry.messages;
}

/**
 * Update conversation history for a chat
 * @param {string} chatId - Telegram chat ID
 * @param {Array} messages - New message history
 */
function updateHistory(chatId, messages) {
  // Trim to max messages (keep most recent)
  const trimmed = messages.slice(-MAX_MESSAGES);

  conversations.set(chatId, {
    messages: trimmed,
    lastAccess: Date.now(),
  });

  saveToDisk();
}

/**
 * Clear conversation history for a chat
 * @param {string} chatId - Telegram chat ID
 */
function clearHistory(chatId) {
  conversations.delete(chatId);
  saveToDisk();
}

/**
 * Clean up expired conversations
 */
function cleanupExpired() {
  const now = Date.now();
  let cleaned = false;
  for (const [chatId, entry] of conversations) {
    if (now - entry.lastAccess > TTL_MS) {
      conversations.delete(chatId);
      cleaned = true;
    }
  }
  if (cleaned) saveToDisk();
}

// Load existing conversations on startup
loadFromDisk();

// Start cleanup interval
setInterval(cleanupExpired, CLEANUP_INTERVAL_MS);

module.exports = {
  getHistory,
  updateHistory,
  clearHistory,
};
