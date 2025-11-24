
// 使用 WxPusher (http://wxpusher.zjiecode.com/docs/)
// 这是一个免费的微信消息推送服务，非常适合没有后端的独立开发者

const BASE_URL = 'https://wxpusher.zjiecode.com/api/send/message';

export const sendWeChatNotification = async (
  appToken: string,
  uids: string[],
  content: string
): Promise<boolean> => {
  if (!appToken || uids.length === 0) return false;

  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        appToken: appToken,
        content: content,
        summary: content.slice(0, 20) + '...', // 消息摘要
        contentType: 1, // 1表示文字
        uids: uids,
        url: '' // 可选：点击消息跳转的链接
      })
    });

    const data = await response.json();
    return data.code === 1000; // 1000 表示成功
  } catch (error) {
    console.error("Notification failed", error);
    return false;
  }
};
