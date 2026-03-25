// src/lib/line.ts
import * as line from '@line/bot-sdk';

const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
const channelSecret = process.env.LINE_CHANNEL_SECRET || '';

// สร้าง Client (ใช้เมื่อมี token แล้วเท่านั้น)
const lineConfig = {
  channelAccessToken,
  channelSecret,
};
const client = channelAccessToken ? new line.Client(lineConfig) : null;

/**
 * ส่งข้อความ LINE แบบ Push Message ไปยังผู้ใช้คนเดียว
 * @returns true ถ้าส่งสำเร็จ, false ถ้าข้ามหรือผิดพลาด (ไม่ throw)
 */
export const sendLineMessage = async (userId: string, message: string): Promise<boolean> => {
  if (!userId) {
    console.warn('⚠️ No User ID provided for LINE message.');
    return false;
  }
  if (!channelAccessToken || !client) {
    console.warn('⚠️ LINE_CHANNEL_ACCESS_TOKEN is not set. Skip sending LINE message.');
    return false;
  }

  try {
    await client.pushMessage(userId, {
      type: 'text',
      text: message,
    });
    console.log('✅ LINE message sent to:', userId);
    return true;
  } catch (error) {
    console.error('❌ Error sending LINE message:', error);
    return false;
  }
};

const MAX_REPLY_MESSAGES = 5;

/**
 * ตอบกลับด้วยข้อความหลายบล็อก (reply ได้สูงสุด 5 ข้อความต่อครั้ง — ส่วนที่เกินใช้ push)
 */
export async function replyLineTextChain(
  replyToken: string,
  lineUserId: string,
  texts: string[]
): Promise<boolean> {
  if (!texts.length) return true;
  if (!client || !channelAccessToken) {
    console.warn('⚠️ LINE client not configured.');
    return false;
  }
  const toTextMessages = (chunk: string[]) =>
    chunk.map((text) => ({ type: 'text' as const, text }));

  try {
    const first = texts.slice(0, MAX_REPLY_MESSAGES);
    await client.replyMessage(replyToken, toTextMessages(first));
    let offset = MAX_REPLY_MESSAGES;
    while (offset < texts.length) {
      const batch = texts.slice(offset, offset + MAX_REPLY_MESSAGES);
      await client.pushMessage(lineUserId, toTextMessages(batch));
      offset += MAX_REPLY_MESSAGES;
    }
    return true;
  } catch (error) {
    console.error('❌ Error replyLineTextChain:', error);
    return false;
  }
}