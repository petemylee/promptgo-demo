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