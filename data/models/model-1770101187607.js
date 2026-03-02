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
    model: "kimi-k2.5",
    messages: formattedMessages,
    stream: true
  };

  // Make request
  const response = await fetch("https://ark.cn-beijing.volces.com/api/coding/v3/chat/completions", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': "Bearer 4b8d9d2f-0341-4743-8d35-2284db2e478b"
    },
    body: JSON.stringify(body)
  });

  return response;
}