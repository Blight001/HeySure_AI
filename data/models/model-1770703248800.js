/**
 * Custom Request Handler
 * @param {object} params - { messages }
 * @param {object} context - { fetch }
 * @returns {Promise<Response>}
 */
async function request(params, context) {
  const { messages } = params;
  const { fetch } = context;

  // Build messages array
  const formattedMessages = messages.map(m => ({
    role: m.role,
    content: m.content
  }));

  // Create request body
  const body = {
    model: "qwen-flash",
    messages: formattedMessages,
    stream: true
  };

  // Make request
  const response = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': "Bearer sk-cf3e8d2a060d47ad983c089c1ae47e29"
    },
    body: JSON.stringify(body)
  });

  return response;
}