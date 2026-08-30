/**
 * Telegram Bot API wrapper.
 * Uses native fetch — no external library needed.
 * Server-side only — never import in client components.
 */

import { getEnv } from './config';

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

interface TelegramResponse<T = unknown> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

/**
 * Make a Telegram Bot API request.
 */
async function telegramRequest<T = unknown>(
  method: string,
  params: Record<string, unknown> = {}
): Promise<TelegramResponse<T>> {
  const token = getEnv().TELEGRAM_BOT_TOKEN;
  const url = `${TELEGRAM_API_BASE}${token}/${method}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data: TelegramResponse<T> = await response.json();

  if (!data.ok) {
    console.error(`Telegram API error [${method}]:`, {
      error_code: data.error_code,
      description: data.description,
    });
  }

  return data;
}

// --- Public API ---

export interface SendMessageParams {
  [key: string]: unknown;
  chat_id: number | string;
  text: string;
  parse_mode?: 'HTML' | 'MarkdownV2';
  reply_markup?: unknown;
  disable_web_page_preview?: boolean;
}

export async function sendMessage(params: SendMessageParams) {
  return telegramRequest<{ message_id: number }>('sendMessage', params);
}

export interface EditMessageTextParams {
  [key: string]: unknown;
  chat_id: number | string;
  message_id: number;
  text: string;
  parse_mode?: 'HTML' | 'MarkdownV2';
  reply_markup?: unknown;
}

export async function editMessageText(params: EditMessageTextParams) {
  return telegramRequest('editMessageText', params);
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
  showAlert?: boolean
) {
  return telegramRequest('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
    show_alert: showAlert,
  });
}

export interface SendPhotoParams {
  [key: string]: unknown;
  chat_id: number | string;
  photo: string; // URL or file_id
  caption?: string;
  parse_mode?: 'HTML' | 'MarkdownV2';
  reply_markup?: unknown;
}

export async function sendPhoto(params: SendPhotoParams) {
  return telegramRequest<{ message_id: number }>('sendPhoto', params);
}

/**
 * Set the persistent reply keyboard for a chat.
 */
export function buildReplyKeyboard(buttons: string[][]): unknown {
  return {
    keyboard: buttons.map((row) => row.map((text) => ({ text }))),
    resize_keyboard: true,
    is_persistent: true,
  };
}

/**
 * Build an inline keyboard from button rows.
 */
export function buildInlineKeyboard(
  rows: { text: string; callback_data: string }[][]
): unknown {
  return {
    inline_keyboard: rows,
  };
}

/**
 * Set bot commands visible in the Telegram menu.
 */
export async function setMyCommands() {
  return telegramRequest('setMyCommands', {
    commands: [
      { command: 'start', description: 'Bắt đầu và xem menu' },
      { command: 'menu', description: 'Mở menu chính' },
      { command: 'products', description: 'Xem danh sách sản phẩm' },
      { command: 'orders', description: 'Lịch sử đơn hàng' },
      { command: 'support', description: 'Hỗ trợ nhanh @percy004' },
      { command: 'warranty', description: 'Yêu cầu bảo hành' },
    ],
  });
}
